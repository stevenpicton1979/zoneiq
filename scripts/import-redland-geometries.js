/**
 * Sprint 13: Import Redland City Council zone geometries.
 *
 * Source: Redland City Plan — ArcGIS MapServer
 * URL: https://gis.redland.qld.gov.au/arcgis/rest/services/planning/city_plan/MapServer/44
 * Zone code field: QPP_Zone (e.g. "LDR", "MDR", "CF")
 * Zone name field: QPP_Description (e.g. "Low Density Residential")
 * Source EPSG: 28356 (GDA94 MGA Zone 56) — request outSR=4326
 * Max records per page: 300
 * Features: ~6,266
 * Council: 'redland'
 *
 * Strategy: store zone_code = QPP_Description (full name) for consistency
 * with other councils; QPP_Zone (short code) stored as note.
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

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

const BASE_URL = 'https://gis.redland.qld.gov.au/arcgis/rest/services/planning/city_plan/MapServer/44/query'
const PAGE_SIZE = 300
const MAX_RETRIES = 3

// Use OBJECTID-range pagination (resultOffset not supported on this older server)
async function fetchPage(minId, maxId) {
  const where = encodeURIComponent(`OBJECTID >= ${minId} AND OBJECTID <= ${maxId}`)
  const url = `${BASE_URL}?where=${where}&outFields=QPP_Zone,QPP_Description&returnGeometry=true&f=json`
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e
      console.log(`  Retry ${attempt} (OBJECTID ${minId}-${maxId})...`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

async function getObjectIdRange() {
  const url = `${BASE_URL}?where=1%3D1&returnIdsOnly=true&f=json`
  const res = await fetch(url)
  const data = await res.json()
  const ids = data.objectIds ?? []
  return { min: Math.min(...ids), max: Math.max(...ids) }
}

function esriRingsToGeoJSON(geom) {
  if (!geom || !geom.rings) return null
  if (geom.rings.length === 0) return null
  return JSON.stringify({ type: 'Polygon', coordinates: geom.rings })
}

async function main() {
  console.log('Sprint 13: Importing Redland zone geometries...')

  await sql`DELETE FROM zone_geometries WHERE council = 'redland'`
  console.log('Cleared existing redland rows')

  console.log('Getting OBJECTID range...')
  const { min: minId, max: maxId } = await getObjectIdRange()
  console.log(`OBJECTID range: ${minId} – ${maxId}`)

  let inserted = 0
  let skipped = 0
  let pageStart = minId

  while (pageStart <= maxId) {
    const pageEnd = pageStart + PAGE_SIZE - 1
    const data = await fetchPage(pageStart, pageEnd)
    const features = data.features ?? []

    for (const feat of features) {
      const geom = feat.geometry
      if (!geom) { skipped++; continue }

      const attrs = feat.attributes ?? {}
      const zoneName = attrs.QPP_Description ?? attrs.QPP_Zone ?? null
      if (!zoneName) { skipped++; continue }

      const geojsonStr = esriRingsToGeoJSON(geom)
      if (!geojsonStr) { skipped++; continue }

      try {
        await sql`
          INSERT INTO zone_geometries (zone_code, council, geometry)
          VALUES (
            ${zoneName},
            'redland',
            ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326))
          )
        `
        inserted++
      } catch (e) {
        console.error(`  Insert error (${zoneName}): ${e.message}`)
        skipped++
      }
    }

    if (features.length > 0) console.log(`  OBJECTID ${pageStart}-${pageEnd}: ${features.length} features`)
    pageStart += PAGE_SIZE
  }

  console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`)

  const summary = await sql`SELECT zone_code, count(*) FROM zone_geometries WHERE council = 'redland' GROUP BY zone_code ORDER BY count(*) DESC`
  console.log('\nZone counts:')
  for (const r of summary) console.log(`  ${r.count}x ${r.zone_code}`)

  await sql.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
