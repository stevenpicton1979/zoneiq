# ZoneIQ — Brisbane Planning Zone API
## Sprint 0: Working API + Test UI

---

## What This Is
ZoneIQ is a developer API that answers one question fast:
"What can I build at this address in Brisbane?"

Input: a Brisbane street address
Output: zone name, development rules, permitted uses — structured JSON

This is not a chat product. It is a data API with a test UI.
Target customers: AI agents, PropTech apps, mortgage brokers, architects, developers.

---

## Stack
- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres, free tier)
- @turf/boolean-point-in-polygon (spatial lookup)
- Vercel (deployment)
- No auth in Sprint 0
- No payments in Sprint 0

---

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Project Structure
```
/
├── app/
│   ├── page.tsx                  # Test UI
│   └── api/
│       └── lookup/
│           └── route.ts          # Main API endpoint
├── lib/
│   ├── geocode.ts                # Address → lat/lng
│   ├── zone-lookup.ts            # lat/lng → zone code
│   └── supabase.ts               # DB client
├── data/
│   └── brisbane-zones.geojson    # Downloaded from BCC open data
├── scripts/
│   ├── download-zones.ts         # One-time: fetch GeoJSON from BCC
│   └── seed-rules.ts             # One-time: seed zone rules into Supabase
├── supabase/
│   └── schema.sql                # DB schema
└── DECISIONS.md
```

---

## Database Schema

```sql
-- Zone rules table
create table zone_rules (
  zone_code text primary key,
  zone_name text not null,
  zone_category text not null,              -- 'residential' | 'commercial' | 'industrial' | 'mixed'
  max_height_m numeric,
  max_storeys integer,
  max_site_coverage_pct integer,
  min_permeability_pct integer,
  front_setback_m numeric,
  side_setback_m numeric,
  rear_setback_m numeric,
  secondary_dwelling_permitted text,        -- 'yes' | 'permit_required' | 'no'
  short_term_accom_permitted text,          -- 'yes' | 'permit_required' | 'no'
  home_business_permitted text,             -- 'yes' | 'permit_required' | 'no'
  subdivision_min_lot_size_m2 integer,
  key_rules text[] not null default '{}',   -- plain-English rule strings, array
  permitted_uses text[] not null default '{}',
  requires_permit_uses text[] not null default '{}',
  prohibited_uses text[] not null default '{}',
  source_url text,
  last_verified date,
  notes text
);

-- Query log (for analytics, understanding demand)
create table lookup_log (
  id uuid primary key default gen_random_uuid(),
  address_input text,
  lat numeric,
  lng numeric,
  zone_code text,
  created_at timestamptz default now(),
  user_agent text,
  origin text
);
```

---

## Data Setup Scripts

### scripts/download-zones.ts
- Fetch the BCC City Plan 2014 Zoning overlay GeoJSON from:
  `https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Zoning/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson`
  (BCC ArcGIS REST endpoint — publicly accessible)
- If that URL fails, fall back to downloading from:
  `https://data.brisbane.qld.gov.au/explore/dataset/cp14-zoning-overlay/download/?format=geojson`
- Save to /data/brisbane-zones.geojson
- Log how many features were downloaded

### scripts/seed-rules.ts
- Read zone rules from /data/zone-rules-seed.json (see seed data below)
- Upsert all records into the zone_rules table
- Log success/failure per zone

---

## Zone Rules Seed Data

Seed the following zones with accurate values from Brisbane City Plan 2014.
Save as /data/zone-rules-seed.json and use in the seed script.

Use these verified values:

