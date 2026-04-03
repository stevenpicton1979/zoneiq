/**
 * One-time script: imports Brisbane zone geometries from GeoJSON into Supabase PostGIS.
 *
 * Prerequisites:
 *   - PostGIS extension enabled in Supabase
 *   - zone_geometries table created (see supabase/spatial-schema.sql)
 *   - data/brisbane-zones.geojson populated (run: npm run download-zones)
 *   - DATABASE_URL in .env.local
 *
 * Run with: npm run import-geometries
 *
 * This will take several minutes for ~26,000 features.
 * Safe to re-run — truncates the table first.
 */

import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

// Load .env.local
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
} catch { /* ignore */ }

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local')
  console.error('Get it from: Supabase Dashboard → Settings → Database → Connection string → URI')
  process.exit(1)
}

const GEOJSON_PATH = path.join(process.cwd(), 'data', 'brisbane-zones.geojson')
const BATCH_SIZE = 100
const ZONE_CODE_KEYS = ['zone_code', 'ZONE_CODE', 'ZoneCode', 'zone', 'Zone', 'ZONE']

interface GeoJSONFeature {
  type: string
  geometry: {
    type: string
    coordinates: unknown
  } | null
  properties: Record<string, unknown> | null
}

function extractZoneCode(props: Record<string, unknown> | null): string | null {
  if (!props) return null
  for (const key of ZONE_CODE_KEYS) {
    if (props[key] != null) return String(props[key])
  }
  return null
}

async function main() {
  console.log('=== ZoneIQ: Import Geometries to PostGIS ===')

  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error(`GeoJSON not found at ${GEOJSON_PATH}`)
    console.error('Run: npm run download-zones')
    process.exit(1)
  }

  console.log('Reading GeoJSON...')
  const raw = fs.readFileSync(GEOJSON_PATH, 'utf-8')
  const geojson = JSON.parse(raw) as { features: GeoJSONFeature[] }
  const total = geojson.features.length
  console.log(`Loaded ${total} features (${(raw.length / 1024 / 1024).toFixed(1)} MB)`)

  const sql = postgres(DATABASE_URL!, { ssl: 'require' })

  try {
    console.log('Truncating zone_geometries...')
    await sql`TRUNCATE TABLE zone_geometries RESTART IDENTITY`

    let inserted = 0
    let skipped = 0

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = geojson.features.slice(i, i + BATCH_SIZE)
      const rows: { zone_code: string; geometry_json: string }[] = []

      for (const feature of batch) {
        if (!feature.geometry) { skipped++; continue }

        const zoneCode = extractZoneCode(feature.properties)
        if (!zoneCode) { skipped++; continue }

        const geomType = feature.geometry.type
        if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

        rows.push({
          zone_code: zoneCode,
          geometry_json: JSON.stringify(feature.geometry),
        })
      }

      if (rows.length > 0) {
        // ST_Multi wraps Polygon → MultiPolygon; is a no-op for MultiPolygon
        await sql`
          INSERT INTO zone_geometries (zone_code, geometry)
          SELECT
            r.zone_code,
            ST_Multi(ST_GeomFromGeoJSON(r.geometry_json))::geometry(MultiPolygon, 4326)
          FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
            AS r(zone_code text, geometry_json text)
        `
        inserted += rows.length
      }

      if ((i + BATCH_SIZE) % 1000 < BATCH_SIZE || i + BATCH_SIZE >= total) {
        console.log(`  ${Math.min(i + BATCH_SIZE, total)} / ${total} processed (${inserted} inserted, ${skipped} skipped)`)
      }
    }

    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`)

    // Verify
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM zone_geometries`
    console.log(`Rows in zone_geometries: ${count}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
