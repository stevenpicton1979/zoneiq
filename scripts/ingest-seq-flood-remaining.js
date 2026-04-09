// Sprint 24 — SEQ Flood Overlay Ingest (MBRC, Sunshine Coast, Logan, Ipswich)
// Gold Coast already ingested (116,000 records) — skipped here.
// Run: node scripts/ingest-seq-flood-remaining.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BATCH_SIZE = 50

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_flood_overlays_batch', { p_records: records })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function ingestArcGIS(councilName, baseUrl, bbox, pageSize, getRecord) {
  console.log(`\n=== ${councilName.toUpperCase()} ===`)
  let offset = 0, totalFetched = 0, totalInserted = 0, pending = []

  while (true) {
    const url = `${baseUrl}?where=1%3D1` +
      (bbox ? `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` : '') +
      `&outSR=4326&f=geojson&resultRecordCount=${pageSize}&resultOffset=${offset}`

    let features
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
        if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 3000)); continue } features = null; break }
        const data = await res.json()
        if (data.error) { console.log(`  ArcGIS error:`, JSON.stringify(data.error)); features = null; break }
        features = data.features ?? []
        break
      } catch (e) { if (attempt < 3) await new Promise(r => setTimeout(r, 3000)) }
    }

    if (!features) { console.log('  Fetch failed — stopping this council.'); break }
    if (features.length === 0) { console.log(`  No more features. Total fetched: ${totalFetched}`); break }

    totalFetched += features.length
    for (const f of features) {
      if (!f.geometry || !f.properties) continue
      const rec = getRecord(f)
      if (rec) pending.push(rec)
    }

    while (pending.length >= BATCH_SIZE) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))

    if (totalFetched % 5000 < pageSize) console.log(`  Progress: fetched=${totalFetched} inserted=${totalInserted}`)
    if (features.length < pageSize) { console.log(`  Last page.`); break }
    offset += pageSize
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  console.log(`  DONE — Fetched: ${totalFetched}, Inserted: ${totalInserted}`)
  return totalInserted
}

async function ingestIpswich() {
  console.log('\n=== IPSWICH (WFS) ===')
  const TYPE_NAME = 'ipswich-planning-scheme-overlay-ov05-flooding:ckan_99af0b17_4bfb_4568_bb8c_396666b18692'
  const BASE = 'https://data.gov.au/geoserver/ipswich-planning-scheme-overlay-ov05-flooding/wfs'
  let startIndex = 0, count = 500, totalFetched = 0, totalInserted = 0, pending = []

  while (true) {
    const url = `${BASE}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(TYPE_NAME)}&outputFormat=application%2Fjson&srsName=EPSG%3A4326&count=${count}&startIndex=${startIndex}`
    let features
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }
      const data = await res.json()
      features = data.features ?? []
    } catch (e) { console.log(`  Error: ${e.message}`); break }

    if (features.length === 0) { console.log('  No more features.'); break }
    totalFetched += features.length

    for (const f of features) {
      if (!f.geometry || !f.properties) continue
      pending.push({
        overlay_type: 'ipswich',
        flood_category: f.properties.CODE || 'OV5',
        risk_level: f.properties.DETAILS || f.properties.NAME || 'OV5',
        geojson: JSON.stringify(f.geometry)
      })
    }

    while (pending.length >= BATCH_SIZE) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
    if (features.length < count) { console.log('  Last page.'); break }
    startIndex += count
  }

  while (pending.length > 0) totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  console.log(`  DONE — Fetched: ${totalFetched}, Inserted: ${totalInserted}`)
  return totalInserted
}

async function main() {
  console.log('=== SEQ Flood Remaining Ingest (MBRC / Sunshine Coast / Logan / Ipswich) ===')
  console.log('Gold Coast already complete (116,000 records) — skipped.')
  let total = 0

  // Moreton Bay Regional Council: Flood Hazard Overlay
  total += await ingestArcGIS(
    'moretonbay',
    'https://services-ap1.arcgis.com/152ojN3Ts9H3cdtl/arcgis/rest/services/OM_Flood_Hazard_WebMercator_OpenData/FeatureServer/0/query',
    '152.6,-27.5,153.5,-26.8',
    2000,
    f => ({
      overlay_type: 'moretonbay',
      flood_category: f.properties.OVL_CAT || 'FLOOD_HAZARD',
      risk_level: f.properties.CAT_DESC || f.properties.OVL_CAT || 'Flood Hazard',
      geojson: JSON.stringify(f.geometry)
    })
  )

  // Sunshine Coast: Flooding and Inundation Area (Layer 46)
  total += await ingestArcGIS(
    'sunshinecoast',
    'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/PlanningScheme_SunshineCoast_Overlays_SCC_OpenData/FeatureServer/46/query',
    null,
    2000,
    f => ({
      overlay_type: 'sunshinecoast',
      flood_category: 'Flooding_and_Inundation',
      risk_level: f.properties.DESCRIPT || f.properties.LABEL || 'Flooding and Inundation Area',
      geojson: JSON.stringify(f.geometry)
    })
  )

  // Logan: Flood Hazard Overlay (MapServer/24)
  total += await ingestArcGIS(
    'logan',
    'https://arcgis.lcc.wspdigital.com/server/rest/services/LoganHub/Logan_Planning_Scheme_v9_0_overlays_only_20240716/MapServer/24/query',
    null,
    500,
    f => ({
      overlay_type: 'logan',
      flood_category: f.properties.OVL_CAT || 'FLOOD_HAZARD',
      risk_level: f.properties.CAT_DESC || f.properties.OVL2_DESC || 'Flood Hazard',
      geojson: JSON.stringify(f.geometry)
    })
  )

  // Ipswich: WFS OV5 Flooding Overlay
  total += await ingestIpswich()

  console.log(`\n=== Total inserted: ${total} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
