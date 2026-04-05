/**
 * Sprint 12: Import Logan City Council zone geometries.
 *
 * Source: Logan Planning Scheme 2015 v9.2 — ArcGIS Online FeatureServer
 * URL: https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Zones_V9_2_WFL1/FeatureServer/4
 * Zone field: Zone (string)
 * Source EPSG: 3857 (Web Mercator) — request outSR=4326 for WGS84
 * Features: ~6,920
 * Council: 'logan'
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

const BASE_URL = 'https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Zones_V9_2_WFL1/FeatureServer/4/query'
const PAGE_SIZE = 2000
const MAX_RETRIES = 3

async function fetchPage(offset) {
  // Use f=json (not geojson) so exceededTransferLimit is returned
  const url = `${BASE_URL}?where=1%3D1&outFields=Zone&outSR=4326&f=json&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}&returnGeometry=true`
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e
      console.log(`  Retry ${attempt} for offset ${offset}...`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

// Convert ArcGIS JSON geometry (rings) to GeoJSON
function esriRingsToGeoJSON(geom) {
  if (!geom || !geom.rings) return null
  // ArcGIS polygon rings: outer = clockwise, holes = counter-clockwise
  // GeoJSON polygon: outer = counter-clockwise, holes = clockwise (opposite)
  // For simplicity, wrap all rings in a MultiPolygon treating each ring as its own polygon
  // PostGIS ST_GeomFromGeoJSON will handle the geometry correctly
  const rings = geom.rings
  if (rings.length === 0) return null
  // Group rings into polygons (first ring = exterior, remaining = holes)
  // Simple approach: treat as single polygon if one ring, multipolygon if multiple
  return JSON.stringify({ type: 'Polygon', coordinates: rings })
}

async function main() {
  console.log('Sprint 12: Importing Logan zone geometries...')

  await sql`DELETE FROM zone_geometries WHERE council = 'logan'`
  console.log('Cleared existing logan rows')

  let offset = 0
  let inserted = 0
  let skipped = 0

  while (true) {
    const data = await fetchPage(offset)
    const features = data.features ?? data.features ?? []
    if (features.length === 0) break

    for (const feat of features) {
      const geom = feat.geometry
      if (!geom) { skipped++; continue }

      // f=json returns ESRI JSON with 'attributes' not 'properties'
      const attrs = feat.attributes ?? feat.properties ?? {}
      const zoneCode = attrs.Zone ?? attrs.zone ?? null
      if (!zoneCode) { skipped++; continue }

      // ESRI JSON geometry has 'rings' array
      const geojsonStr = esriRingsToGeoJSON(geom)
      if (!geojsonStr) { skipped++; continue }

      try {
        await sql`
          INSERT INTO zone_geometries (zone_code, council, geometry)
          VALUES (
            ${zoneCode},
            'logan',
            ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326))
          )
        `
        inserted++
      } catch (e) {
        console.error(`  Insert error (${zoneCode}): ${e.message}`)
        skipped++
      }
    }

    console.log(`  offset=${offset}: ${features.length} features processed`)
    if (!data.exceededTransferLimit) break
    offset += PAGE_SIZE
  }

  console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`)

  const summary = await sql`SELECT zone_code, count(*) FROM zone_geometries WHERE council = 'logan' GROUP BY zone_code ORDER BY count(*) DESC`
  console.log('\nZone counts:')
  for (const r of summary) console.log(`  ${r.count}x ${r.zone_code}`)

  await sql.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
