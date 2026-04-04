/**
 * Imports Brisbane flood overlay GeoJSON into Supabase PostGIS.
 *
 * Run with: npm run import-flood
 *
 * Requires: DATABASE_URL in .env.local
 * Prerequisites: run npm run download-flood first
 *
 * Processes:
 *   data/brisbane-flood-river.geojson   → overlay_type = 'brisbane_river'
 *   data/brisbane-flood-overland.geojson → overlay_type = 'overland_flow'
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

// Risk level mapping — handles various BCC field value formats
// Normalises to lowercase and strips spaces before matching
function mapRiskLevel(rawCategory: string | null | undefined): string {
  if (!rawCategory) return 'unknown'
  const normalised = rawCategory.toLowerCase().replace(/[\s-]/g, '_')
  if (/fpa_?1$|area_?1$|planning_area_1$/.test(normalised)) return 'high'
  if (/fpa_?2a$|area_?2a$|planning_area_2a$/.test(normalised)) return 'high'
  if (/fpa_?2b$|area_?2b$|planning_area_2b$/.test(normalised)) return 'medium'
  if (/fpa_?3$|area_?3$|planning_area_3$/.test(normalised)) return 'medium'
  if (/fpa_?4$|area_?4$|planning_area_4$/.test(normalised)) return 'low'
  if (/fpa_?5$|area_?5$|planning_area_5$/.test(normalised)) return 'low'
  return 'unknown'
}

// Try common BCC field names for the flood category
function extractFloodCategory(props: Record<string, unknown> | null): string | null {
  if (!props) return null
  const candidates = [
    'flood_planning_area', 'fpa_code', 'fpa_class', 'category',
    'flood_level', 'level', 'description', 'flood_type', 'name',
    'area_type', 'flood_area', 'overlay_type', 'area_code',
  ]
  for (const key of candidates) {
    if (props[key] != null) return String(props[key])
  }
  // Return first non-null value if nothing matches
  for (const val of Object.values(props)) {
    if (val != null && typeof val === 'string') return val
  }
  return null
}

interface GeoJSONFeature {
  geometry: { type: string; coordinates: unknown } | null
  properties: Record<string, unknown> | null
}

async function importDataset(
  filePath: string,
  overlayType: string,
  isFirstDataset: boolean
) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath} — run npm run download-flood first`)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const geojson = JSON.parse(raw) as { features: GeoJSONFeature[] }
  const total = geojson.features.length
  console.log(`\nImporting ${overlayType}: ${total} features from ${path.basename(filePath)}`)

  // Log properties from first feature for DECISIONS.md
  if (geojson.features[0]) {
    console.log('  First feature properties:', JSON.stringify(geojson.features[0].properties))
  }

  if (isFirstDataset) {
    console.log('  Truncating flood_overlays...')
    await sql`TRUNCATE TABLE flood_overlays RESTART IDENTITY`
  }

  let inserted = 0
  let skipped = 0

  for (let i = 0; i < total; i++) {
    const feature = geojson.features[i]
    if (!feature.geometry) { skipped++; continue }
    const geomType = feature.geometry.type
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

    const floodCategory = extractFloodCategory(feature.properties)
    const riskLevel = overlayType === 'overland_flow'
      ? 'medium'
      : mapRiskLevel(floodCategory)

    try {
      await sql`
        INSERT INTO flood_overlays (overlay_type, flood_category, risk_level, geometry)
        VALUES (
          ${overlayType},
          ${floodCategory},
          ${riskLevel},
          ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}))::geometry(MultiPolygon, 4326)
        )
      `
      inserted++
    } catch (err) {
      console.error(`  Row ${i} error:`, err)
      skipped++
    }

    if ((i + 1) % 500 === 0 || i + 1 === total) {
      console.log(`  ${i + 1} / ${total} (${inserted} inserted, ${skipped} skipped)`)
    }
  }

  return { inserted, skipped }
}

async function main() {
  console.log('=== ZoneIQ: Import Flood Overlays ===')
  try {
    const riverResult = await importDataset(
      path.join(process.cwd(), 'data/brisbane-flood-river.geojson'),
      'brisbane_river',
      true
    )
    const overlandResult = await importDataset(
      path.join(process.cwd(), 'data/brisbane-flood-overland.geojson'),
      'overland_flow',
      false
    )

    const totalInserted = riverResult.inserted + overlandResult.inserted
    const totalSkipped = riverResult.skipped + overlandResult.skipped
    console.log(`\nDone. Total inserted: ${totalInserted}, skipped: ${totalSkipped}`)

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM flood_overlays`
    console.log(`Rows in flood_overlays: ${count}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
