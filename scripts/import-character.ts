/**
 * Imports Brisbane Dwelling House Character Overlay into Supabase PostGIS.
 *
 * Run with: npm run import-character
 *
 * Requires: DATABASE_URL in .env.local
 * Prerequisites: run npm run download-character first
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

// Actual BCC field: ovl2_cat e.g. "CHA_DHC", ovl2_desc e.g. "Dwelling house character"
// Use ovl2_desc as the human-readable character_type
function extractCharacterType(props: Record<string, unknown> | null): string | null {
  if (!props) return null
  return String(props['ovl2_desc'] ?? props['ovl2_cat'] ?? props['cat_desc'] ?? '')
    .trim() || null
}

interface GeoJSONFeature {
  geometry: { type: string; coordinates: unknown } | null
  properties: Record<string, unknown> | null
}

async function main() {
  console.log('=== ZoneIQ: Import Character Overlay ===')

  const filePath = path.join(process.cwd(), 'data/brisbane-character-overlay.geojson')
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath} — run npm run download-character first`)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const geojson = JSON.parse(raw) as { features: GeoJSONFeature[] }
  const total = geojson.features.length
  console.log(`Loading ${total} features`)

  if (geojson.features[0]) {
    console.log('First feature properties:', JSON.stringify(geojson.features[0].properties))
  }

  try {
    console.log('Truncating character_overlays...')
    await sql`TRUNCATE TABLE character_overlays RESTART IDENTITY`

    let inserted = 0
    let skipped = 0

    for (let i = 0; i < total; i++) {
      const feature = geojson.features[i]
      if (!feature.geometry) { skipped++; continue }
      const geomType = feature.geometry.type
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') { skipped++; continue }

      const characterType = extractCharacterType(feature.properties)

      try {
        await sql`
          INSERT INTO character_overlays (character_type, geometry)
          VALUES (
            ${characterType},
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

    console.log(`\nDone. Inserted: ${inserted}, skipped: ${skipped}`)
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM character_overlays`
    console.log(`Rows in character_overlays: ${count}`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
