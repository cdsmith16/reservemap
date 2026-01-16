#!/usr/bin/env python3
"""
Chase Sapphire Restaurant Enrichment Script
Enriches restaurant data with Google Places API information.

Usage:
    python enrich_restaurants.py --api-key YOUR_GOOGLE_API_KEY

Requirements:
    pip install requests pandas tqdm

The script will:
1. Read chase_sapphire_restaurants_complete.csv
2. Look up each restaurant via Google Places API
3. Add: address, website, lat, lon, place_id, google_maps_url
4. Save to chase_sapphire_restaurants_enriched.csv
5. Also save a failed lookups file for manual review
"""

import argparse
import csv
import json
import os
import time
from datetime import datetime
from typing import Optional, Dict, Any

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system("pip install requests")
    import requests

try:
    from tqdm import tqdm
except ImportError:
    print("Installing tqdm...")
    os.system("pip install tqdm")
    from tqdm import tqdm


class GooglePlacesClient:
    """Client for Google Places API (New)"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://places.googleapis.com/v1/places"
        self.search_url = f"{self.base_url}:searchText"
        
    def search_restaurant(self, name: str, city: str, neighborhood: str = "") -> Optional[Dict[str, Any]]:
        """
        Search for a restaurant and return place details.
        
        Args:
            name: Restaurant name
            city: City name
            neighborhood: Optional neighborhood for better matching
            
        Returns:
            Dict with place details or None if not found
        """
        # Build search query - include neighborhood for better accuracy
        if neighborhood and neighborhood != city:
            query = f"{name} restaurant in {neighborhood}, {city}"
        else:
            query = f"{name} restaurant in {city}"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.googleMapsUri"
        }
        
        payload = {
            "textQuery": query,
            "maxResultCount": 1
        }
        
        try:
            response = requests.post(self.search_url, headers=headers, json=payload)
            
            # Better error logging
            if response.status_code != 200:
                error_detail = response.text[:500] if response.text else "No error details"
                print(f"\n  API Error for '{name}': {response.status_code} - {error_detail}")
                return None
                
            data = response.json()
            
            if "places" in data and len(data["places"]) > 0:
                place = data["places"][0]
                return {
                    "place_id": place.get("id", ""),
                    "google_name": place.get("displayName", {}).get("text", ""),
                    "address": place.get("formattedAddress", ""),
                    "lat": place.get("location", {}).get("latitude", ""),
                    "lon": place.get("location", {}).get("longitude", ""),
                    "website": place.get("websiteUri", ""),
                    "google_maps_url": place.get("googleMapsUri", "")
                }
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"\n  API Error for '{name}': {e}")
            return None
    
    def search_restaurant_legacy(self, name: str, city: str, neighborhood: str = "") -> Optional[Dict[str, Any]]:
        """
        Fallback using legacy Places API (Text Search).
        Use this if you have issues with the new API.
        """
        base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        
        if neighborhood and neighborhood != city:
            query = f"{name} restaurant {neighborhood} {city}"
        else:
            query = f"{name} restaurant {city}"
        
        params = {
            "query": query,
            "key": self.api_key
        }
        
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                place = data["results"][0]
                place_id = place.get("place_id", "")
                
                return {
                    "place_id": place_id,
                    "google_name": place.get("name", ""),
                    "address": place.get("formatted_address", ""),
                    "lat": place.get("geometry", {}).get("location", {}).get("lat", ""),
                    "lon": place.get("geometry", {}).get("location", {}).get("lng", ""),
                    "website": "",  # Need separate Place Details call for this
                    "google_maps_url": f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else ""
                }
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"\n  API Error for '{name}': {e}")
            return None


def enrich_restaurants(
    input_file: str,
    output_file: str,
    failed_file: str,
    api_key: str,
    delay: float = 0.1,
    use_legacy: bool = False
):
    """
    Main function to enrich restaurant data.
    
    Args:
        input_file: Path to input CSV
        output_file: Path to output enriched CSV
        failed_file: Path to save failed lookups
        api_key: Google API key
        delay: Delay between API calls (seconds)
        use_legacy: Use legacy Places API instead of new API
    """
    client = GooglePlacesClient(api_key)
    
    # Read input CSV
    restaurants = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        restaurants = list(reader)
    
    print(f"\nLoaded {len(restaurants)} restaurants from {input_file}")
    print(f"Using {'legacy' if use_legacy else 'new'} Google Places API")
    print(f"Delay between requests: {delay}s")
    print("-" * 60)
    
    enriched = []
    failed = []
    
    search_fn = client.search_restaurant_legacy if use_legacy else client.search_restaurant
    
    for restaurant in tqdm(restaurants, desc="Enriching restaurants"):
        name = restaurant.get("Name", "")
        city = restaurant.get("City", "")
        neighborhood = restaurant.get("Neighborhood", "")
        cuisine = restaurant.get("Cuisine", "")
        
        # Search Google Places
        result = search_fn(name, city, neighborhood)
        
        if result:
            enriched_row = {
                "City": city,
                "Name": name,
                "Cuisine": cuisine,
                "Neighborhood": neighborhood,
                "Address": result["address"],
                "Website": result["website"],
                "Lat": result["lat"],
                "Lon": result["lon"],
                "Place_ID": result["place_id"],
                "Google_Maps_URL": result["google_maps_url"],
                "Google_Name": result["google_name"]
            }
            enriched.append(enriched_row)
        else:
            failed_row = {
                "City": city,
                "Name": name,
                "Cuisine": cuisine,
                "Neighborhood": neighborhood,
                "Reason": "Not found in Google Places"
            }
            failed.append(failed_row)
        
        # Rate limiting
        time.sleep(delay)
    
    # Write enriched CSV
    if enriched:
        fieldnames = ["City", "Name", "Cuisine", "Neighborhood", "Address", "Website", 
                      "Lat", "Lon", "Place_ID", "Google_Maps_URL", "Google_Name"]
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(enriched)
        print(f"\n✓ Saved {len(enriched)} enriched restaurants to {output_file}")
    
    # Write failed lookups
    if failed:
        fieldnames = ["City", "Name", "Cuisine", "Neighborhood", "Reason"]
        with open(failed_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(failed)
        print(f"✗ Saved {len(failed)} failed lookups to {failed_file}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total restaurants: {len(restaurants)}")
    print(f"Successfully enriched: {len(enriched)} ({100*len(enriched)/len(restaurants):.1f}%)")
    print(f"Failed lookups: {len(failed)} ({100*len(failed)/len(restaurants):.1f}%)")
    
    return enriched, failed


def main():
    parser = argparse.ArgumentParser(
        description="Enrich Chase Sapphire restaurant data with Google Places API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage with new Places API
    python enrich_restaurants.py --api-key YOUR_API_KEY
    
    # Use legacy API (if new API has issues)
    python enrich_restaurants.py --api-key YOUR_API_KEY --legacy
    
    # Custom input/output files
    python enrich_restaurants.py --api-key YOUR_API_KEY \\
        --input my_restaurants.csv \\
        --output enriched.csv
    
    # Slower rate limiting (if hitting quota)
    python enrich_restaurants.py --api-key YOUR_API_KEY --delay 0.5

API Key Setup:
    1. Go to https://console.cloud.google.com/
    2. Create a project (or select existing)
    3. Enable "Places API" and/or "Places API (New)"
    4. Go to Credentials → Create API Key
    5. (Optional) Restrict key to Places API only
        """
    )
    
    parser.add_argument(
        "--api-key",
        required=True,
        help="Google API key with Places API enabled"
    )
    parser.add_argument(
        "--input",
        default="chase_sapphire_restaurants_complete.csv",
        help="Input CSV file (default: chase_sapphire_restaurants_complete.csv)"
    )
    parser.add_argument(
        "--output",
        default="chase_sapphire_restaurants_enriched.csv",
        help="Output CSV file (default: chase_sapphire_restaurants_enriched.csv)"
    )
    parser.add_argument(
        "--failed",
        default="chase_sapphire_failed_lookups.csv",
        help="Failed lookups CSV file (default: chase_sapphire_failed_lookups.csv)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Delay between API calls in seconds (default: 0.1)"
    )
    parser.add_argument(
        "--legacy",
        action="store_true",
        help="Use legacy Places API instead of new API"
    )
    
    args = parser.parse_args()
    
    # Check input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        print("Make sure chase_sapphire_restaurants_complete.csv is in the current directory.")
        return 1
    
    print("\n" + "=" * 60)
    print("CHASE SAPPHIRE RESTAURANT ENRICHMENT")
    print("=" * 60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    enrich_restaurants(
        input_file=args.input,
        output_file=args.output,
        failed_file=args.failed,
        api_key=args.api_key,
        delay=args.delay,
        use_legacy=args.legacy
    )
    
    print(f"\nEnd time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return 0


if __name__ == "__main__":
    exit(main())
