/**
 * One-time script: imports Queensland State Heritage Register + BCC Local Heritage overlays
 * directly from ArcGIS APIs into Supabase PostGIS.
 *
 * Prerequisites:
 *   - sprint9-schema.sql run in Supabase (creates heritage_overlays table + RPC)
 *   - DATABASE_URL in .env.local
 *
 * Run with: npm run import-heritage-overlays
 *
 * Pass --test to import only the first page of each dataset.
 *
 * Data sources (no authentication required):
 *
 *   STATE HERITAGE — Queensland Heritage Council / DETSI
 *   https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/AdminBoundariesFramework/FeatureServer/78
 *   ~1,800 features, fields: placename, place_id, status
 *   WGS84 (outSR=4326), Polygon geometry — no ST_Transform needed.
 *   License: Creative Commons Attribution 4.0
 *
 *   BCC LOCAL HERITAGE — Brisbane City Council City Plan 2014
 *   https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Hertiage_overlay_Local_heritage_area/FeatureServer/0
 *   ~1,857 features, fields: OVL2_DESC, OVL2_CAT
 *   WGS84, Polygon geometry — no ST_Transform needed.
 *   No individual place names — overlay zone polygons only.
 *   License: Creative Commons Attribution 4.0
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
  process.exit(1)
}

const TEST_MODE = process.argv.includes('--test')
const PAGE_SIZE = 2000
const MAX_RETRIES = 3

interface GeoJSONFeature {
  type: string
  geometry: { type: string; coordinates: unknown } | null
  properties: Record<string, unknown> | null
}

async function fetchPage(url: string): Promise<GeoJSONFeature[] | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
      })
      if (res.status === 504 || res.status === 503 || res.status === 502) {
        console.log(`  HTTP ${res.status} — attempt ${attempt}/${MAX_RETRIES}, retrying in 5s...`)
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      if (!res.ok) {
        console.log(`  HTTP ${res.status} — giving up`)
        return null
      }
      const data = await res.json() as { features?: GeoJSONFeature[] }
      return data.features ?? []
    } catch (err) {
      console.log(`  Network error (attempt ${attempt}): ${err}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function importDataset(
  sql: ReturnType<typeof postgres>,
  label: string,
  urlFn: (offset: number) => string,
  mapFeature: (f: GeoJSONFeature) => {
    heritage_type: string
    heritage_name: string
    place_id: string | null
    council: string | null
  } | null
): Promise<{ inserted: number; skipped: number }> {
  console.log(`\n--- Importing ${label} ---`)
  let inserted = 0
  let skipped = 0
  let offset = 0

  while (true) {
    console.log(`  Fetching offset=${offset}...`)
    const features = await fetchPage(urlFn(offset))

    if (features === null) {
      console.log('  Fetch failed — stopping dataset.')
      break
    }
    if (features.length === 0) {
      console.log('  No more features.')
      break
    }

    if (offset === 0) {
      console.log(`  First feature properties: ${JSON.stringify(features[0]?.properties)}`)
    }

    for (const feature of features) {
      if (!feature.geometry) { skipped++; continue }
      const geomType = feature.geometry.type
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

      const mapped = mapFeature(feature)
      if (!mapped) { skipped++; continue }

      try {
        await sql`
          INSERT INTO heritage_overlays (geometry, heritage_type, heritage_name, place_id, council)
          VALUES (
            ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}))::geometry(MultiPolygon, 4326),
            ${mapped.heritage_type},
            ${mapped.heritage_name},
            ${mapped.place_id},
            ${mapped.council}
          )
        `
        inserted++
      } catch (err) {
        console.error(`  Insert error:`, err)
        skipped++
      }
    }

    console.log(`  offset=${offset}: ${features.length} fetched, running total inserted=${inserted} skipped=${skipped}`)

    if (features.length < PAGE_SIZE) break
    if (TEST_MODE) {
      console.log('  Test mode — stopping after first page.')
      break
    }
    offset += PAGE_SIZE
  }

  return { inserted, skipped }
}

// ─── Dataset 1: QLD State Heritage Register ───────────────────────────────────

const STATE_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/AdminBoundariesFramework/FeatureServer/78/query'
const stateUrl = (offset: number) =>
  `${STATE_BASE}?where=1%3D1&outFields=placename%2Cplace_id%2Cstatus&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`

const mapStateFeature = (f: GeoJSONFeature) => ({
  heritage_type: 'state',
  heritage_name: String(f.properties?.['placename'] ?? 'Queensland Heritage Place'),
  place_id: f.properties?.['place_id'] != null ? String(f.properties['place_id']) : null,
  council: null,
})

// ─── Dataset 2: BCC Local Heritage Area ──────────────────────────────────────

const BCC_BASE = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Hertiage_overlay_Local_heritage_area/FeatureServer/0/query'
const bccUrl = (offset: number) =>
  `${BCC_BASE}?where=1%3D1&outFields=OVL2_DESC%2COVL2_CAT&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`

const mapBccFeature = (f: GeoJSONFeature) => ({
  heritage_type: 'local',
  heritage_name: String(f.properties?.['OVL2_DESC'] ?? f.properties?.['ovl2_desc'] ?? 'Local Heritage Area'),
  place_id: null,
  council: 'brisbane',
})

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(TEST_MODE
    ? '=== ZoneIQ: Import Heritage Overlays [TEST MODE] ==='
    : '=== ZoneIQ: Import Heritage Overlays ==='
  )

  const sql = postgres(DATABASE_URL!, { ssl: 'require' })

  try {
    if (!TEST_MODE) {
      console.log('Truncating heritage_overlays...')
      await sql`TRUNCATE TABLE heritage_overlays RESTART IDENTITY`
      console.log('  Truncated.')
    }

    const stateResult = await importDataset(sql, 'QLD State Heritage Register', stateUrl, mapStateFeature)
    const bccResult = await importDataset(sql, 'BCC Local Heritage Area', bccUrl, mapBccFeature)

    const totalInserted = stateResult.inserted + bccResult.inserted
    const totalSkipped = stateResult.skipped + bccResult.skipped

    console.log(`\n=== Done. Total inserted: ${totalInserted}, skipped: ${totalSkipped} ===`)

    const counts = await sql`
      SELECT heritage_type, COUNT(*)::int AS count
      FROM heritage_overlays
      GROUP BY heritage_type
      ORDER BY heritage_type
    `
    console.log('\nRows by heritage_type:')
    for (const row of counts) {
      console.log(`  ${row.heritage_type}: ${row.count}`)
    }

    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM heritage_overlays`
    console.log(`\nTotal rows in heritage_overlays: ${total}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
