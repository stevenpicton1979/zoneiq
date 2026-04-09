// Sprint 24 — Logan Flood Ingest (standalone retry)
// Run: node scripts/ingest-logan-flood.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BATCH_SIZE = 25  // smaller batches to reduce 520 risk

async function insertBatch(records) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await db.rpc('insert_flood_overlays_batch', { p_records: records })
    if (!error) return data ?? 0
    console.error(`  RPC error (attempt ${attempt}): ${typeof error === 'string' ? error.slice(0, 80) : error.message}`)
    if (attempt < 3) await new Promise(r => setTimeout(r, 5000))
  }
  console.error('  Giving up on batch after 3 attempts')
  return 0
}

async function main() {
  console.log('=== Logan Flood Ingest ===')
  const BASE = 'https://arcgis.lcc.wspdigital.com/server/rest/services/LoganHub/Logan_Planning_Scheme_v9_0_overlays_only_20240716/MapServer/24/query'
  const PAGE_SIZE = 500
  let offset = 0, totalFetched = 0, totalInserted = 0, pending = []

  while (true) {
    const url = `${BASE}?where=1%3D1&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`
    let features
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
        if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 3000)); continue } features = null; break }
        const data = await res.json()
        if (data.error) { console.log('  ArcGIS error:', JSON.stringify(data.error)); features = null; break }
        features = data.features ?? []
        break
      } catch (e) { if (attempt < 3) await new Promise(r => setTimeout(r, 3000)) }
    }

    if (!features) { console.log('  Fetch failed — stopping.'); break }
    if (features.length === 0) { console.log('  No more features.'); break }

    totalFetched += features.length
    for (const f of features) {
      if (!f.geometry || !f.properties) continue
      pending.push({
        overlay_type: 'logan',
        flood_category: f.properties.OVL_CAT || 'FLOOD_HAZARD',
        risk_level: f.properties.CAT_DESC || f.properties.OVL2_DESC || 'Flood Hazard',
        geojson: JSON.stringify(f.geometry)
      })
    }

    while (pending.length >= BATCH_SIZE) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))

    console.log(`  Page done: fetched=${totalFetched} inserted=${totalInserted}`)
    if (features.length < PAGE_SIZE) { console.log('  Last page.'); break }
    offset += PAGE_SIZE
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  console.log(`\nDONE — Fetched: ${totalFetched}, Inserted: ${totalInserted}`)
}

main().catch(e => { console.error(e); process.exit(1) })
