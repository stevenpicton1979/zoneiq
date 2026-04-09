// Sprint 22 — VIC Zoning Ingest (Greater Melbourne)
// Source: Vicmap Planning FeatureServer — Layer 3 (PLAN_ZONE)
// URL: https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Planning/FeatureServer/3
// CRS: EPSG:3857 (Web Mercator) — requested as outSR=4326, ArcGIS reprojects
// Fields: zone_code, lga (council), zone_description
// Note: backlog warned EPSG:3111 (VicGrid) but actual CRS is 3857 — no ST_Transform needed
// Run: node scripts/ingest-vic-zoning.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BASE_URL = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Planning/FeatureServer/3/query'
// Greater Melbourne bbox (comma-separated, inSR=4326)
const BBOX = '144.4,-38.5,145.6,-37.4'
const PAGE_SIZE = 1000
const BATCH_SIZE = 50

function buildUrl(offset) {
  return `${BASE_URL}?where=1%3D1` +
    `&geometry=${encodeURIComponent(BBOX)}&geometryType=esriGeometryEnvelope&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=zone_code%2Clga%2Czone_description` +
    `&outSR=4326&f=geojson` +
    `&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`
}

async function fetchPage(offset, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(buildUrl(offset), { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
      if (!res.ok) { console.log(`  HTTP ${res.status} at offset=${offset}`); if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue } return null }
      const data = await res.json()
      if (data.error) { console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`); return null }
      return data.features ?? []
    } catch (e) {
      console.log(`  Error (attempt ${attempt}): ${e.message}`)
      if (attempt < retries) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_zone_geometries_batch', { p_records: records })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function main() {
  console.log('=== VIC Zoning Ingest — Greater Melbourne ===')
  console.log('Source: Vicmap Planning FeatureServer Layer 3 (PLAN_ZONE)')
  console.log('CRS: EPSG:3857 → requesting outSR=4326\n')

  let totalFetched = 0, totalInserted = 0, totalSkipped = 0
  let offset = 0, pending = []
  const lgaCounts = {}

  while (true) {
    console.log(`Fetching offset=${offset}...`)
    const features = await fetchPage(offset)
    if (!features) { console.log('Fetch failed — stopping.'); break }
    if (features.length === 0) { console.log('No more features.'); break }

    totalFetched += features.length
    for (const feature of features) {
      if (!feature.geometry || !feature.properties) { totalSkipped++; continue }
      const zone_code = (feature.properties.zone_code || '').trim()
      const council = (feature.properties.lga || '').toLowerCase().trim()
      if (!zone_code || !council) { totalSkipped++; continue }
      lgaCounts[council] = (lgaCounts[council] || 0) + 1
      pending.push({ zone_code, council, geojson: JSON.stringify(feature.geometry) })
    }

    while (pending.length >= BATCH_SIZE) {
      const n = await insertBatch(pending.splice(0, BATCH_SIZE))
      totalInserted += n
      if (totalInserted % 500 === 0 || totalInserted < 100) console.log(`  Inserted ${totalInserted} so far...`)
    }

    if (totalFetched % 5000 < PAGE_SIZE) console.log(`Progress: fetched=${totalFetched} inserted=${totalInserted}`)
    if (features.length < PAGE_SIZE) { console.log('Last page.'); break }
    offset += PAGE_SIZE
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))

  console.log('\n=== Ingest complete ===')
  console.log(`Fetched: ${totalFetched}, Inserted: ${totalInserted}, Skipped: ${totalSkipped}`)
  console.log('\nTop LGAs:')
  Object.entries(lgaCounts).sort((a,b) => b[1]-a[1]).slice(0,20).forEach(([k,v]) => console.log(`  ${k}: ${v}`))
}

main().catch(e => { console.error(e); process.exit(1) })
