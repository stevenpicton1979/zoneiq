// Sprint 20 — NSW Flood Overlay Ingest (Greater Sydney)
// Source: NSW ePlanning Planning_Portal_Hazard MapServer Layer 230 (Flood Planning Map)
// CRS: EPSG:4283 (GDA94) — requested as outSR=4326
// Target: flood_overlays (overlay_type='NSW_EPI', flood_category=LAY_CLASS, risk_level=EPI_NAME)
// Run: node scripts/ingest-nsw-flood.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing env vars'); process.exit(1) }
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const LAYER_URL = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer/230/query'
const BBOX = encodeURIComponent(JSON.stringify({ xmin: 150.3, ymin: -34.4, xmax: 151.6, ymax: -33.3 }))
const PAGE_SIZE = 500
const BATCH_SIZE = 50

function buildUrl(offset) {
  return `${LAYER_URL}?where=1%3D1` +
    `&geometry=${BBOX}&geometryType=esriGeometryEnvelope&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=EPI_NAME%2CLGA_NAME%2CLAY_CLASS` +
    `&outSR=4326&f=geojson` +
    `&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`
}

async function fetchPage(offset, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(buildUrl(offset), { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
      if (!res.ok) { console.log(`  HTTP ${res.status} at offset=${offset}`); return null }
      const data = await res.json()
      if (data.error) { console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`); return null }
      return data.features ?? []
    } catch (e) {
      if (attempt < retries) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_flood_overlays_batch', { p_records: records })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function main() {
  console.log('=== NSW Flood Overlay Ingest — Greater Sydney ===')
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
      const p = feature.properties
      const epi_name = (p.EPI_NAME || p.epi_name || '').trim()
      const lga = (p.LGA_NAME || p.lga_name || 'nsw').toLowerCase().trim() || 'nsw'
      const lay_class = (p.LAY_CLASS || p.lay_class || 'Flood Planning Area').trim()
      lgaCounts[lga] = (lgaCounts[lga] || 0) + 1
      pending.push({
        overlay_type: 'NSW_EPI',
        flood_category: lay_class,
        risk_level: epi_name || 'NSW Flood Planning Area',
        geojson: JSON.stringify(feature.geometry)
      })
    }

    while (pending.length >= BATCH_SIZE) {
      const batch = pending.splice(0, BATCH_SIZE)
      totalInserted += await insertBatch(batch)
    }

    if (features.length < PAGE_SIZE) { console.log('Last page.'); break }
    offset += PAGE_SIZE
  }

  while (pending.length > 0) {
    totalInserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  }

  console.log('\n=== NSW Flood Ingest Complete ===')
  console.log(`Fetched: ${totalFetched}, Inserted: ${totalInserted}, Skipped: ${totalSkipped}`)
  console.log('\nBy LGA:')
  for (const [k, v] of Object.entries(lgaCounts).sort()) console.log(`  ${k}: ${v}`)
}

main().catch(e => { console.error(e); process.exit(1) })
