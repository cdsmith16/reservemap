#!/usr/bin/env python3
"""
Restaurant Enrichment Script (Streaming + Threaded Version)
Enriches restaurant data with Google Places API information.

Memory-efficient: streams row-by-row instead of loading entire CSV into memory.
Supports checkpointing for resumable runs on large datasets.
Supports concurrent API calls with threading.

Usage:
    # Basic streaming (processes row by row)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv
    
    # With 4 concurrent threads (recommended)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --threads 4
    
    # With checkpointing every 500 rows (resumable)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --checkpoint 500 --threads 4
    
    # Resume from last checkpoint
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --resume

Requirements:
    pip install requests tqdm
"""

import argparse
import csv
import json
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional, Dict, Any, Iterator, List, Tuple
from queue import Queue

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
    """Client for Google Places API"""
    
    def __init__(self, api_key: str, use_legacy: bool = False):
        self.api_key = api_key
        self.use_legacy = use_legacy
        self.base_url = "https://places.googleapis.com/v1/places"
        self.search_url = f"{self.base_url}:searchText"
        
    def search_restaurant(self, name: str, city: str, state: str = "", neighborhood: str = "") -> Optional[Dict[str, Any]]:
        """Search for a restaurant and return place details."""
        if self.use_legacy:
            return self._search_legacy(name, city, state, neighborhood)
        return self._search_new(name, city, state, neighborhood)
    
    def _search_new(self, name: str, city: str, state: str = "", neighborhood: str = "") -> Optional[Dict[str, Any]]:
        """New Places API (recommended)"""
        # Build search query
        location_parts = [p for p in [neighborhood, city, state] if p and p != city]
        location = ", ".join([city] + location_parts) if location_parts else city
        query = f"{name} restaurant in {location}"
        
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
            response = requests.post(self.search_url, headers=headers, json=payload, timeout=10)
            
            if response.status_code != 200:
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
            
        except Exception as e:
            return None
    
    def _search_legacy(self, name: str, city: str, state: str = "", neighborhood: str = "") -> Optional[Dict[str, Any]]:
        """Legacy Places API fallback"""
        location_parts = [p for p in [neighborhood, city, state] if p and p != city]
        location = ", ".join([city] + location_parts) if location_parts else city
        query = f"{name} restaurant {location}"
        
        params = {
            "query": query,
            "key": self.api_key
        }
        
        try:
            response = requests.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params=params,
                timeout=10
            )
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
                    "website": "",
                    "google_maps_url": f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else ""
                }
            return None
            
        except Exception:
            return None


def count_lines(filename: str) -> int:
    """Count lines in file for progress bar"""
    with open(filename, 'r', encoding='utf-8') as f:
        return sum(1 for _ in f) - 1  # Subtract header


def get_checkpoint_file(output_file: str) -> str:
    """Get checkpoint filename based on output file"""
    return output_file.replace('.csv', '_checkpoint.json')


def load_checkpoint(checkpoint_file: str) -> int:
    """Load last processed row from checkpoint"""
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, 'r') as f:
            data = json.load(f)
            return data.get('last_row', 0)
    return 0


def save_checkpoint(checkpoint_file: str, row_num: int, stats: dict):
    """Save checkpoint with current progress"""
    with open(checkpoint_file, 'w') as f:
        json.dump({
            'last_row': row_num,
            'timestamp': datetime.now().isoformat(),
            'stats': stats
        }, f)


