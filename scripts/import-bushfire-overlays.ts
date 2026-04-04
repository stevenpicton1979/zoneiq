/**
 * One-time script: imports SEQ Bushfire Prone Area data directly from ArcGIS API into Supabase PostGIS.
 *
 * Fetches pages from the QFES ArcGIS Online proxy and inserts directly — no intermediate file needed.
 * (The 132K-feature GeoJSON file is ~1.1GB — too large for fs.readFileSync.)
 *
 * Prerequisites:
 *   - sprint8-schema.sql run in Supabase (creates bushfire_overlays table + RPC)
 *   - DATABASE_URL in .env.local
 *
 * Run with: npm run import-bushfire-overlays
 *
 * Pass --test to import only the first page (2,000 features) and exit.
 * Pass --resume=N to skip the first N features (if a previous run was interrupted).
 *
 * Intensity class mapping:
 *   "Very High Potential Bushfire Intensity" → very_high
 *   "High Potential Bushfire Intensity"      → high
 *   "Medium Potential Bushfire Intensity"    → medium
 *   "Potential Impact Buffer"                → buffer
 *
 * CRS: WGS84 — no ST_Transform needed.
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

const SEQ_LGAS = [
  'Brisbane', 'GoldCoast', 'Ipswich', 'Lockyer', 'Logan',
  'Moreton', 'Noosa', 'Redland', 'ScenicRim_E', 'ScenicRim_W',
  'Somerset_N', 'Somerset_S', 'SunshineC',
]
const WHERE = `lga IN (${SEQ_LGAS.map(l => `'${l}'`).join(',')})`
const BASE = 'https://utility.arcgis.com/usrsvcs/servers/8ac1ba8eccee472fbd0e7a57bf3ad320/rest/services/Hosted/BPA/FeatureServer/0/query'

const ARCGIS_URL = (offset: number) =>
  `${BASE}?where=${encodeURIComponent(WHERE)}&outFields=class,lga&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`

interface GeoJSONFeature {
  type: string
  geometry: { type: string; coordinates: unknown } | null
  properties: Record<string, unknown> | null
}

async function fetchPageWithRetry(url: string): Promise<GeoJSONFeature[] | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
      })
      if (res.status === 504 || res.status === 503 || res.status === 502) {
        console.log(`  HTTP ${res.status} — attempt ${attempt}/${MAX_RETRIES}, retrying in 10s...`)
        await new Promise(r => setTimeout(r, 10000))
        continue
      }
      if (!res.ok) {
        console.log(`  HTTP ${res.status} — giving up on this page`)
        return null
      }
      const data = await res.json() as { features?: GeoJSONFeature[] }
      return data.features ?? []
    } catch (err) {
      console.log(`  Network error (attempt ${attempt}): ${err}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 5000))
    }
  }
  return null
}

function mapIntensityClass(raw: string | null | undefined): string {
  if (!raw) return 'unknown'
  const s = raw.toLowerCase()
  if (s.includes('very high')) return 'very_high'
  if (s.includes('high')) return 'high'
  if (s.includes('medium')) return 'medium'
  if (s.includes('buffer')) return 'buffer'
  return 'unknown'
}

function mapLgaToCouncil(lga: string | null | undefined): string {
  if (!lga) return 'unknown'
  const MAP: Record<string, string> = {
    Brisbane: 'brisbane',
    GoldCoast: 'goldcoast',
    Moreton: 'moretonbay',
    SunshineC: 'sunshinecoast',
    Ipswich: 'ipswich',
    Logan: 'logan',
    Redland: 'redland',
    Noosa: 'noosa',
    Lockyer: 'lockyer',
    ScenicRim_E: 'scenicrim',
    ScenicRim_W: 'scenicrim',
    Somerset_N: 'somerset',
    Somerset_S: 'somerset',
  }
  return MAP[lga] ?? lga.toLowerCase()
}

async function main() {
  if (TEST_MODE) {
    console.log('=== ZoneIQ: Import Bushfire Overlays [TEST MODE — first page only] ===')
  } else {
    console.log('=== ZoneIQ: Import Bushfire Overlays (direct from ArcGIS API) ===')
  }

  const sql = postgres(DATABASE_URL!, { ssl: 'require' })

  try {
    if (!TEST_MODE) {
      console.log('Truncating bushfire_overlays...')
      await sql`TRUNCATE TABLE bushfire_overlays RESTART IDENTITY`
      console.log('  Truncated.')
    } else {
      console.log('Test mode: NOT truncating. Inserting first page only...')
    }

    let totalInserted = 0
    let totalSkipped = 0
    let offset = 0

    while (true) {
      console.log(`  Fetching offset=${offset}...`)
      const features = await fetchPageWithRetry(ARCGIS_URL(offset))

      if (features === null) {
        console.log('  Fetch failed after retries — stopping.')
        break
      }
      if (features.length === 0) {
        console.log('  No more features.')
        break
      }

      let pageInserted = 0
      let pageSkipped = 0

      for (const feature of features) {
        if (!feature.geometry) { pageSkipped++; continue }

        const geomType = feature.geometry.type
        if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { pageSkipped++; continue }

        const rawClass = String(feature.properties?.['class'] ?? '')
        const intensityClass = mapIntensityClass(rawClass)
        const lga = String(feature.properties?.['lga'] ?? '')
        const council = mapLgaToCouncil(lga)

        try {
          await sql`
            INSERT INTO bushfire_overlays (geometry, intensity_class, lga, council)
            VALUES (
              ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}))::geometry(MultiPolygon, 4326),
              ${intensityClass},
              ${lga},
              ${council}
            )
          `
          pageInserted++
        } catch (err) {
          console.error(`  Insert error:`, err)
          pageSkipped++
        }
      }

      totalInserted += pageInserted
      totalSkipped += pageSkipped

      if ((offset + PAGE_SIZE) % 10000 < PAGE_SIZE || features.length < PAGE_SIZE) {
        console.log(`  offset=${offset}: page inserted=${pageInserted} skipped=${pageSkipped} | total=${totalInserted}`)
      }

      if (features.length < PAGE_SIZE) break
      if (TEST_MODE) {
        console.log('\nTest mode complete — first page only.')
        break
      }
      offset += PAGE_SIZE
    }

    console.log(`\nDone. Total inserted: ${totalInserted}, skipped: ${totalSkipped}`)

    const counts = await sql`
      SELECT intensity_class, COUNT(*)::int AS count
      FROM bushfire_overlays
      GROUP BY intensity_class
      ORDER BY intensity_class
    `
    console.log('\nRows by intensity_class:')
    for (const row of counts) {
      console.log(`  ${row.intensity_class}: ${row.count}`)
    }

    const councilCounts = await sql`
      SELECT council, COUNT(*)::int AS count
      FROM bushfire_overlays
      GROUP BY council
      ORDER BY council
    `
    console.log('\nRows by council:')
    for (const row of councilCounts) {
      console.log(`  ${row.council}: ${row.count}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
