# ReserveMap: Project Specification

> **"Some reservations websites have no map view, making it hard to plan and take advantage of credit card dining benefits. So I made one."**

---

## Project Overview

ReserveMap is a unified visualization of premium restaurant collections from multiple credit card and reservation platforms. The goal is to help diners maximize their card benefits by showing which restaurants participate in which programs—on a single, searchable map.

### Creator
Christian Smith ([@cdsmith16](https://github.com/cdsmith16))

### Repository
`git@github.com:cdsmith16/reservemap.git`

---

## Data Sources & Current State

### Collected Data

| Program | Source | Count | Cities | Status |
|---------|--------|-------|--------|--------|
| **Chase Sapphire Reserve** | OpenTable partner pages | 397 restaurants | 51 cities | ✅ Complete, enriched with Place IDs |
| **Amex Global Dining Access** | Resy | 290 restaurants | NYC (starting point) | ✅ Scraped, needs Place ID enrichment |
| **Visa Dining Collection** | OpenTable | ~30 restaurants | NYC | ✅ Scraped |
| **Dorsia** | dorsia.com | TBD | NYC | ✅ Scraped |

### Data Schema (post-enrichment)

```csv
name,cuisine,neighborhood,city,address,website,lat,lon,place_id,google_maps_url
```

### Key Finding: Program Overlap

From analysis, **Don Angie** is the only confirmed restaurant appearing in both Visa Dining Collection AND Amex Global Dining Access in NYC. Most programs are surprisingly non-overlapping—they operate in different ecosystems.

---

## Technical Architecture

### Current Stack (v1 - Shipped)

- **Frontend**: Vite + React + Tailwind CSS
- **Map**: Embedded Google MyMaps iframe
- **Hosting**: Vercel (connected to GitHub repo)
- **Data**: Static CSVs, manually updated

### MyMaps Layer Structure

Google MyMaps limits: 9 layers, 2,000 features/layer, 10,000 features/map total.

**Recommended organization:**

| Layer | Contents |
|-------|----------|
| 1 | Chase Sapphire Reserve (exclusive) |
| 2 | Amex Global Dining Access (exclusive) |
| 3 | Visa Dining Collection (exclusive) |
| 4 | Dorsia (exclusive) |
| 5 | **Multi-Program** (appears on 2+ programs) |
| 6–9 | Reserved for future programs |

### Future Stack Options (v2+)

For better interactivity, consider migrating from embedded MyMaps to:

| Platform | Pros | Cons |
|----------|------|------|
| **Felt** | Beautiful, collaborative, easy embed, free tier | Less programmatic control |
| **Mapbox** | Gorgeous styling, generous free tier, full API | More dev work |
| **Leaflet + custom hosting** | Free, full control, data stays yours | Requires more coding |
| **Google Maps Platform** | Place IDs work natively | Costs $ after free tier |

---

## Data Engineering Pipeline

### Scraping Approach

1. **OpenTable pages** (Chase/Visa): Use `web_fetch` tool or direct HTTP requests. Pages are relatively static HTML.
2. **Resy pages** (Amex): JavaScript-heavy, requires Playwright/Selenium or manual extraction.
3. **Dorsia**: Similar JS rendering challenges.

**Key learning**: The `web_fetch` tool bypasses bot detection that blocks standard `requests.get()` calls.

### Place ID Enrichment Script

A Python script enriches raw restaurant data with Google Places API:

```python
# Core flow:
1. Read CSV with restaurant names + cities
2. For each restaurant:
   - Call Google Places API Text Search
   - Extract: address, lat/lon, place_id, website
3. Output enriched CSV with 0.1s rate limiting
```

**Search query format that works best**: `"{NAME} restaurant in {CITY}"` with neighborhood details when available.

### Deduplication Strategy

Match restaurants across programs using **Place ID**. Same Place ID = same restaurant, regardless of name variations across platforms.

---

## Planned Features (Roadmap)

### Phase 1: MVP (Current)
- [x] Embedded Google MyMaps with all programs
- [x] Simple landing page with tagline
- [x] Vercel deployment

### Phase 2: Interactivity
- [ ] Filter by card/program (toggle layers)
- [ ] Search by location/neighborhood
- [ ] Click-through to reservation platforms
- [ ] Mobile-responsive map controls

### Phase 3: Enhanced Data
- [ ] Expand Amex/Visa/Dorsia beyond NYC
- [ ] Add restaurant metadata (cuisine, price range, rating)
- [ ] Automated data refresh pipeline
- [ ] Collision analysis dashboard ("which restaurants accept multiple cards")

### Phase 4: Monetization (Ideas)
- [ ] Affiliate links to reservation platforms
- [ ] Premium features (saved lists, alerts for new additions)
- [ ] Card comparison tool ("which card gets me the most restaurants in [city]")
- [ ] Sponsored placements

---

## Development Workflow

### Local Development

```bash
cd reservemap
npm install
npm run dev    # Runs on localhost:5173
```

### Deployment

Connected to Vercel via GitHub. Every push to `main` auto-deploys.

### Agentic Development Options

1. **Claude Code**: CLI tool for local repo work. Run `claude` in the repo directory.
2. **Vercel Coding Agent Platform**: Connect GitHub, describe tasks, agent creates PRs.
3. **v0.dev**: Describe UI changes in natural language, generates and deploys.

For complex multi-file changes, use Claude Code or Vercel's Coding Agent. For quick UI iterations, v0.dev is fastest.

---

## Key Learnings & Patterns

1. **JS-rendered pages** require `web_fetch` or browser automation—standard HTTP requests return empty shells.

2. **Rate limiting** (0.1s between API calls) prevents quota issues while maintaining good processing speed.

3. **Place ID is the canonical identifier** for deduplication across platforms with inconsistent naming.

4. **MyMaps layer limits** (9 max) require strategic organization—group by program, not geography.

5. **"Exclusive" programs barely overlap**—the value prop is showing users what's available on THEIR card, not finding rare multi-program restaurants.

---

## Files & Resources

### In Repository

```
reservemap/
├── index.html          # Entry point
├── src/
│   ├── App.jsx         # Main React component
│   ├── main.jsx        # React entry
│   └── index.css       # Tailwind imports
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── public/
    └── favicon.svg     # Map icon
```

### External Resources

- **Live Map**: `https://www.google.com/maps/d/embed?mid=1gKXH8gQj2dczP9wmntuCPwwFNGDnFOQ`
- **Google Places API**: For enrichment scripts
- **Data CSVs**: Stored locally, imported to MyMaps

### Architecture

| Component | Where | Why |
|--|--|--|
| Frontend | Vercel | Best DX, free, auto-deploys, Claude/v0 integration |
| Data pipeline | GCP (Colab → Cloud Functions) | Already there, keep it |
| Scheduled scraping | GCP Cloud Scheduler + Cloud Functions | Native cron, triggers your existing scripts |
| Data storage | GCP Cloud Storage or Firestore | Central source of truth |
| API layer (if needed later) | GCP Cloud Run | Serves fresh data to frontend |

---

## Context for AI Agents

When working on this project:

1. **The core value prop** is visualizing credit card dining benefits that have no native map view.

2. **Data quality matters**—always enrich with Place IDs before importing to maps. However, place ID's and other GUIDs should not be sent to MyMaps or exposed to users.

3. **The user (Christian)** has experience with Python, Google Cloud, and data engineering. He can run scripts locally.

4. **Current pain point**: MyMaps embedding is limited. A more interactive solution (Felt, Mapbox, Leaflet) would improve UX.

5. **This is a side project** with potential to become a public tool. Balance quick wins with sustainable architecture.

---

## Contact & Contribution

This is a personal project by Christian Smith. For questions or contributions, open an issue on the GitHub repo.