def enrich_restaurants_streaming(
    input_file: str,
    output_file: str,
    failed_file: str,
    api_key: str,
    delay: float = 0.1,
    use_legacy: bool = False,
    checkpoint_interval: int = 0,
    resume: bool = False,
    limit: int = 0,
    num_threads: int = 1
):
    """
    Stream-process restaurants with optional checkpointing and threading.
    
    Args:
        input_file: Path to input CSV
        output_file: Path to output enriched CSV
        failed_file: Path to save failed lookups
        api_key: Google API key
        delay: Delay between API calls (seconds) - per thread
        use_legacy: Use legacy Places API
        checkpoint_interval: Save checkpoint every N rows (0 = disabled)
        resume: Resume from last checkpoint
        limit: Stop after N rows (0 = no limit, useful for testing)
        num_threads: Number of concurrent threads (default: 1)
    """
    client = GooglePlacesClient(api_key, use_legacy=use_legacy)
    checkpoint_file = get_checkpoint_file(output_file)
    
    # Determine starting point
    start_row = 0
    if resume:
        start_row = load_checkpoint(checkpoint_file)
        if start_row > 0:
            print(f"Resuming from row {start_row}")
    
    # Count total rows for progress bar
    total_rows = count_lines(input_file)
    if limit > 0:
        total_rows = min(total_rows, start_row + limit)
    
    print(f"\nInput: {input_file}")
    print(f"Output: {output_file}")
    print(f"Total rows: {total_rows}")
    print(f"Starting from row: {start_row}")
    print(f"API: {'legacy' if use_legacy else 'new'} Places API")
    print(f"Threads: {num_threads}")
    print(f"Delay: {delay}s between requests (per thread)")
    if checkpoint_interval:
        print(f"Checkpointing every {checkpoint_interval} rows")
    print("-" * 60)
    
    # Use threaded version if num_threads > 1
    if num_threads > 1:
        stats = enrich_threaded(
            input_file=input_file,
            output_file=output_file,
            failed_file=failed_file,
            client=client,
            start_row=start_row,
            total_rows=total_rows,
            delay=delay,
            checkpoint_interval=checkpoint_interval,
            checkpoint_file=checkpoint_file,
            resume=resume,
            limit=limit,
            num_threads=num_threads
        )
    else:
        stats = enrich_sequential(
            input_file=input_file,
            output_file=output_file,
            failed_file=failed_file,
            client=client,
            start_row=start_row,
            total_rows=total_rows,
            delay=delay,
            checkpoint_interval=checkpoint_interval,
            checkpoint_file=checkpoint_file,
            resume=resume,
            limit=limit
        )
    
    # Summary
    total_processed = stats['success'] + stats['failed']
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total processed: {total_processed}")
    print(f"Successfully enriched: {stats['success']} ({100*stats['success']/max(total_processed,1):.1f}%)")
    print(f"Failed lookups: {stats['failed']} ({100*stats['failed']/max(total_processed,1):.1f}%)")
    print(f"\nOutput saved to: {output_file}")
    print(f"Failed lookups saved to: {failed_file}")
    
    return stats


def enrich_threaded(
    input_file: str,
    output_file: str,
    failed_file: str,
    client: GooglePlacesClient,
    start_row: int,
    total_rows: int,
    delay: float,
    checkpoint_interval: int,
    checkpoint_file: str,
    resume: bool,
    limit: int,
    num_threads: int
) -> dict:
    """
    Threaded enrichment using concurrent.futures.
    Batches rows, processes in parallel, writes results in order.
    """
    stats = {'success': 0, 'failed': 0, 'skipped': start_row}
    
    # Thread-safe locks for file writing
    write_lock = threading.Lock()
    stats_lock = threading.Lock()
    
    # Determine write mode based on resume
    write_mode = 'a' if resume and start_row > 0 else 'w'
    write_header = not (resume and start_row > 0)
    
    # Read all rows we need to process (we need them for batching)
    rows_to_process = []
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        input_fields = reader.fieldnames
        
        for row_num, row in enumerate(reader):
            if row_num < start_row:
                continue
            if limit > 0 and (row_num - start_row) >= limit:
                break
            rows_to_process.append((row_num, row))
    
    # Detect format
    is_resy_format = 'name' in input_fields and 'state' in input_fields
    
    if is_resy_format:
        output_fields = ['name', 'city', 'state', 'country', 'address', 'website', 
                       'lat', 'lon', 'place_id', 'google_maps_url', 'google_name']
        failed_fields = ['name', 'city', 'state', 'country', 'reason']
    else:
        output_fields = ['City', 'Name', 'Cuisine', 'Neighborhood', 'Address', 'Website', 
                       'Lat', 'Lon', 'Place_ID', 'Google_Maps_URL', 'Google_Name']
        failed_fields = ['City', 'Name', 'Cuisine', 'Neighborhood', 'Reason']
    
    def process_row(row_data: Tuple[int, dict]) -> Tuple[int, dict, bool]:
        """Process a single row - runs in thread"""
        row_num, row = row_data
        
        # Extract fields based on format
        if is_resy_format:
            name = row.get('name', '')
            city = row.get('city', '')
            state = row.get('state', '')
            country = row.get('country', '')
            neighborhood = ''
            cuisine = ''
        else:
            name = row.get('Name', '')
            city = row.get('City', '')
            state = ''
            country = 'USA'
            neighborhood = row.get('Neighborhood', '')
            cuisine = row.get('Cuisine', '')
        
        # Rate limiting per thread
        time.sleep(delay)
        
        # Search Google Places
        result = client.search_restaurant(name, city, state, neighborhood)
        
        if result:
            if is_resy_format:
                enriched_row = {
                    'name': name,
                    'city': city,
                    'state': state,
                    'country': country,
                    'address': result['address'],
                    'website': result['website'],
                    'lat': result['lat'],
                    'lon': result['lon'],
                    'place_id': result['place_id'],
                    'google_maps_url': result['google_maps_url'],
                    'google_name': result['google_name']
                }
            else:
                enriched_row = {
                    'City': city,
                    'Name': name,
                    'Cuisine': cuisine,
                    'Neighborhood': neighborhood,
                    'Address': result['address'],
                    'Website': result['website'],
                    'Lat': result['lat'],
                    'Lon': result['lon'],
                    'Place_ID': result['place_id'],
                    'Google_Maps_URL': result['google_maps_url'],
                    'Google_Name': result['google_name']
                }
            return (row_num, enriched_row, True)
        else:
            if is_resy_format:
                failed_row = {
                    'name': name,
                    'city': city,
                    'state': state,
                    'country': country,
                    'reason': 'Not found in Google Places'
                }
            else:
                failed_row = {
                    'City': city,
                    'Name': name,
                    'Cuisine': cuisine,
                    'Neighborhood': neighborhood,
                    'Reason': 'Not found in Google Places'
                }
            return (row_num, failed_row, False)
    
    # Open output files
    with open(output_file, write_mode, newline='', encoding='utf-8') as outfile, \
         open(failed_file, write_mode, newline='', encoding='utf-8') as failfile:
        
        writer = csv.DictWriter(outfile, fieldnames=output_fields)
        fail_writer = csv.DictWriter(failfile, fieldnames=failed_fields)
        
        if write_header:
            writer.writeheader()
            fail_writer.writeheader()
        
        # Process with thread pool
        pbar = tqdm(total=len(rows_to_process), desc=f"Enriching ({num_threads} threads)", unit="restaurants")
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            # Submit all tasks
            futures = {executor.submit(process_row, row_data): row_data for row_data in rows_to_process}
            
            processed_count = 0
            for future in as_completed(futures):
                row_num, result_row, success = future.result()
                
                with write_lock:
                    if success:
                        writer.writerow(result_row)
                        outfile.flush()
                    else:
                        fail_writer.writerow(result_row)
                        failfile.flush()
                
                with stats_lock:
                    if success:
                        stats['success'] += 1
                    else:
                        stats['failed'] += 1
                    processed_count += 1
                    
                    # Checkpoint
                    if checkpoint_interval and processed_count % checkpoint_interval == 0:
                        save_checkpoint(checkpoint_file, start_row + processed_count, stats)
                
                pbar.update(1)
                pbar.set_postfix({'✓': stats['success'], '✗': stats['failed']})
        
        pbar.close()
    
    # Final checkpoint
    if checkpoint_interval:
        save_checkpoint(checkpoint_file, start_row + len(rows_to_process), stats)
    
    return stats