```json
[
  {
    "zone_code": "LDR",
    "zone_name": "Low Density Residential",
    "zone_category": "residential",
    "max_height_m": 9.5,
    "max_storeys": 2,
    "max_site_coverage_pct": 50,
    "min_permeability_pct": 20,
    "front_setback_m": 6.0,
    "side_setback_m": 1.5,
    "rear_setback_m": 6.0,
    "secondary_dwelling_permitted": "permit_required",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 600,
    "key_rules": [
      "Maximum building height 9.5m or 2 storeys",
      "Site coverage must not exceed 50% of the lot area",
      "Minimum 20% of site must remain permeable (not paved/built)",
      "Secondary dwelling (granny flat) requires a development permit",
      "Short-term accommodation (Airbnb) requires a development permit",
      "Minimum lot size for subdivision is 600m²",
      "Front setback 6m from street boundary"
    ],
    "permitted_uses": ["Dwelling house", "Home-based business", "Community residence"],
    "requires_permit_uses": ["Dual occupancy", "Secondary dwelling", "Short-term accommodation", "Child care centre", "Place of worship"],
    "prohibited_uses": ["Industry", "Warehouse", "Shopping centre", "Nightclub"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "LMDR",
    "zone_name": "Low-Medium Density Residential",
    "zone_category": "residential",
    "max_height_m": 15.5,
    "max_storeys": 4,
    "max_site_coverage_pct": 60,
    "min_permeability_pct": 15,
    "front_setback_m": 6.0,
    "side_setback_m": 1.5,
    "rear_setback_m": 6.0,
    "secondary_dwelling_permitted": "yes",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 400,
    "key_rules": [
      "Maximum building height 15.5m or 4 storeys",
      "Site coverage must not exceed 60% of the lot area",
      "Secondary dwelling permitted without a permit in most circumstances",
      "Multiple dwellings (units/apartments) are a permitted use",
      "Minimum lot size for subdivision is 400m²",
      "Short-term accommodation requires a development permit"
    ],
    "permitted_uses": ["Dwelling house", "Dual occupancy", "Multiple dwelling", "Secondary dwelling", "Home-based business"],
    "requires_permit_uses": ["Short-term accommodation", "Rooming accommodation", "Child care centre"],
    "prohibited_uses": ["Industry", "Warehouse", "Shopping centre"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "MDR",
    "zone_name": "Medium Density Residential",
    "zone_category": "residential",
    "max_height_m": 21.0,
    "max_storeys": 5,
    "max_site_coverage_pct": 70,
    "min_permeability_pct": 10,
    "front_setback_m": 6.0,
    "side_setback_m": 2.0,
    "rear_setback_m": 6.0,
    "secondary_dwelling_permitted": "yes",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 300,
    "key_rules": [
      "Maximum building height 21m or 5 storeys",
      "Site coverage must not exceed 70%",
      "Multiple dwellings and apartments are a permitted use",
      "Higher density residential development is encouraged",
      "Minimum lot size for subdivision is 300m²"
    ],
    "permitted_uses": ["Dwelling house", "Dual occupancy", "Multiple dwelling", "Secondary dwelling", "Rooming accommodation"],
    "requires_permit_uses": ["Short-term accommodation", "Child care centre", "Shop (small scale)"],
    "prohibited_uses": ["Industry", "Warehouse", "Large format retail"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "HDR",
    "zone_name": "High Density Residential",
    "zone_category": "residential",
    "max_height_m": null,
    "max_storeys": null,
    "max_site_coverage_pct": 80,
    "min_permeability_pct": 5,
    "front_setback_m": 6.0,
    "side_setback_m": 3.0,
    "rear_setback_m": 6.0,
    "secondary_dwelling_permitted": "yes",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 200,
    "key_rules": [
      "No prescribed maximum height — height determined by neighbourhood plan or assessment",
      "High-rise residential development is a permitted use",
      "Ground floor activation encouraged in key locations",
      "Short-term accommodation requires a development permit",
      "Site coverage up to 80%"
    ],
    "permitted_uses": ["Multiple dwelling", "Dual occupancy", "Secondary dwelling", "Rooming accommodation", "Short-term accommodation (some areas)"],
    "requires_permit_uses": ["Shop", "Food and drink outlet", "Short-term accommodation (most areas)"],
    "prohibited_uses": ["Industry", "Warehouse", "Rural activities"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "CR",
    "zone_name": "Character Residential",
    "zone_category": "residential",
    "max_height_m": 9.5,
    "max_storeys": 2,
    "max_site_coverage_pct": 50,
    "min_permeability_pct": 20,
    "front_setback_m": 6.0,
    "side_setback_m": 1.5,
    "rear_setback_m": 6.0,
    "secondary_dwelling_permitted": "permit_required",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 600,
    "key_rules": [
      "Maximum building height 9.5m or 2 storeys",
      "Character of the existing streetscape must be maintained",
      "Demolition of pre-1947 dwellings triggers character assessment",
      "Renovation and extension preferred over demolition",
      "Front façade and verandah character elements must be retained",
      "Secondary dwelling requires a development permit",
      "Site coverage must not exceed 50%"
    ],
    "permitted_uses": ["Dwelling house", "Home-based business"],
    "requires_permit_uses": ["Dual occupancy", "Secondary dwelling", "Demolition of pre-1947 dwelling", "Short-term accommodation"],
    "prohibited_uses": ["Multiple dwelling (3+ units)", "Industry", "Warehouse"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "MU1",
    "zone_name": "Mixed Use",
    "zone_category": "mixed",
    "max_height_m": null,
    "max_storeys": null,
    "max_site_coverage_pct": 80,
    "min_permeability_pct": 5,
    "front_setback_m": 0.0,
    "side_setback_m": 0.0,
    "rear_setback_m": 3.0,
    "secondary_dwelling_permitted": "yes",
    "short_term_accom_permitted": "yes",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": null,
    "key_rules": [
      "Mixed residential and commercial uses are encouraged",
      "Ground floor commercial activation strongly encouraged on key streets",
      "Short-term accommodation (Airbnb) is a permitted use",
      "No maximum height — determined by neighbourhood plan",
      "Buildings should address the street with active frontages"
    ],
    "permitted_uses": ["Multiple dwelling", "Shop", "Food and drink outlet", "Office", "Short-term accommodation", "Hotel"],
    "requires_permit_uses": ["Industry (light)", "Nightclub", "Large format retail"],
    "prohibited_uses": ["Heavy industry", "Extractive industry", "Rural activities"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "NCR",
    "zone_name": "Neighbourhood Centre",
    "zone_category": "commercial",
    "max_height_m": 15.5,
    "max_storeys": 4,
    "max_site_coverage_pct": 80,
    "min_permeability_pct": 5,
    "front_setback_m": 0.0,
    "side_setback_m": 0.0,
    "rear_setback_m": 3.0,
    "secondary_dwelling_permitted": "yes",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": null,
    "key_rules": [
      "Local-serving retail and services are the primary use",
      "Residential above ground floor is encouraged",
      "Maximum 4 storeys / 15.5m",
      "Active ground floor frontages required on primary street"
    ],
    "permitted_uses": ["Shop", "Food and drink outlet", "Office", "Multiple dwelling (upper floors)", "Health care services"],
    "requires_permit_uses": ["Short-term accommodation", "Service station", "Childcare centre"],
    "prohibited_uses": ["Heavy industry", "Warehouse (large)", "Drive-through facilities (some areas)"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  },
  {
    "zone_code": "IND1",
    "zone_name": "Low Impact Industry",
    "zone_category": "industrial",
    "max_height_m": 15.0,
    "max_storeys": null,
    "max_site_coverage_pct": 70,
    "min_permeability_pct": 10,
    "front_setback_m": 6.0,
    "side_setback_m": 3.0,
    "rear_setback_m": 3.0,
    "secondary_dwelling_permitted": "no",
    "short_term_accom_permitted": "no",
    "home_business_permitted": "no",
    "subdivision_min_lot_size_m2": null,
    "key_rules": [
      "Low impact industrial uses are the primary permitted use",
      "Residential uses are generally not permitted",
      "Office uses are limited to those ancillary to industry",
      "Showrooms and trade supply permitted",
      "No sensitive uses (childcare, schools, residences)"
    ],
    "permitted_uses": ["Low impact industry", "Warehouse", "Office (ancillary)", "Trade supply", "Showroom"],
    "requires_permit_uses": ["Food and drink outlet", "Shop (small ancillary)", "Service station"],
    "prohibited_uses": ["Dwelling house", "Multiple dwelling", "High impact industry", "Extractive industry"],
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01"
  }
]
```

