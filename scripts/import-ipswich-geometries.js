/**
 * Sprint 11: Import Ipswich City Council zone geometries.
 *
 * Source: data.gov.au GeoServer WFS
 * URL: https://data.gov.au/geoserver/ipswich-plnning-scheme-zones/wfs
 * Type: ckan_ef6392c6_0649_4b65_b0f1_efcfe75737cb
 * EPSG: 4326 (WGS84, no ST_Transform needed)
 *
 * Strategy: zone_code = NAME field (canonical zone name, not sub-area CODE)
 * This normalises RL01, RL02, RL03 → "Residential Low Density" for rules lookup.
 * Council: 'ipswich'
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

// Normalise zone names: truncate at \n, trim
function normaliseName(name) {
  if (!name) return 'Unknown'
  return name.replace(/\n.*/g, '').trim()
}

async function main() {
  console.log('Sprint 11: Importing Ipswich zone geometries...')

  // Delete existing ipswich rows
  const del = await sql`DELETE FROM zone_geometries WHERE council = 'ipswich'`
  console.log(`Deleted existing ipswich rows`)

  const url = 'https://data.gov.au/geoserver/ipswich-plnning-scheme-zones/wfs?request=GetFeature&typeName=ckan_ef6392c6_0649_4b65_b0f1_efcfe75737cb&outputFormat=json'
  console.log('Fetching from WFS...')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const features = data.features ?? []
  console.log(`Fetched ${features.length} features`)

  let inserted = 0
  let skipped = 0

  for (const feat of features) {
    const geom = feat.geometry
    if (!geom) { skipped++; continue }

    const rawName = feat.properties?.NAME ?? feat.properties?.name ?? ''
    const zoneName = normaliseName(rawName)

    // Ensure MultiPolygon
    let geojsonStr
    if (geom.type === 'MultiPolygon') {
      geojsonStr = JSON.stringify(geom)
    } else if (geom.type === 'Polygon') {
      geojsonStr = JSON.stringify({ type: 'MultiPolygon', coordinates: [geom.coordinates] })
    } else {
      skipped++
      continue
    }

    try {
      await sql`
        INSERT INTO zone_geometries (zone_code, council, geometry)
        VALUES (
          ${zoneName},
          'ipswich',
          ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonStr}), 4326))
        )
      `
      inserted++
    } catch (e) {
      console.error(`  Insert error (${zoneName}): ${e.message}`)
      skipped++
    }
  }

  console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`)

  // Summary
  const summary = await sql`SELECT zone_code, count(*) FROM zone_geometries WHERE council = 'ipswich' GROUP BY zone_code ORDER BY count(*) DESC LIMIT 25`
  console.log('\nTop zones by polygon count:')
  for (const r of summary) console.log(`  ${r.count}x ${r.zone_code}`)

  await sql.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
