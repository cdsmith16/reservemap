"""
Universal Location Scraper
===========================
Uses Playwright to fetch any webpage and Claude to intelligently extract location data.
Works on OpenTable, Yelp, Eater, TripAdvisor, or any site with a list of places.

Usage:
    # Single URL
    python scraper.py "https://www.opentable.com/sapphire-reserve/new-york-city"
    
    # Bulk mode - CSV with 'url' column (and optional 'name' column for output filenames)
    python scraper.py --bulk urls.csv --output-dir ./results
    
    # Bulk mode - simple text file with one URL per line
    python scraper.py --bulk urls.txt --output-dir ./results

Requirements:
    pip install playwright anthropic requests
    playwright install chromium
    
Environment:
    export ANTHROPIC_API_KEY=your_key_here
    export GOOGLE_PLACES_API_KEY=your_key_here  # Optional, for Place IDs
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import anthropic
import requests
from playwright.sync_api import sync_playwright


def fetch_page_simple(url: str) -> tuple[str, str]:
    """Fetch a page using requests (no JS rendering). Works for many sites."""
    print(f"[*] Fetching (simple mode): {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    html = response.text
    
    # Extract text content (rough approximation without BS4)
    import re
    text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    print(f"[OK] Fetched {len(html):,} chars of HTML")
    return html, text


def fetch_page(url: str, wait_seconds: int = 3, use_simple: bool = False) -> tuple[str, str]:
    """Fetch a page. Uses Playwright by default, falls back to simple requests."""
    
    if use_simple:
        return fetch_page_simple(url)
    
    print(f"[*] Fetching: {url}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()
        
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            # Extra wait for JS-heavy sites
            time.sleep(wait_seconds)
            
            # Get the rendered HTML
            content = page.content()
            
            # Also get just the text for potentially cleaner parsing
            text = page.evaluate("() => document.body.innerText")
            
        finally:
            browser.close()
    
    print(f"[OK] Fetched {len(content):,} chars of HTML")
    return content, text


def extract_locations_with_claude(html: str, text: str, url: str) -> list[dict]:
    """Use Claude to intelligently extract location data from page content."""
    
    client = anthropic.Anthropic()
    
    # Truncate if too long (Claude can handle a lot, but let's be reasonable)
    max_chars = 100000
    if len(html) > max_chars:
        html = html[:max_chars] + "\n... [truncated]"
    if len(text) > max_chars:
        text = text[:max_chars] + "\n... [truncated]"
    
    prompt = f"""Extract all locations/places/businesses from this webpage. This could be restaurants, hotels, shops, attractions, or any other places.

URL: {url}

PAGE TEXT:
{text}

---

For each location found, extract whatever information is available:
- name (required)
- address (if available)
- neighborhood/area (if available) 
- cuisine/category/type (if available)
- description (brief, if available)
- price_range (if available)
- rating (if available)

Return ONLY valid JSON in this exact format, no other text:
{{
  "locations": [
    {{
      "name": "Example Place",
      "address": "123 Main St, New York, NY 10001",
      "neighborhood": "SoHo",
      "category": "Italian Restaurant",
      "description": "Brief description",
      "price_range": "$$$",
      "rating": "4.5"
    }}
  ],
  "source_url": "{url}",
  "total_count": 10
}}

Notes:
- Include ALL locations found on the page
- If a field is not available, use null
- For address, include city/state if shown
- Be thorough - don't miss any locations listed"""

    print("[*] Asking Claude to extract locations...")
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    response_text = response.content[0].text
    
    # Parse JSON from response
    try:
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        data = json.loads(response_text)
        locations = data.get("locations", [])
        print(f"[OK] Extracted {len(locations)} locations")
        return locations
        
    except json.JSONDecodeError as e:
        print(f"[ERR] Failed to parse Claude's response as JSON: {e}")
        print(f"Response was: {response_text[:500]}...")
        return []