---

## API Endpoint

### GET /api/lookup

**Query params:** `address` (required), `format` (optional: `json` | `simple`, default `json`)

**Success response (200):**
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
    "setbacks": {
      "front_m": 6.0,
      "side_m": 1.5,
      "rear_m": 6.0
    },
    "secondary_dwelling_permitted": "permit_required",
    "short_term_accom_permitted": "permit_required",
    "home_business_permitted": "yes",
    "subdivision_min_lot_size_m2": 600
  },
  "key_rules": [
    "Maximum building height 9.5m or 2 storeys",
    "Character of the existing streetscape must be maintained",
    "Demolition of pre-1947 dwellings triggers character assessment",
    "Secondary dwelling requires a development permit",
    "Site coverage must not exceed 50%"
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
    "disclaimer": "Indicative only. Rules may be affected by overlays, neighbourhood plans, or recent amendments not reflected here. Always verify with Brisbane City Council before making development decisions.",
    "response_ms": 142
  }
}
```

**Error responses:**
```json
// Address not found
{ "success": false, "error": "ADDRESS_NOT_FOUND", "message": "Could not geocode address. Try including suburb and state." }

// Outside Brisbane
{ "success": false, "error": "OUTSIDE_COVERAGE", "message": "Address is outside Brisbane City Council boundary. Coverage is currently Brisbane only." }

