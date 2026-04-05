/**
 * Sprint 10: Import aircraft noise (ANEF) overlays into noise_overlays table.
 *
 * Sources:
 *   Brisbane Airport + Archerfield Airport:
 *     BCC Open Data (OpenDataSoft API, GeoJSON)
 *     https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/
 *       cp14-airport-environs-overlay-australian-noise-exposure-forecast-anef/records
 *
 *   Gold Coast Airport:
 *     Gold Coast City Council MapServer Layer 7
 *     https://maps1.goldcoast.qld.gov.au/arcgis/rest/services/V8_Overlays/MapServer/7/query
 *     Spatial ref: GDA94 Zone 56 (EPSG:28356) — request outSR=4326 for WGS84
 *
 * ANEF contour stored as the lower bound integer string: '20', '25', '30', '35', '40'
 * Airport stored as: 'BRISBANE', 'ARCHERFIELD', 'GOLD_COAST'
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

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
} catch {}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const sql = postgres(DATABASE_URL, { ssl: 'require' })

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// Extract lower-bound ANEF contour level as string integer
// Handles: 'ANF>20', 'ANF>25', 'ANEF 20-25', 'ANEF 25-30', 'ANEF 40+'
function parseContour(raw) {
  if (!raw) return null
  // "ANF>20" or "ANF>25"
  const gtMatch = raw.match(/ANF[EF]?\s*[>]?\s*(\d+)/)
  if (gtMatch) return gtMatch[1]
  // "ANEF 20-25" or "ANEF 25-30" or "ANEF 40+"
  const rangeMatch = raw.match(/(\d+)/)
  if (rangeMatch) return rangeMatch[1]
  return null
}

function toMultiPolygonWkt(geojsonGeom) {
  if (!geojsonGeom) return null
  if (geojsonGeom.type === 'MultiPolygon') {
    return JSON.stringify(geojsonGeom)
  }
  if (geojsonGeom.type === 'Polygon') {
    return JSON.stringify({ type: 'MultiPolygon', coordinates: [geojsonGeom.coordinates] })
  }
  return null
}

async function importBrisbane() {
  console.log('\n--- Brisbane/Archerfield Airport (BCC Open Data) ---')
  const url = 'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/cp14-airport-environs-overlay-australian-noise-exposure-forecast-anef/records?limit=100&offset=0'
  const data = await fetchJson(url)
  const records = data.results ?? []
  console.log(`Fetched ${records.length} records`)

  let inserted = 0
  let skipped = 0

  for (const rec of records) {
    // BCC ODS API v2.1: geometry is at rec.geo_shape.geometry (geo_shape is a GeoJSON Feature)
    const geom = rec.geo_shape?.geometry ?? rec.geo_shape
    const geojsonStr = toMultiPolygonWkt(geom)
    if (!geojsonStr) { skipped++; continue }

    // BCC field names: ovl2_cat = ANEF category, description = airport name
    const rawContour = rec.ovl2_cat ?? ''
    const rawAirport = rec.description ?? ''

    const airportCode = rawAirport.toLowerCase().includes('archerfield') ? 'ARCHERFIELD'
      : rawAirport.toLowerCase().includes('brisbane') ? 'BRISBANE'
      : 'BRISBANE'

    const contour = parseContour(rawContour)
    const label = rawContour || rawAirport

    if (!contour) {
      console.error(`  Skipping — could not parse contour from: "${rawContour}"`)
      skipped++
      continue
    }

    try {
      await sql`
        INSERT INTO noise_overlays (geom, airport, anef_contour, anef_label)
        VALUES (
          ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326)),
          ${airportCode},
          ${contour},
          ${label}
        )
      `
      inserted++
    } catch (e) {
      console.error(`  Insert error: ${e.message}`)
      skipped++
    }
  }
  console.log(`Brisbane: ${inserted} inserted, ${skipped} skipped`)
  return inserted
}

async function importGoldCoast() {
  console.log('\n--- Gold Coast Airport (GCCC MapServer) ---')
  const base = 'https://maps1.goldcoast.qld.gov.au/arcgis/rest/services/V8_Overlays/MapServer/7/query'
  let offset = 0
  const pageSize = 500
  let inserted = 0
  let skipped = 0

  while (true) {
    const url = `${base}?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=${pageSize}&returnGeometry=true`
    const data = await fetchJson(url)
    const features = data.features ?? []
    if (features.length === 0) break

    for (const feat of features) {
      const geom = feat.geometry
      const geojsonStr = toMultiPolygonWkt(geom)
      if (!geojsonStr) { skipped++; continue }

      const props = feat.properties
      const rawLabel = props.OVL2_CAT ?? props.LABEL ?? props.CATEGORY ?? props.category ?? ''
      const contour = parseContour(rawLabel)
      const label = rawLabel

      try {
        await sql`
          INSERT INTO noise_overlays (geom, airport, anef_contour, anef_label)
          VALUES (
            ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326)),
            ${'GOLD_COAST'},
            ${contour},
            ${label}
          )
        `
        inserted++
      } catch (e) {
        console.error(`  Insert error: ${e.message}`)
        skipped++
      }
    }

    console.log(`  Page offset=${offset}: ${features.length} features`)
    if (!data.exceededTransferLimit) break
    offset += pageSize
  }

  console.log(`Gold Coast: ${inserted} inserted, ${skipped} skipped`)
  return inserted
}

async function main() {
  console.log('Sprint 10: Importing aircraft noise (ANEF) overlays...')

  // Truncate existing data
  await sql`TRUNCATE noise_overlays RESTART IDENTITY`
  console.log('Truncated noise_overlays')

  let total = 0

  try {
    total += await importBrisbane()
  } catch (e) {
    console.error(`Brisbane import failed: ${e.message}`)
  }

  try {
    total += await importGoldCoast()
  } catch (e) {
    console.error(`Gold Coast import failed: ${e.message}`)
  }

  // Summary
  const summary = await sql`SELECT airport, anef_contour, count(*) FROM noise_overlays GROUP BY airport, anef_contour ORDER BY airport, anef_contour::int`
  console.log('\nFinal summary:')
  for (const r of summary) console.log(`  ${r.airport} ANEF-${r.anef_contour}: ${r.count} polygon(s)`)

  const total2 = await sql`SELECT count(*) FROM noise_overlays`
  console.log(`Total: ${total2[0].count} rows inserted`)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
