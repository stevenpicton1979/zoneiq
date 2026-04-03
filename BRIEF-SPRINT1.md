# ZoneIQ — Sprint 1 Brief
## Migrate spatial lookup from in-process GeoJSON to Supabase PostGIS

---

## Problem
The current implementation loads brisbane-zones.geojson (50MB, 26,360 features)
into memory and loops through every polygon for each request.

On Vercel serverless functions this times out — the CPU limit is hit before
the point-in-polygon loop completes, causing all lookups to return OUTSIDE_COVERAGE.

Locally it works fine because there is no CPU time limit.

---

## Solution
Move the spatial lookup to Supabase using PostGIS.

Instead of looping 26,000 polygons in Node.js, run one PostGIS query:
```sql
SELECT zone_code
FROM zone_geometries
WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint($lng, $lat), 4326))
LIMIT 1;
```

This is fast (milliseconds), scalable, and the correct architecture for this problem.

---

## What to build

### 1. Enable PostGIS on Supabase
PostGIS is available as an extension on Supabase. Enable it with:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
Run this in the Supabase SQL editor.

### 2. Create zone_geometries table
```sql
CREATE TABLE zone_geometries (
  id bigserial PRIMARY KEY,
  zone_code text NOT NULL,
  geometry geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX zone_geometries_geometry_idx
  ON zone_geometries USING GIST (geometry);
```

Note: Use MultiPolygon to handle both Polygon and MultiPolygon features from the GeoJSON.
Convert all Polygon features to MultiPolygon on import for consistency.

### 3. Create import script: scripts/import-geometries.ts
This script reads data/brisbane-zones.geojson and imports all features into
the zone_geometries table.

Requirements:
- Use SUPABASE_SERVICE_ROLE_KEY (service client, not anon)
- Process in batches of 100 features to avoid memory issues
- For each feature:
  - Extract zone_code from properties.zone_code
  - Convert geometry to WKT (Well Known Text) format for insertion
  - If geometry type is 'Polygon', wrap it in a MultiPolygon
  - If geometry type is 'MultiPolygon', use as-is
  - Skip features with null/missing geometry or zone_code
- Use Supabase RPC or raw SQL via the REST API to insert with geometry
- Log progress every 1000 features
- Log total inserted and any skipped at the end

For geometry insertion, use the PostGIS ST_GeomFromGeoJSON function.
Insert using this pattern:
```sql
INSERT INTO zone_geometries (zone_code, geometry)
VALUES ($1, ST_Multi(ST_GeomFromGeoJSON($2)))
```

Where $2 is the JSON.stringify of the feature's geometry object.

Use the Supabase REST API with a raw SQL approach via rpc, or use
the pg library directly with the DATABASE_URL connection string.

The simplest approach: use the `postgres` npm package with the Supabase
DATABASE_URL (available in Supabase Settings → Database → Connection string → URI).
Add DATABASE_URL to .env.local.

```typescript
import postgres from 'postgres'
const sql = postgres(process.env.DATABASE_URL!)
```

### 4. Update lib/zone-lookup.ts
Replace the entire file with a PostGIS-based lookup:

```typescript
import { createServiceClient } from '@/lib/supabase'

export async function getZoneForPoint(lat: number, lng: number): Promise<string | null> {
  const db = createServiceClient()
  
  const { data, error } = await db
    .rpc('get_zone_for_point', { lat, lng })
  
  if (error || !data) return null
  return data as string
}
```

### 5. Create Supabase RPC function
Create this function in Supabase SQL editor:

```sql
CREATE OR REPLACE FUNCTION get_zone_for_point(lat float, lng float)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT zone_code
  FROM zone_geometries
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  LIMIT 1;
$$;
```

### 6. Update app/api/lookup/route.ts
- Change getZoneForPoint call to await it (it's now async)
- Remove isWithinBrisbaneBounds import entirely
- The rest of the file stays the same

### 7. Update lib/zone-lookup.ts
- Remove all fs/path/turf imports
- Remove loadZones, extractZoneCode, isWithinBrisbaneBounds functions
- Remove ZONE_CODE_KEYS, BRISBANE_BOUNDS constants
- Keep only the async getZoneForPoint function using Supabase RPC

### 8. Remove debug endpoint
Delete app/api/debug/route.ts — it was temporary.

### 9. Update package.json scripts
Add the import script:
```json
"import-geometries": "npx ts-node --project tsconfig.json -e \"require('./scripts/import-geometries.ts')\""
```

Or use tsx:
```json
"import-geometries": "npx tsx scripts/import-geometries.ts"
```

Use whichever approach is consistent with how seed-rules.ts is run.

---

## Environment Variables needed
Add to .env.local:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Get this from: Supabase Dashboard → Settings → Database → Connection string → URI

---

## New npm packages needed
```bash
npm install postgres
npm install --save-dev @types/node
```

---

## Execution order (document in DECISIONS.md)
1. Enable PostGIS extension in Supabase SQL editor
2. Create zone_geometries table and index in Supabase SQL editor  
3. Create get_zone_for_point RPC function in Supabase SQL editor
4. Run: npm run import-geometries (this will take a few minutes — 26,360 features)
5. Test the RPC function directly in Supabase SQL editor:
   ```sql
   SELECT get_zone_for_point(-27.4612, 153.0089);
   ```
   Should return 'LDR' or similar.
6. Update zone-lookup.ts
7. Update route.ts
8. Test locally: npm run dev
9. Test: curl "http://localhost:3000/api/lookup?address=6+Glenheaton+Court+Carindale+Brisbane+4152"
10. If working locally, commit and push

---

## Success criteria
These addresses must all return valid zone data (not OUTSIDE_COVERAGE):
- 6 Glenheaton Court, Carindale Brisbane 4152 → LDR
- 1 Queen St Brisbane QLD 4000 → PC
- 100 Ann St Fortitude Valley QLD 4006 → should return a zone
- 50 Logan Rd Woolloongabba QLD 4102 → should return a zone
- 99 Latrobe Tce Paddington QLD 4064 → CR or LDR

---

## Do not change
- The API response format (stays identical)
- The zone_rules table or seed data
- The geocoding logic in lib/geocode.ts
- The test UI in app/page.tsx
- The lookup_log table or logging logic
- Authentication or CORS headers

---

## Commit strategy
1. Add import-geometries script + postgres package
2. PostGIS table + RPC created (document SQL in supabase/spatial-schema.sql)
3. Import complete — log output in DECISIONS.md
4. Updated zone-lookup.ts (PostGIS version)
5. Updated route.ts (async getZoneForPoint)
6. Remove debug route, cleanup
7. Final test + deploy

---

## DECISIONS.md
Log all decisions, especially:
- Which postgres client approach worked for bulk import
- How long the import took
- Any features skipped and why
- RPC function performance (note query time from Supabase logs)
