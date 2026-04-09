// Sprint 21 — NSW School Catchments Ingest (Greater Sydney)
// Source: data.nsw.gov.au catchments.zip — primary + secondary shapefiles
// CRS: GDA94 (EPSG:4283) ≈ WGS84 — treated as 4326
// Run: node scripts/ingest-nsw-schools.js

const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Greater Sydney bounding box
const BBOX = { minLng: 150.3, maxLng: 151.6, minLat: -34.4, maxLat: -33.3 }
const BATCH_SIZE = 50
const CATCHMENTS_DIR = 'C:/Users/steve/AppData/Local/Temp/nsw_catchments'

function inBbox(geom) {
  if (!geom || !geom.coordinates) return false
  const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0]
  if (!coords || !coords.length) return false
  const [lng, lat] = coords[Math.floor(coords.length / 2)]
  return lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat
}

async function insertBatch(records) {
  const { data, error } = await db.rpc('insert_school_catchments_batch', { p_records: records })
  if (error) { console.error('  RPC error:', error.message); return 0 }
  return data ?? 0
}

async function ingestFile(shpPath, dbfPath, schoolType, schoolLevel) {
  console.log(`\nProcessing: ${path.basename(shpPath)} (type=${schoolType})`)
  const source = await shapefile.open(shpPath, dbfPath, { encoding: 'utf-8' })
  let fetched = 0, inserted = 0, skipped = 0, pending = []

  while (true) {
    const result = await source.read()
    if (result.done) break
    const feature = result.value
    fetched++

    if (!feature.geometry || !inBbox(feature.geometry)) { skipped++; continue }

    const props = feature.properties || {}
    const school_name = (props.USE_DESC || '').trim()
    pending.push({
      school_name,
      school_type: schoolType,
      school_level: schoolLevel,
      suburb: null,
      geojson: JSON.stringify(feature.geometry)
    })

    if (pending.length >= BATCH_SIZE) {
      inserted += await insertBatch(pending.splice(0, BATCH_SIZE))
    }
  }

  while (pending.length > 0) {
    inserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  }

  console.log(`  Fetched: ${fetched}, In Sydney bbox: ${fetched - skipped}, Inserted: ${inserted}, Skipped (outside): ${skipped}`)
  return inserted
}

async function main() {
  console.log('=== NSW School Catchments Ingest — Greater Sydney ===')
  let total = 0

  total += await ingestFile(
    `${CATCHMENTS_DIR}/catchments_primary.shp`,
    `${CATCHMENTS_DIR}/catchments_primary.dbf`,
    'primary', 'prep_to_6'
  )
  total += await ingestFile(
    `${CATCHMENTS_DIR}/catchments_secondary.shp`,
    `${CATCHMENTS_DIR}/catchments_secondary.dbf`,
    'secondary', 'year_7_to_12'
  )

  console.log(`\n=== Total inserted: ${total} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
