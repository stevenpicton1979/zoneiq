/**
 * Imports QLD school catchment boundaries into Supabase PostGIS.
 *
 * Run with: npm run import-schools
 *
 * Requires: DATABASE_URL in .env.local
 * Prerequisites: run npm run download-schools first
 *
 * Processes:
 *   data/qld-school-catchments-primary.geojson   → school_type = 'primary'
 *   data/qld-school-catchments-secondary.geojson → school_type = 'secondary'
 */

import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

// Load .env.local
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch { /* ignore */ }

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' })

// Extract school name from KML-converted GeoJSON properties
// @tmcw/togeojson puts SimpleData values directly as property keys
function extractSchoolName(props: Record<string, unknown> | null): string {
  if (!props) return 'Unknown School'
  const candidates = [
    'name', 'Name', 'school_name', 'SchoolName', 'SCHOOL_NAME',
    'school', 'School', 'site_name', 'SiteName',
  ]
  for (const key of candidates) {
    if (props[key] != null && String(props[key]).trim()) return String(props[key]).trim()
  }
  return 'Unknown School'
}

function extractSuburb(props: Record<string, unknown> | null): string | null {
  if (!props) return null
  const candidates = [
    'suburb', 'Suburb', 'SUBURB', 'locality', 'Locality',
    'town', 'Town', 'area', 'Area',
  ]
  for (const key of candidates) {
    if (props[key] != null) return String(props[key]).trim() || null
  }
  return null
}

interface GeoJSONFeature {
  geometry: { type: string; coordinates: unknown } | null
  properties: Record<string, unknown> | null
}

async function importDataset(
  filePath: string,
  schoolType: 'primary' | 'secondary',
  schoolLevel: string,
  isFirst: boolean
) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath} — run npm run download-schools first`)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const geojson = JSON.parse(raw) as { features: GeoJSONFeature[] }
  const total = geojson.features.length
  console.log(`\nImporting ${schoolType} schools: ${total} features`)

  if (geojson.features[0]) {
    console.log('  First feature properties:', JSON.stringify(geojson.features[0].properties))
  }

  if (isFirst) {
    console.log('  Truncating school_catchments...')
    await sql`TRUNCATE TABLE school_catchments RESTART IDENTITY`
  }

  let inserted = 0
  let skipped = 0

  for (let i = 0; i < total; i++) {
    const feature = geojson.features[i]
    if (!feature.geometry) { skipped++; continue }
    const geomType = feature.geometry.type
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

    const schoolName = extractSchoolName(feature.properties)
    const suburb = extractSuburb(feature.properties)

    try {
      await sql`
        INSERT INTO school_catchments (school_name, school_type, school_level, suburb, geometry)
        VALUES (
          ${schoolName},
          ${schoolType},
          ${schoolLevel},
          ${suburb},
          ST_Force2D(ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})))::geometry(MultiPolygon, 4326)
        )
      `
      inserted++
    } catch (err) {
      console.error(`  Row ${i} (${schoolName}) error:`, err)
      skipped++
    }

    if ((i + 1) % 500 === 0 || i + 1 === total) {
      console.log(`  ${i + 1} / ${total} (${inserted} inserted, ${skipped} skipped)`)
    }
  }

  return { inserted, skipped }
}

async function main() {
  console.log('=== ZoneIQ: Import School Catchments ===')
  try {
    const primaryResult = await importDataset(
      path.join(process.cwd(), 'data/qld-school-catchments-primary.geojson'),
      'primary',
      'prep_to_6',
      true
    )
    const secondaryResult = await importDataset(
      path.join(process.cwd(), 'data/qld-school-catchments-secondary.geojson'),
      'secondary',
      'year_7_to_10',
      false
    )

    const totalInserted = primaryResult.inserted + secondaryResult.inserted
    const totalSkipped = primaryResult.skipped + secondaryResult.skipped
    console.log(`\nDone. Total inserted: ${totalInserted}, skipped: ${totalSkipped}`)

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM school_catchments`
    console.log(`Rows in school_catchments: ${count}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
