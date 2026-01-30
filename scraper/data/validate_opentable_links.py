#!/usr/bin/env python3
"""
OpenTable Link Validator

Generates potential OpenTable URLs from restaurant names and validates which ones work.
OpenTable slugs are unpredictable, so this tries multiple variations and tests them.

Usage:
    python validate_opentable_links.py

Requirements:
    pip install requests tqdm
"""

import csv
import re
import time
from typing import List, Optional, Tuple

try:
    import requests
except ImportError:
    print("Installing requests...")
    import os
    os.system("pip install requests")
    import requests

try:
    from tqdm import tqdm
except ImportError:
    print("Installing tqdm...")
    import os
    os.system("pip install tqdm")
    from tqdm import tqdm


def name_to_slugs(name: str, neighborhood: str, city: str) -> List[str]:
    """
    Generate multiple possible OpenTable slug variations.
    Returns list of potential slugs to try.
    """
    def slugify(text: str) -> str:
        """Convert text to URL slug"""
        slug = text.lower()
        # Remove special chars except hyphens and spaces
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        # Replace spaces with hyphens
        slug = re.sub(r'\s+', '-', slug)
        # Remove multiple hyphens
        slug = re.sub(r'-+', '-', slug)
        return slug.strip('-')
    
    name_slug = slugify(name)
    neighborhood_slug = slugify(neighborhood) if neighborhood else ""
    city_slug = slugify(city)
    
    # Generate variations - OpenTable uses different patterns
    variations = []
    
    # Pattern 1: name-neighborhood (most common)
    if neighborhood_slug and neighborhood_slug != city_slug:
        variations.append(f"{name_slug}-{neighborhood_slug}")
    
    # Pattern 2: name-city
    variations.append(f"{name_slug}-{city_slug}")
    
    # Pattern 3: name-city-neighborhood
    if neighborhood_slug and neighborhood_slug != city_slug:
        variations.append(f"{name_slug}-{city_slug}-{neighborhood_slug}")
    
    # Pattern 4: name-neighborhood-city
    if neighborhood_slug and neighborhood_slug != city_slug:
        variations.append(f"{name_slug}-{neighborhood_slug}-{city_slug}")
    
    # Pattern 5: Just name-city with numeric suffix (-1, -2, etc)
    # We'll add these during validation
    
    return variations


def validate_url(url: str, session: requests.Session) -> Tuple[bool, str]:
    """
    Check if a URL resolves to a valid OpenTable restaurant page.
    Returns (is_valid, final_url)
    """
    try:
        response = session.head(url, allow_redirects=True, timeout=10)
        
        # 200 = found, 301/302 = redirect (follow it)
        if response.status_code == 200:
            return True, response.url
        elif response.status_code in [301, 302]:
            return True, response.url
        else:
            return False, ""
            
    except requests.exceptions.RequestException:
        return False, ""


def find_opentable_url(name: str, neighborhood: str, city: str, session: requests.Session) -> Optional[str]:
    """
    Try multiple URL variations to find a working OpenTable link.
    """
    base_url = "https://www.opentable.com/r/"
    
    # Get base slug variations
    slugs = name_to_slugs(name, neighborhood, city)
    
    # Try each variation, including with numeric suffixes
    for slug in slugs:
        # Try without suffix
        url = f"{base_url}{slug}"
        is_valid, final_url = validate_url(url, session)
        if is_valid:
            return final_url
        
        # Try with numeric suffixes (-1, -2, -3)
        for suffix in range(1, 4):
            url = f"{base_url}{slug}-{suffix}"
            is_valid, final_url = validate_url(url, session)
            if is_valid:
                return final_url
    
    return None


def main():
    input_file = 'chase_sapphire_restaurants_complete.csv'
    output_file = 'chase_sapphire_with_opentable_validated.csv'
    failed_file = 'opentable_failed_lookups.csv'
    
    # Read restaurants
    restaurants = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        restaurants = list(reader)
    
    print(f"\nLoaded {len(restaurants)} restaurants")
    print("Validating OpenTable URLs (this may take a few minutes)...\n")
    
    # Create session for connection pooling
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    successful = []
    failed = []
    
    for restaurant in tqdm(restaurants, desc="Validating URLs"):
        name = restaurant.get('Name', '')
        neighborhood = restaurant.get('Neighborhood', '')
        city = restaurant.get('City', '')
        cuisine = restaurant.get('Cuisine', '')
        
        url = find_opentable_url(name, neighborhood, city, session)
        
        if url:
            successful.append({
                'City': city,
                'Name': name,
                'Cuisine': cuisine,
                'Neighborhood': neighborhood,
                'OpenTable_URL': url
            })
        else:
            failed.append({
                'City': city,
                'Name': name,
                'Cuisine': cuisine,
                'Neighborhood': neighborhood
            })
        
        # Small delay to be nice to OpenTable
        time.sleep(0.1)
    
    # Write successful lookups
    if successful:
        fieldnames = ['City', 'Name', 'Cuisine', 'Neighborhood', 'OpenTable_URL']
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(successful)
        print(f"\n✓ Saved {len(successful)} validated URLs to {output_file}")
    
    # Write failed lookups
    if failed:
        fieldnames = ['City', 'Name', 'Cuisine', 'Neighborhood']
        with open(failed_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(failed)
        print(f"✗ Saved {len(failed)} failed lookups to {failed_file}")
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total restaurants: {len(restaurants)}")
    print(f"URLs found: {len(successful)} ({100*len(successful)/len(restaurants):.1f}%)")
    print(f"URLs not found: {len(failed)} ({100*len(failed)/len(restaurants):.1f}%)")
    
    if failed:
        print(f"\nFailed restaurants saved to {failed_file}")
        print("You can manually search these on OpenTable and add the URLs.")


if __name__ == "__main__":
    main()
