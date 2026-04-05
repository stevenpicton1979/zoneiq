/**
 * Sprint 10: Load aircraft noise (ANEF) contour data into Supabase noise_overlays table.
 *
 * Data source: Brisbane City Council City Plan 2014 Open Data (CC BY 4.0)
 * ArcGIS FeatureServer:
 *   https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/
 *   City_Plan_2014_Airport_environs_overlay_Australian_Noise_Exposure_Forecast_ANEF/FeatureServer/0
 *
 * Covers: Brisbane Airport (BNE) and Archerfield Airport
 * ANEF contour levels: N20, N25, N30, N35
 *
 * Note: Gold Coast Airport (OOL) ANEF data is not available via public open data APIs
 * as of April 2026. Gold Coast City Council does not publish ANEF GIS data in an
 * accessible ArcGIS or open data format. This script will log a warning for OOL.
 *
 * Prerequisites:
 *   - supabase/noise_overlays.sql run in Supabase SQL editor
 *   - DATABASE_URL in .env.local
 *
 * Run with: node scripts/load-noise.js
 * Run test mode: node scripts/load-noise.js --test
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local')
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
  console.error('ERROR: Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const TEST_MODE = process.argv.includes('--test')
const PAGE_SIZE = 100
const MAX_RETRIES = 3

const ARCGIS_BASE =
  'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/' +
  'City_Plan_2014_Airport_environs_overlay_Australian_Noise_Exposure_Forecast_ANEF/FeatureServer/0/query'

/**
 * Map ArcGIS OVL2_CAT field value to normalised ANEF contour label.
 * OVL2_CAT examples: 'ANF>20', 'ANF>25', 'ANF>30', 'ANF>35', 'ANF>40'
 */
function mapAnefContour(ovl2Cat) {
  const match = ovl2Cat ? ovl2Cat.match(/ANF>(\d+)/) : null
  if (!match) return null
  return `N${match[1]}`
}

async function fetchPage(url) {
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
        console.log(`  HTTP ${res.status} — giving up on this page`)
        return null
      }
      const data = await res.json()
      if (data.error) {
        console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`)
        return null
      }
      return data.features ?? []
    } catch (err) {
      console.log(`  Network error (attempt ${attempt}): ${err}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function loadBccAnef(sql) {
  console.log('\n--- Loading BCC ANEF noise contours (Brisbane Airport + Archerfield) ---')
  console.log('Source: Brisbane City Council City Plan 2014 Open Data (CC BY 4.0)')

  let inserted = 0
  let skipped = 0
  let offset = 0

  while (true) {
    const url =
      `${ARCGIS_BASE}?where=1%3D1` +
      `&outFields=OBJECTID,DESCRIPTION,OVL2_DESC,OVL2_CAT` +
      `&outSR=4326&f=geojson` +
      `&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`

    console.log(`  Fetching offset=${offset}...`)
    const features = await fetchPage(url)

    if (features === null) {
      console.log('  Fetch failed — stopping.')
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
      if (!feature.geometry) {
        console.log(`  Skipping feature with no geometry (OBJECTID=${feature.properties?.OBJECTID})`)
        skipped++
        continue
      }

      const geomType = feature.geometry.type
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
        console.log(`  Skipping non-polygon geometry type: ${geomType}`)
        skipped++
        continue
      }

      const props = feature.properties ?? {}
      const airport = String(props.DESCRIPTION ?? props.description ?? 'Unknown Airport')
      const ovl2Cat = String(props.OVL2_CAT ?? props.ovl2_cat ?? '')
      const anefContour = mapAnefContour(ovl2Cat)

      if (!anefContour) {
        console.log(`  Skipping feature with unmappable OVL2_CAT="${ovl2Cat}" (airport="${airport}")`)
        skipped++
        continue
      }

      try {
        await sql`
          INSERT INTO noise_overlays (airport, anef_contour, geom)
          VALUES (
            ${airport},
            ${anefContour},
            ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}))::geometry(MultiPolygon, 4326)
          )
        `
        inserted++
        console.log(`  Inserted: ${airport} — ${anefContour}`)
      } catch (err) {
        console.error(`  Insert error for ${airport} ${anefContour}:`, err)
        skipped++
      }
    }

    console.log(`  offset=${offset}: ${features.length} fetched, inserted=${inserted} skipped=${skipped}`)

    if (features.length < PAGE_SIZE) break
    if (TEST_MODE) {
      console.log('  Test mode — stopping after first page.')
      break
    }
    offset += PAGE_SIZE
  }

  return { inserted, skipped }
}

async function main() {
  console.log(TEST_MODE
    ? '=== ZoneIQ: Load Noise Overlays [TEST MODE] ==='
    : '=== ZoneIQ: Load Noise Overlays ==='
  )
  console.log('Sprint 10: Aircraft ANEF noise contours — BNE + Archerfield')

  const sql = postgres(DATABASE_URL, { ssl: 'require' })

  try {
    if (!TEST_MODE) {
      console.log('\nTruncating noise_overlays...')
      await sql`TRUNCATE TABLE noise_overlays RESTART IDENTITY`
      console.log('  Truncated.')
    }

    const bccResult = await loadBccAnef(sql)

    console.log('\n--- Gold Coast Airport (OOL) ---')
    console.log('  NOTE: Gold Coast Airport ANEF data is not available via public open data APIs.')
    console.log('  Gold Coast City Council does not publish ANEF GIS data in an accessible format.')
    console.log('  OOL data can be added manually when GIS data becomes available.')

    console.log(`\n=== Done. Inserted: ${bccResult.inserted}, Skipped: ${bccResult.skipped} ===`)

    // Summary
    const counts = await sql`
      SELECT airport, anef_contour, COUNT(*)::int AS count
      FROM noise_overlays
      GROUP BY airport, anef_contour
      ORDER BY airport, anef_contour
    `
    console.log('\nRows by airport and contour:')
    for (const row of counts) {
      console.log(`  ${row.airport} — ${row.anef_contour}: ${row.count} polygon(s)`)
    }

    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM noise_overlays`
    console.log(`\nTotal rows in noise_overlays: ${total}`)

  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