def get_place_id(name: str, address: str, api_key: str) -> Optional[dict]:
    """Look up Google Place ID for a location."""
    
    query = f"{name} {address}" if address else name
    url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    
    params = {
        "input": query,
        "inputtype": "textquery",
        "fields": "place_id,name,formatted_address,geometry",
        "key": api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("candidates"):
            candidate = data["candidates"][0]
            return {
                "place_id": candidate.get("place_id"),
                "google_name": candidate.get("name"),
                "google_address": candidate.get("formatted_address"),
                "lat": candidate.get("geometry", {}).get("location", {}).get("lat"),
                "lng": candidate.get("geometry", {}).get("location", {}).get("lng"),
                "google_maps_url": f"https://www.google.com/maps/place/?q=place_id:{candidate.get('place_id')}"
            }
    except Exception as e:
        print(f"  [WARN] Places API error for {name}: {e}")
    
    return None


def enrich_with_place_ids(locations: list[dict], api_key: str) -> list[dict]:
    """Add Google Place IDs to all locations."""
    
    print(f"\n[*] Looking up Place IDs for {len(locations)} locations...")
    
    for i, loc in enumerate(locations):
        name = loc.get("name", "")
        address = loc.get("address") or loc.get("neighborhood") or ""
        
        print(f"  [{i+1}/{len(locations)}] {name}...", end=" ")
        
        place_data = get_place_id(name, address, api_key)
        
        if place_data:
            loc.update(place_data)
            print(f"[OK]")
        else:
            print(f"[NOT FOUND]")
        
        # Rate limiting - Places API allows 100 QPS but let's be nice
        time.sleep(0.1)
    
    found = sum(1 for loc in locations if loc.get("place_id"))
    print(f"\n[OK] Found Place IDs for {found}/{len(locations)} locations")
    
    return locations


def export_csv(locations: list[dict], output_file: str):
    """Export locations to CSV for Google My Maps import."""
    
    # Determine all unique fields across locations
    all_fields = set()
    for loc in locations:
        all_fields.update(loc.keys())
    
    # Preferred column order
    preferred_order = [
        "name", "google_name", "address", "google_address", "neighborhood",
        "category", "description", "price_range", "rating",
        "place_id", "google_maps_url", "lat", "lng"
    ]
    
    # Build final field list
    fields = [f for f in preferred_order if f in all_fields]
    fields += [f for f in sorted(all_fields) if f not in fields]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(locations)
    
    print(f"\n[SAVED] Exported to: {output_file}")


def export_json(locations: list[dict], output_file: str):
    """Export locations to JSON."""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(locations, f, indent=2)
    
    print(f"[SAVED] Exported to: {output_file}")


def slugify(text: str) -> str:
    """Convert text to a safe filename."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


def extract_name_from_url(url: str) -> str:
    """Extract a reasonable name from URL for output filename."""
    parsed = urlparse(url)
    path = parsed.path.strip('/')
    if path:
        # Get last path segment
        name = path.split('/')[-1]
        return slugify(name)
    return slugify(parsed.netloc)


def load_bulk_urls(filepath: str) -> list[dict]:
    """Load URLs from CSV or text file. Returns list of {url, name} dicts."""
    urls = []
    path = Path(filepath)
    
    if path.suffix.lower() == '.csv':
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Look for 'url' or 'link' column
                url = row.get('url') or row.get('URL') or row.get('link') or row.get('Link')
                name = row.get('name') or row.get('Name') or row.get('city') or row.get('City')
                if url:
                    urls.append({
                        'url': url.strip(),
                        'name': name.strip() if name else extract_name_from_url(url)
                    })
    else:
        # Treat as plain text, one URL per line
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and line.startswith('http'):
                    urls.append({
                        'url': line,
                        'name': extract_name_from_url(line)
                    })
    
    return urls


def process_single_url(url: str, output_file: str, places_api_key: Optional[str], 
                       wait_seconds: int, export_json: bool, use_simple: bool = False) -> bool:
    """Process a single URL. Returns True on success."""
    try:
        # Fetch the page
        html, text = fetch_page(url, wait_seconds=wait_seconds, use_simple=use_simple)
        
        # Extract locations with Claude
        locations = extract_locations_with_claude(html, text, url)
        
        if not locations:
            print(f"[WARN] No locations found for {url}")
            return False
        
        # Enrich with Place IDs if API key provided
        if places_api_key:
            locations = enrich_with_place_ids(locations, places_api_key)
        
        # Export results
        export_csv(locations, output_file)
        
        if export_json:
            json_file = output_file.rsplit('.', 1)[0] + '.json'
            export_json_file(locations, json_file)
        
        return True
        
    except Exception as e:
        print(f"[ERR] Failed to process {url}: {e}")
        return False


def export_json_file(locations: list[dict], output_file: str):
    """Export locations to JSON."""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(locations, f, indent=2)
    print(f"[SAVED] Exported to: {output_file}")


def run_bulk_mode(bulk_file: str, output_dir: str, places_api_key: Optional[str],
                  wait_seconds: int, export_json: bool, delay_between: int, use_simple: bool = False):
    """Process multiple URLs from a file."""
    
    # Load URLs
    urls = load_bulk_urls(bulk_file)
    print(f"[*] Loaded {len(urls)} URLs from {bulk_file}")
    print(f"[*] Mode: {'Simple (requests)' if use_simple else 'Full (Playwright)'}\n")
    
    if not urls:
        print("[ERR] No valid URLs found in file")
        return
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Track results
    success = 0
    failed = 0
    failed_urls = []
    
    for i, item in enumerate(urls):
        url = item['url']
        name = item['name']
        output_file = os.path.join(output_dir, f"{name}.csv")
        
        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(urls)}] Processing: {name}")
        print(f"    URL: {url}")
        print(f"    Output: {output_file}")
        print('='*60)
        
        if process_single_url(url, output_file, places_api_key, wait_seconds, export_json, use_simple):
            success += 1
        else:
            failed += 1
            failed_urls.append(url)
        
        # Delay between requests to be nice to servers
        if i < len(urls) - 1:
            print(f"\n[*] Waiting {delay_between}s before next request...")
            time.sleep(delay_between)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"[DONE] Bulk processing complete")
    print(f"    Success: {success}/{len(urls)}")
    print(f"    Failed:  {failed}/{len(urls)}")
    if failed_urls:
        print(f"\n    Failed URLs:")
        for url in failed_urls:
            print(f"      - {url}")
    print('='*60)


def main():
    parser = argparse.ArgumentParser(
        description="Universal location scraper - extracts places from any webpage",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single URL
  python scraper.py "https://www.opentable.com/sapphire-reserve/new-york-city"
  python scraper.py "https://ny.eater.com/maps/best-restaurants" -o eater_picks.csv
  
  # Bulk mode with CSV (must have 'url' column, optional 'name' column)
  python scraper.py --bulk cities.csv --output-dir ./chase_restaurants
  
  # Bulk mode with text file (one URL per line)
  python scraper.py --bulk urls.txt --output-dir ./results --delay 10
        """
    )
    
    # Single URL mode
    parser.add_argument("url", nargs='?', help="URL to scrape (for single mode)")
    
    # Bulk mode
    parser.add_argument("--bulk", metavar="FILE", help="CSV or text file with URLs for bulk processing")
    parser.add_argument("--output-dir", default="./output", help="Output directory for bulk mode (default: ./output)")
    parser.add_argument("--delay", type=int, default=5, help="Seconds to wait between URLs in bulk mode (default: 5)")
    
    # Common options
    parser.add_argument("-o", "--output", default="locations.csv", help="Output filename for single mode (default: locations.csv)")
    parser.add_argument("--json", action="store_true", help="Also export as JSON")
    parser.add_argument("--no-place-ids", action="store_true", help="Skip Google Place ID lookup")
    parser.add_argument("--wait", type=int, default=3, help="Seconds to wait for page to render (default: 3)")
    parser.add_argument("--simple", action="store_true", help="Use simple requests instead of Playwright (faster, no browser needed, but no JS rendering)")
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.bulk and not args.url:
        parser.error("Either provide a URL or use --bulk with a file")
    
    if args.bulk and args.url:
        parser.error("Cannot use both URL and --bulk mode. Choose one.")
    
    # Check for required API keys
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("[ERR] Please set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)
    
    places_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not places_api_key and not args.no_place_ids:
        print("[WARN] GOOGLE_PLACES_API_KEY not set - skipping Place ID lookup")
        print("   Set it to enable Google Maps integration, or use --no-place-ids\n")
        places_api_key = None
    elif args.no_place_ids:
        places_api_key = None
    
    # Run appropriate mode
    if args.bulk:
        run_bulk_mode(
            bulk_file=args.bulk,
            output_dir=args.output_dir,
            places_api_key=places_api_key,
            wait_seconds=args.wait,
            export_json=args.json,
            delay_between=args.delay,
            use_simple=args.simple
        )
    else:
        # Single URL mode
        html, text = fetch_page(args.url, wait_seconds=args.wait, use_simple=args.simple)
        locations = extract_locations_with_claude(html, text, args.url)
        
        if not locations:
            print("[ERR] No locations found")
            sys.exit(1)
        
        if places_api_key:
            locations = enrich_with_place_ids(locations, places_api_key)
        
        export_csv(locations, args.output)
        
        if args.json:
            json_file = args.output.rsplit('.', 1)[0] + '.json'
            export_json_file(locations, json_file)
        
        print(f"\n[DONE] Extracted {len(locations)} locations from {args.url}")
        
        if places_api_key:
            with_ids = sum(1 for loc in locations if loc.get("place_id"))
            print(f"   {with_ids} have Google Place IDs (ready for My Maps)")


if __name__ == "__main__":
    main()
