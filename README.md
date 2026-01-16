# ReserveMap

> "Some reservations websites have no map view, making it hard to plan and take advantage of credit card dining benefits. So I made one."

A unified visualization of premium restaurant collections from multiple credit card and reservation platforms.

## Live Site

**https://reservemap.vercel.app/**

## Overview

ReserveMap helps diners maximize their credit card benefits by showing which restaurants participate in which programs—on a single, searchable map. It aggregates data from:

- Chase Sapphire Reserve (OpenTable)
- Amex Global Dining Access (Resy)
- Visa Dining Collection (OpenTable)
- Dorsia

## Tech Stack

- **Frontend**: Vite + React + Tailwind CSS
- **Map**: Google MyMaps
- **Hosting**: Vercel
- **Data**: Static CSVs with Google Places API enrichment

## Local Development

```bash
npm install
npm run dev    # Runs on localhost:5173
```

## Creator

Christian Smith ([@cdsmith16](https://github.com/cdsmith16))

## Documentation

See [ReserveMap_SPEC.md](ReserveMap_SPEC.md) for full project specification, data sources, and architecture details.
