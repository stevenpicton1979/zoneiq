// Sprint 19 — NSW Zoning Ingest (Greater Sydney)
// Source: NSW ePlanning Portal — Planning_Portal_Principal_Planning MapServer Layer 19 (Land Zoning Map)
// CRS: EPSG:4283 (GDA94) — requested as outSR=4326 so ArcGIS reprojects to WGS84
// Target: zone_geometries, council = LGA_NAME (lowercased)
// Run: node scripts/ingest-nsw-zoning.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const LAYER_URL = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/19/query'
const BBOX = encodeURIComponent(JSON.stringify({ xmin: 150.3, ymin: -34.4, xmax: 151.6, ymax: -33.3 }))
const PAGE_SIZE = 1000
const BATCH_SIZE = 50 // RPC batch size

function buildUrl(offset) {
  return `${LAYER_URL}?where=1%3D1` +
    `&geometry=${BBOX}&geometryType=esriGeometryEnvelope&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=SYM_CODE%2CLGA_NAME` +
    `&outSR=4326&f=geojson` +
    `&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`
}

async function fetchPage(offset, retries = 3) {
  const url = buildUrl(offset)
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' } })
      if (!res.ok) {
        console.log(`  HTTP ${res.status} at offset=${offset} attempt ${attempt}`)
        if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue }
        return null
      }
      const data = await res.json()
      if (data.error) {
        console.log(`  ArcGIS error: ${JSON.stringify(data.error)}`)
        return null
      }
      return data.features ?? []
    } catch (e) {
      console.log(`  Network error (attempt ${attempt}): ${e.message}`)
      if (attempt < retries) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_zone_geometries_batch', { p_records: records })
  if (error) {
    console.error('  RPC error:', error.message)
    return 0
  }
  return data ?? 0
}

async function main() {
  console.log('=== NSW Zoning Ingest — Greater Sydney ===')
  console.log(`Source: ePlanning Planning_Portal_Principal_Planning Layer 19`)
  console.log(`Bounding box: xmin=150.3, ymin=-34.4, xmax=151.6, ymax=-33.3\n`)

  let totalFetched = 0
  let totalInserted = 0
  let totalSkipped = 0
  let offset = 0
  let pending = []
  const lgaCounts = {}

  while (true) {
    console.log(`Fetching offset=${offset}...`)
    const features = await fetchPage(offset)

    if (features === null) {
      console.log('Fetch failed — stopping.')
      break
    }
    if (features.length === 0) {
      console.log('No more features.')
      break
    }

    totalFetched += features.length

    for (const feature of features) {
      if (!feature.geometry || !feature.properties) { totalSkipped++; continue }
      const geojson = JSON.stringify(feature.geometry)
      const zone_code = (feature.properties.SYM_CODE || feature.properties.sym_code || '').trim()
      const council = (feature.properties.LGA_NAME || feature.properties.lga_name || '').toLowerCase().trim()
      if (!zone_code || !council) { totalSkipped++; continue }
      lgaCounts[council] = (lgaCounts[council] || 0) + 1
      pending.push({ zone_code, council, geojson })
    }

    // Flush batches
    while (pending.length >= BATCH_SIZE) {
      const batch = pending.splice(0, BATCH_SIZE)
      const n = await insertBatch(batch)
      totalInserted += n
      if ((totalInserted % 500) === 0 || totalInserted < 100) {
        console.log(`  Inserted ${totalInserted} so far...`)
      }
    }

    if (totalFetched % 5000 < PAGE_SIZE) {
      console.log(`Progress: fetched=${totalFetched} inserted=${totalInserted} skipped=${totalSkipped}`)
    }

    if (features.length < PAGE_SIZE) {
      console.log('Last page reached.')
      break
    }
    offset += PAGE_SIZE
  }

  // Flush remaining
  while (pending.length > 0) {
    const batch = pending.splice(0, BATCH_SIZE)
    const n = await insertBatch(batch)
    totalInserted += n
  }

  console.log('\n=== Ingest complete ===')
  console.log(`Total fetched: ${totalFetched}`)
  console.log(`Total inserted: ${totalInserted}`)
  console.log(`Total skipped: ${totalSkipped}`)
  console.log('\nRecords by LGA:')
  for (const [lga, count] of Object.entries(lgaCounts).sort()) {
    console.log(`  ${lga}: ${count}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
