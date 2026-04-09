// Sprint 23 — Melbourne Airport ANEF Ingest
// Source: spatial.planning.vic.gov.au/gis/rest/services/airport_environs/MapServer
// Layer 6: Melbourne Airport ANEF20 2013
// Layer 7: Melbourne Airport ANEF25 2013
// CRS: outSR=4326 (WGS84)
// Run: node scripts/ingest-vic-anef.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BASE = 'https://spatial.planning.vic.gov.au/gis/rest/services/airport_environs/MapServer'
const LAYERS = [
  { id: 6, name: 'Melbourne Airport ANEF20 2013', airport: 'MELBOURNE', contour: '20' },
  { id: 7, name: 'Melbourne Airport ANEF25 2013', airport: 'MELBOURNE', contour: '25' },
]

async function fetchLayer(layerId) {
  // Use f=geojson so ArcGIS returns correct GeoJSON winding order (CCW exterior)
  const url = `${BASE}/${layerId}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`
  const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
  if (!res.ok) { console.log(`  HTTP ${res.status} for layer ${layerId}`); return [] }
  const data = await res.json()
  if (data.error) { console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`); return [] }
  return data.features ?? []
}

async function insertRecord(record) {
  const { data, error } = await db.rpc('insert_noise_overlays_batch', { p_records: [record] })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function main() {
  console.log('=== Melbourne Airport ANEF Ingest ===')
  let totalInserted = 0

  for (const layer of LAYERS) {
    console.log(`\nFetching layer ${layer.id}: ${layer.name}`)
    const features = await fetchLayer(layer.id)
    console.log(`  Features fetched: ${features.length}`)

    for (const feature of features) {
      if (!feature.geometry) { console.log('  Skipping null geometry'); continue }
      const n = await insertRecord({
        airport: layer.airport,
        anef_contour: layer.contour,
        geojson: JSON.stringify(feature.geometry)
      })
      totalInserted += n
    }
    console.log(`  Inserted from layer ${layer.id}: ${features.length}`)
  }

  console.log(`\n=== Total inserted: ${totalInserted} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
