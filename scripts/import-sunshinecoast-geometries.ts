/**
 * One-time script: imports Sunshine Coast zone geometries from GeoJSON into Supabase PostGIS.
 *
 * Prerequisites:
 *   - goldcoast-schema.sql already run (council column + composite PK exist)
 *   - data/sunshinecoast-zones.geojson populated (run: npm run download-sunshinecoast-zones)
 *   - DATABASE_URL in .env.local
 *
 * Run with: npm run import-sunshinecoast-geometries
 *
 * Does NOT truncate — Brisbane, Gold Coast, and Moreton Bay rows must stay.
 * Deletes existing sunshinecoast rows first, then inserts fresh.
 * Zone code field: LABEL (full English strings ending in "Zone", e.g. "Low Density Residential Zone")
 * Coordinates: WGS84 (EPSG:4326) — ArcGIS f=geojson auto-converts. No ST_Transform needed.
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

const GEOJSON_PATH = path.join(process.cwd(), 'data', 'sunshinecoast-zones.geojson')
const BATCH_SIZE = 100
const ZONE_CODE_KEY = 'LABEL'

interface GeoJSONFeature {
  type: string
  geometry: {
    type: string
    coordinates: unknown
  } | null
  properties: Record<string, unknown> | null
}

async function main() {
  console.log('=== ZoneIQ: Import Sunshine Coast Geometries to PostGIS ===')

  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error(`GeoJSON not found at ${GEOJSON_PATH}`)
    console.error('Run: npm run download-sunshinecoast-zones')
    process.exit(1)
  }

  console.log('Reading GeoJSON...')
  const raw = fs.readFileSync(GEOJSON_PATH, 'utf-8')
  const geojson = JSON.parse(raw) as { features: GeoJSONFeature[] }
  const total = geojson.features.length
  console.log(`Loaded ${total} features (${(raw.length / 1024 / 1024).toFixed(1)} MB)`)

  const sql = postgres(DATABASE_URL!, { ssl: 'require' })

  try {
    console.log('Deleting existing sunshinecoast rows...')
    const [{ count: existingCount }] = await sql`SELECT COUNT(*)::int AS count FROM zone_geometries WHERE council = 'sunshinecoast'`
    await sql`DELETE FROM zone_geometries WHERE council = 'sunshinecoast'`
    console.log(`  Deleted ${existingCount ?? 0} existing sunshinecoast rows`)

    let inserted = 0
    let skipped = 0

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = geojson.features.slice(i, i + BATCH_SIZE)

      for (const feature of batch) {
        if (!feature.geometry) { skipped++; continue }

        const zoneCode = feature.properties?.[ZONE_CODE_KEY]
        if (!zoneCode) { skipped++; continue }

        const geomType = feature.geometry.type
        if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

        await sql`
          INSERT INTO zone_geometries (zone_code, council, geometry)
          VALUES (
            ${String(zoneCode)},
            'sunshinecoast',
            ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}))::geometry(MultiPolygon, 4326)
          )
        `
        inserted++
      }

      if ((i + BATCH_SIZE) % 1000 < BATCH_SIZE || i + BATCH_SIZE >= total) {
        console.log(`  ${Math.min(i + BATCH_SIZE, total)} / ${total} processed (${inserted} inserted, ${skipped} skipped)`)
      }
    }

    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`)

    const [{ brisbane_count }] = await sql`SELECT COUNT(*)::int AS brisbane_count FROM zone_geometries WHERE council = 'brisbane'`
    const [{ goldcoast_count }] = await sql`SELECT COUNT(*)::int AS goldcoast_count FROM zone_geometries WHERE council = 'goldcoast'`
    const [{ moretonbay_count }] = await sql`SELECT COUNT(*)::int AS moretonbay_count FROM zone_geometries WHERE council = 'moretonbay'`
    const [{ sunshinecoast_count }] = await sql`SELECT COUNT(*)::int AS sunshinecoast_count FROM zone_geometries WHERE council = 'sunshinecoast'`
    console.log(`Rows in zone_geometries: brisbane=${brisbane_count}, goldcoast=${goldcoast_count}, moretonbay=${moretonbay_count}, sunshinecoast=${sunshinecoast_count}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
