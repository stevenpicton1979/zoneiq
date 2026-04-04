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

// Risk level mapping for Brisbane River flood planning areas.
// Actual field: ovl2_cat (e.g. "FHA_R1", "FHA_R2A", "FHA_R2B", "FHA_R3", "FHA_R4", "FHA_R5")
// Also handles description text like "Brisbane River flood planning area 2b"
function mapRiverRiskLevel(rawCategory: string | null | undefined): string {
  if (!rawCategory) return 'unknown'
  const n = rawCategory.toLowerCase().replace(/[\s\-_]/g, '')
  if (/r1$|area1$|fpa1$/.test(n)) return 'high'
  if (/r2a$|area2a$|fpa2a$/.test(n)) return 'high'
  if (/r2b$|area2b$|fpa2b$/.test(n)) return 'medium'
  if (/r3$|area3$|fpa3$/.test(n)) return 'medium'
  if (/r4$|area4$|fpa4$/.test(n)) return 'low'
  if (/r5$|area5$|fpa5$/.test(n)) return 'low'
  return 'unknown'
}

// Risk level mapping for overland flow.
// Actual field: FLOOD_RISK with values "Low", "Medium", "High"
function mapOverlandRiskLevel(rawRisk: string | null | undefined): string {
  if (!rawRisk) return 'unknown'
  const n = rawRisk.toLowerCase()
  if (n === 'high') return 'high'
  if (n === 'medium') return 'medium'
  if (n === 'low') return 'low'
  return 'unknown'
}

// Extract flood category for Brisbane River dataset
// Primary field: ovl2_cat (BCC code like "FHA_R2B")
// Fallback: ovl2_desc (human-readable description)
function extractRiverCategory(props: Record<string, unknown> | null): string | null {
  if (!props) return null
  return String(props['ovl2_cat'] ?? props['ovl2_desc'] ?? props['description'] ?? '')
    .trim() || null
}

// Extract risk level for overland flow dataset
// Primary field: FLOOD_RISK (uppercase, direct value "Low"/"Medium"/"High")
function extractOverlandRiskLevel(props: Record<string, unknown> | null): string {
  if (!props) return 'unknown'
  return mapOverlandRiskLevel(String(props['FLOOD_RISK'] ?? props['flood_risk'] ?? ''))
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

    const floodCategory = overlayType === 'overland_flow'
      ? (String(feature.properties?.['FLOOD_RISK'] ?? feature.properties?.['flood_risk'] ?? 'unknown'))
      : extractRiverCategory(feature.properties)
    const riskLevel = overlayType === 'overland_flow'
      ? extractOverlandRiskLevel(feature.properties)
      : mapRiverRiskLevel(floodCategory)

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
