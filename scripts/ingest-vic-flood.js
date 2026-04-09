// Sprint 22 — VIC Flood Overlay Ingest (Greater Melbourne)
// Source: Vicmap Planning FeatureServer Layer 2 (PLAN_OVERLAY) — LSIO, FO, SBO
// CRS: EPSG:3857 → outSR=4326
// Run: node scripts/ingest-vic-flood.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BASE_URL = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Planning/FeatureServer/2/query'
const BBOX = '144.4,-38.5,145.6,-37.4'
const PAGE_SIZE = 500
const BATCH_SIZE = 50

function buildUrl(offset) {
  return `${BASE_URL}?where=zone_code+IN+(%27LSIO%27%2C%27FO%27%2C%27SBO%27)` +
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
      if (!res.ok) { if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue } return null }
      const data = await res.json()
      if (data.error) { console.log('ArcGIS error:', JSON.stringify(data.error)); return null }
      return data.features ?? []
    } catch (e) { if (attempt < retries) await new Promise(r => setTimeout(r, 3000)) }
  }
  return null
}

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_flood_overlays_batch', { p_records: records })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function main() {
  console.log('=== VIC Flood Overlay Ingest (LSIO + FO + SBO) — Greater Melbourne ===')
  let totalFetched = 0, totalInserted = 0, offset = 0, pending = []
  const typeCounts = {}

  while (true) {
    console.log(`Fetching offset=${offset}...`)
    const features = await fetchPage(offset)
    if (!features) { console.log('Fetch failed — stopping.'); break }
    if (features.length === 0) { console.log('No more features.'); break }

    totalFetched += features.length
    for (const feature of features) {
      if (!feature.geometry || !feature.properties) continue
      const zone_code = (feature.properties.zone_code || '').trim()
      const flood_type = zone_code.match(/^(LSIO|FO|SBO)/)?.[1] || zone_code
      typeCounts[flood_type] = (typeCounts[flood_type] || 0) + 1
      pending.push({
        overlay_type: 'Vicmap_Planning',
        flood_category: flood_type,
        risk_level: feature.properties.zone_description || flood_type,
        geojson: JSON.stringify(feature.geometry)
      })
    }

    while (pending.length >= BATCH_SIZE) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
    if (features.length < PAGE_SIZE) { console.log('Last page.'); break }
    offset += PAGE_SIZE
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))

  console.log(`\nFetched: ${totalFetched}, Inserted: ${totalInserted}`)
  console.log('By type:', typeCounts)
}

main().catch(e => { console.error(e); process.exit(1) })