def enrich_sequential(
    input_file: str,
    output_file: str,
    failed_file: str,
    client: GooglePlacesClient,
    start_row: int,
    total_rows: int,
    delay: float,
    checkpoint_interval: int,
    checkpoint_file: str,
    resume: bool,
    limit: int
) -> dict:
    """Original sequential (single-threaded) enrichment."""
    stats = {'success': 0, 'failed': 0, 'skipped': start_row}
    
    # Determine write mode based on resume
    write_mode = 'a' if resume and start_row > 0 else 'w'
    write_header = not (resume and start_row > 0)
    
    # Define output fieldnames based on input structure
    # We'll detect these from the input file
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, write_mode, newline='', encoding='utf-8') as outfile, \
         open(failed_file, write_mode, newline='', encoding='utf-8') as failfile:
        
        reader = csv.DictReader(infile)
        input_fields = reader.fieldnames
        
        # Detect input format (Chase vs Resy)
        # Chase format: City, Name, Cuisine, Neighborhood
        # Resy format: name, city, state, country
        is_resy_format = 'name' in input_fields and 'state' in input_fields
        
        if is_resy_format:
            output_fields = ['name', 'city', 'state', 'country', 'address', 'website', 
                           'lat', 'lon', 'place_id', 'google_maps_url', 'google_name']
            failed_fields = ['name', 'city', 'state', 'country', 'reason']
        else:
            output_fields = ['City', 'Name', 'Cuisine', 'Neighborhood', 'Address', 'Website', 
                           'Lat', 'Lon', 'Place_ID', 'Google_Maps_URL', 'Google_Name']
            failed_fields = ['City', 'Name', 'Cuisine', 'Neighborhood', 'Reason']
        
        writer = csv.DictWriter(outfile, fieldnames=output_fields)
        fail_writer = csv.DictWriter(failfile, fieldnames=failed_fields)
        
        if write_header:
            writer.writeheader()
            fail_writer.writeheader()
        
        # Process rows with progress bar
        pbar = tqdm(total=total_rows - start_row, desc="Enriching", unit="restaurants")
        
        for row_num, row in enumerate(reader):
            # Skip already processed rows
            if row_num < start_row:
                continue
            
            # Check limit
            if limit > 0 and (row_num - start_row) >= limit:
                break
            
            # Extract fields based on format
            if is_resy_format:
                name = row.get('name', '')
                city = row.get('city', '')
                state = row.get('state', '')
                country = row.get('country', '')
                neighborhood = ''
                cuisine = ''
            else:
                name = row.get('Name', '')
                city = row.get('City', '')
                state = ''
                country = 'USA'
                neighborhood = row.get('Neighborhood', '')
                cuisine = row.get('Cuisine', '')
            
            # Search Google Places
            result = client.search_restaurant(name, city, state, neighborhood)
            
            if result:
                if is_resy_format:
                    enriched_row = {
                        'name': name,
                        'city': city,
                        'state': state,
                        'country': country,
                        'address': result['address'],
                        'website': result['website'],
                        'lat': result['lat'],
                        'lon': result['lon'],
                        'place_id': result['place_id'],
                        'google_maps_url': result['google_maps_url'],
                        'google_name': result['google_name']
                    }
                else:
                    enriched_row = {
                        'City': city,
                        'Name': name,
                        'Cuisine': cuisine,
                        'Neighborhood': neighborhood,
                        'Address': result['address'],
                        'Website': result['website'],
                        'Lat': result['lat'],
                        'Lon': result['lon'],
                        'Place_ID': result['place_id'],
                        'Google_Maps_URL': result['google_maps_url'],
                        'Google_Name': result['google_name']
                    }
                writer.writerow(enriched_row)
                outfile.flush()  # Ensure row is written immediately
                stats['success'] += 1
            else:
                if is_resy_format:
                    failed_row = {
                        'name': name,
                        'city': city,
                        'state': state,
                        'country': country,
                        'reason': 'Not found in Google Places'
                    }
                else:
                    failed_row = {
                        'City': city,
                        'Name': name,
                        'Cuisine': cuisine,
                        'Neighborhood': neighborhood,
                        'Reason': 'Not found in Google Places'
                    }
                fail_writer.writerow(failed_row)
                failfile.flush()
                stats['failed'] += 1
            
            # Checkpoint
            if checkpoint_interval and (row_num + 1) % checkpoint_interval == 0:
                save_checkpoint(checkpoint_file, row_num + 1, stats)
                pbar.set_postfix({'✓': stats['success'], '✗': stats['failed'], 'saved': row_num + 1})
            
            pbar.update(1)
            
            # Rate limiting
            time.sleep(delay)
        
        pbar.close()
    
    # Final checkpoint
    if checkpoint_interval:
        save_checkpoint(checkpoint_file, row_num + 1, stats)
    
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Enrich restaurant data with Google Places API (streaming + threaded)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic streaming enrichment (single-threaded)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv
    
    # With 4 concurrent threads (4x faster!)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --threads 4
    
    # With checkpointing + threading (recommended for large files)
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --checkpoint 500 --threads 4
    
    # Resume from last checkpoint after interruption
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --resume --threads 4
    
    # Test with first 100 rows
    python enrich_restaurants_streaming.py --api-key YOUR_KEY --input resy_gda_usa.csv --limit 100 --threads 4

