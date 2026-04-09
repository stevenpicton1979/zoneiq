// Sprint 23 — VIC School Zones Ingest (Greater Melbourne)
// Source: discover.data.vic.gov.au — dv371_DataVic_School_Zones_2024.zip
// Files: Primary_Integrated_2024.geojson, Secondary_Integrated_Year7_2024.geojson
// CRS: WGS84 (CRS84) — no transform required
// Run: node scripts/ingest-vic-schools.js

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.+?)"?\s*$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const SCHOOLS_DIR = 'C:/Users/steve/AppData/Local/Temp/vic_schools'
// Greater Melbourne bounding box
const BBOX = { minLng: 144.4, maxLng: 145.6, minLat: -38.5, maxLat: -37.4 }
const BATCH_SIZE = 50

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

async function ingestGeoJSON(filePath, schoolType, schoolLevel) {
  console.log(`\nProcessing: ${path.basename(filePath)} (type=${schoolType}, level=${schoolLevel})`)
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const features = raw.features || []
  let fetched = 0, inserted = 0, skipped = 0, pending = []

  for (const feature of features) {
    fetched++
    if (!feature.geometry || !inBbox(feature.geometry)) { skipped++; continue }
    const props = feature.properties || {}
    const school_name = (props.School_Name || props.USE_DESC || '').trim()
    pending.push({
      school_name,
      school_type: schoolType,
      school_level: schoolLevel,
      suburb: null,
      geojson: JSON.stringify(feature.geometry)
    })
    if (pending.length >= BATCH_SIZE) inserted += await insertBatch(pending.splice(0, BATCH_SIZE))
  }

  while (pending.length > 0) inserted += await insertBatch(pending.splice(0, BATCH_SIZE))

  console.log(`  Total: ${fetched}, In Melbourne bbox: ${fetched - skipped}, Inserted: ${inserted}, Skipped: ${skipped}`)
  return inserted
}

async function main() {
  console.log('=== VIC School Zones Ingest — Greater Melbourne ===')
  let total = 0

  total += await ingestGeoJSON(
    `${SCHOOLS_DIR}/Primary_Integrated_2024.geojson`,
    'primary', 'prep_to_6'
  )
  total += await ingestGeoJSON(
    `${SCHOOLS_DIR}/Secondary_Integrated_Year7_2024.geojson`,
    'secondary', 'year_7_to_12'
  )

  console.log(`\n=== Total inserted: ${total} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