// Zone not in database
{ "success": false, "error": "ZONE_NOT_SEEDED", "message": "Zone found but rules not yet available.", "zone_code": "SP" }
```

**Log every request** to the lookup_log table (non-blocking — don't let logging failure affect the response).

---

## Geocoding

Use Nominatim (OpenStreetMap) — free, no API key:
```
https://nominatim.openstreetmap.org/search?q=ENCODED_ADDRESS&format=json&limit=1&countrycodes=au
```

Add a `User-Agent` header: `ZoneIQ/0.1 (zoneiq.com.au)`

If Nominatim returns no results, return ADDRESS_NOT_FOUND error.

---

## Spatial Lookup (Zone from lat/lng)

```typescript
import * as turf from '@turf/turf'
import zonesGeoJSON from '@/data/brisbane-zones.geojson'

export function getZoneForPoint(lat: number, lng: number): string | null {
  const point = turf.point([lng, lat])
  for (const feature of zonesGeoJSON.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature.properties.zone_code // verify actual property name after download
    }
  }
  return null
}
```

Check what the actual property name for zone code is in the downloaded GeoJSON
and adjust accordingly. Log the first feature's properties during setup.

---

## Test UI (app/page.tsx)

Design direction: **clean, professional, data-first**. Think API documentation meets property tool.
Not a consumer app. Feels like a tool developers would trust.

Layout:
- Header: "ZoneIQ" wordmark (top left) + tagline "Brisbane Planning Zone API" (muted)
- Centered search: large address input + "Lookup" button
- Results panel below — appears after query:
  - Zone name displayed large and prominently (coloured badge by category)
  - Key rules as a clean bulleted list
  - Two columns: "Permitted Uses" | "Requires Permit" | "Prohibited"
  - Raw JSON toggle (show/hide the full API response)
  - Response time shown
- Footer: disclaimer text + link to City Plan

Show 3 example addresses as clickable chips below the input:
- "12 Windermere Rd, Ascot QLD 4007"
- "100 Melbourne St, South Brisbane QLD 4101"
- "5 James St, Fortitude Valley QLD 4006"

---

## Commit Strategy
1. Project scaffold + Supabase client setup
2. Zone GeoJSON downloaded + spatial lookup working (test script)
3. DB schema created + seed data loaded
4. /api/lookup endpoint complete + tested
5. Test UI complete
6. README.md written (explains the API, setup, endpoints)
7. Final cleanup + Vercel deploy

---

## README.md (generate this last)
Include:
- What ZoneIQ is (2 sentences)
- API endpoint documentation
- Setup instructions (env vars, seed scripts)
- Example curl request + response
- Data sources and disclaimer
- "Coming soon: overlays, Gold Coast, Moreton Bay"

---

## DECISIONS.md
Log every ambiguity decision here. Do not ask — decide and document.