Threading notes:
    - Google Places API supports 6000 QPM, so 4 threads is very safe
    - 4 threads at 0.1s delay: ~4 min for 10K rows (vs ~17 min single-threaded)
    - Results may write out of order, but all data is captured

Supports both input formats:
    - Chase format: City, Name, Cuisine, Neighborhood
    - Resy format: name, city, state, country
        """
    )
    
    parser.add_argument("--api-key", required=True, help="Google API key")
    parser.add_argument("--input", required=True, help="Input CSV file")
    parser.add_argument("--output", default=None, help="Output CSV (default: input_enriched.csv)")
    parser.add_argument("--failed", default=None, help="Failed lookups CSV (default: input_failed.csv)")
    parser.add_argument("--delay", type=float, default=0.1, help="Delay between API calls (default: 0.1s)")
    parser.add_argument("--legacy", action="store_true", help="Use legacy Places API")
    parser.add_argument("--checkpoint", type=int, default=0, help="Save checkpoint every N rows (default: disabled)")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N rows (for testing)")
    parser.add_argument("--threads", type=int, default=1, help="Number of concurrent threads (default: 1, recommended: 4)")
    
    args = parser.parse_args()
    
    # Default output filenames
    base = os.path.splitext(args.input)[0]
    output_file = args.output or f"{base}_enriched.csv"
    failed_file = args.failed or f"{base}_failed.csv"
    
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        return 1
    
    print("\n" + "=" * 60)
    print("RESTAURANT ENRICHMENT (Streaming)")
    print("=" * 60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    enrich_restaurants_streaming(
        input_file=args.input,
        output_file=output_file,
        failed_file=failed_file,
        api_key=args.api_key,
        delay=args.delay,
        use_legacy=args.legacy,
        checkpoint_interval=args.checkpoint,
        resume=args.resume,
        limit=args.limit,
        num_threads=args.threads
    )
    
    print(f"\nEnd time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
