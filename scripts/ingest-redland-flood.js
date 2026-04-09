// Sprint 24 — Redland City Council Flood Overlay Ingest
// Source: gis.redland.qld.gov.au MapServer/11 — Flood and Storm Tide Hazard Overlay
// CRS: EPSG:28356 → outSR=4326 (ArcGIS reprojects)
// Note: resultOffset not supported — use OBJECTID range pagination (same as zone ingest)
// Run: node scripts/ingest-redland-flood.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BASE_URL = 'https://gis.redland.qld.gov.au/arcgis/rest/services/planning/city_plan/MapServer/11/query'
const PAGE_SIZE = 500
const BATCH_SIZE = 50

function buildUrl(minOid, maxOid) {
  return `${BASE_URL}?where=OBJECTID+BETWEEN+${minOid}+AND+${maxOid}` +
    `&outFields=OBJECTID,CLASS&outSR=4326&f=geojson`
}

async function fetchBatch(minOid, maxOid, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(buildUrl(minOid, maxOid), { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
      if (!res.ok) { if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue } return null }
      const data = await res.json()
      if (data.error) { console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`); return null }
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
  console.log('=== Redland City Council Flood Overlay Ingest ===')
  console.log('Source: gis.redland.qld.gov.au MapServer Layer 11 (Flood and Storm Tide Hazard)')

  // Get OBJECTID range
  const rangeRes = await fetch(`${BASE_URL}?where=1%3D1&returnIdsOnly=true&f=json`, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
  const rangeData = await rangeRes.json()
  const ids = rangeData.objectIds || []
  if (ids.length === 0) { console.log('No objectIds returned'); process.exit(1) }
  const minOid = Math.min(...ids), maxOid = Math.max(...ids)
  console.log(`ObjectID range: ${minOid} — ${maxOid} (${ids.length} total)`)

  let totalFetched = 0, totalInserted = 0, pending = []
  const typeCounts = {}

  for (let start = minOid; start <= maxOid; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, maxOid)
    const features = await fetchBatch(start, end)
    if (!features) { console.log(`  Failed to fetch OID ${start}-${end} — skipping`); continue }
    if (features.length === 0) continue

    totalFetched += features.length
    for (const f of features) {
      if (!f.geometry || !f.properties) continue
      const floodClass = (f.properties.CLASS || '').trim()
      typeCounts[floodClass] = (typeCounts[floodClass] || 0) + 1
      pending.push({
        overlay_type: 'redland',
        flood_category: floodClass || 'FLOOD',
        risk_level: floodClass || 'Flood and Storm Tide Hazard',
        geojson: JSON.stringify(f.geometry)
      })
    }

    while (pending.length >= BATCH_SIZE) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
    if (totalFetched % 5000 < PAGE_SIZE) console.log(`  Progress: fetched=${totalFetched} inserted=${totalInserted}`)
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))

  console.log(`\nFetched: ${totalFetched}, Inserted: ${totalInserted}`)
  console.log('By type:', typeCounts)
}

main().catch(e => { console.error(e); process.exit(1) })
