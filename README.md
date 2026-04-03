# ZoneIQ

ZoneIQ answers one question fast: **"What can I build at this address in Brisbane?"**
Input a Brisbane street address, get back zone name, development rules, and permitted uses — structured JSON.

---

## API Endpoint

### `GET /api/lookup`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Brisbane street address |
| `format` | `json` \| `simple` | No | Response format (default: `json`) |

#### Success (200)

```json
{
  "success": true,
  "query": {
    "address_input": "42 Latrobe Tce, Paddington QLD",
    "address_resolved": "42 Latrobe Terrace, Paddington QLD 4064, Australia",
    "lat": -27.4612,
    "lng": 153.0089
  },
  "zone": {
    "code": "CR",
    "name": "Character Residential",
    "category": "residential"
  },
  "rules": {
    "max_height_m": 9.5,
    "max_storeys": 2,
    "max_site_coverage_pct": 50,
    "min_permeability_pct": 20,
    "setbacks": { "front_m": 6.0, "side_m": 1.5, "rear_m": 6.0 },
    "secondary_dwelling_permitted": "permit_required",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 600
  },
  "key_rules": [
    "Maximum building height 9.5m or 2 storeys",
    "Character of the existing streetscape must be maintained",
    "..."
  ],
  "uses": {
    "permitted": ["Dwelling house", "Home-based business"],
    "requires_permit": ["Dual occupancy", "Secondary dwelling", "Short-term accommodation"],
    "prohibited": ["Multiple dwelling (3+ units)", "Industry", "Warehouse"]
  },
  "meta": {
    "source": "Brisbane City Plan 2014",
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01",
    "disclaimer": "Indicative only...",
    "response_ms": 142
  }
}
```

#### Errors

| `error` code | HTTP | Meaning |
|---|---|---|
| `MISSING_ADDRESS` | 400 | `?address=` not provided |
| `ADDRESS_NOT_FOUND` | 404 | Nominatim could not geocode the address |
| `OUTSIDE_COVERAGE` | 404 | Address is outside Brisbane LGA |
| `ZONE_NOT_SEEDED` | 404 | Zone polygon found but no rules in DB yet |

---

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Create Supabase tables

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

### 3. Download Brisbane zones GeoJSON

```bash
npx tsx scripts/download-zones.ts
```

This fetches the BCC City Plan 2014 Zoning layer from the ArcGIS REST API (paginated) and saves it to `data/brisbane-zones.geojson`. The script logs the first feature's property keys — check these match what `lib/zone-lookup.ts` expects (see DECISIONS.md D04).

### 4. Seed zone rules

```bash
npx tsx scripts/seed-rules.ts
```

Upserts 8 zones from `data/zone-rules-seed.json` into Supabase.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the test UI, or call the API directly:

```bash
curl "http://localhost:3000/api/lookup?address=12+Windermere+Rd+Ascot+QLD+4007"
```

---

## Example curl

```bash
curl "https://your-app.vercel.app/api/lookup?address=100+Melbourne+St+South+Brisbane+QLD+4101"
```

---

## Deploy to Vercel

```bash
vercel deploy
```

Add the three environment variables in the Vercel project settings. The `data/brisbane-zones.geojson` file must be committed to the repo so it is bundled with the serverless function.

---

## Data Sources

- **Zone polygons:** [Brisbane City Council ArcGIS REST API](https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Zoning/FeatureServer) — publicly accessible
- **Zone rules:** [Brisbane City Plan 2014](https://cityplan.brisbane.qld.gov.au) — manually verified
- **Geocoding:** [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) — no API key required

**Disclaimer:** ZoneIQ is indicative only. Zone rules may be affected by overlays, neighbourhood plans, or recent amendments not reflected here. Always verify with Brisbane City Council before making development decisions.

---

## Coming Soon

- Overlay detection (flood, character, heritage, bushfire)
- Gold Coast City Plan coverage
- Moreton Bay Regional Council coverage
- Authenticated API keys + usage metering
