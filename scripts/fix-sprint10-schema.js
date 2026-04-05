const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
} catch {}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

async function main() {
  // Add anef_label column if missing
  await sql`ALTER TABLE noise_overlays ADD COLUMN IF NOT EXISTS anef_label text`
  console.log('Column anef_label: OK')

  // Create GiST index on geom column
  await sql`CREATE INDEX IF NOT EXISTS noise_overlays_geom_idx ON noise_overlays USING GIST (geom)`
  console.log('Index noise_overlays_geom_idx: OK')

  // Create/replace function using correct column name 'geom'
  const fnBody = [
    'CREATE OR REPLACE FUNCTION get_noise_for_point(lat float, lng float)',
    'RETURNS jsonb LANGUAGE sql STABLE AS',
    '$$',
    '  SELECT jsonb_build_object(',
    "    'has_noise_overlay', true,",
    "    'airport', airport,",
    "    'anef_contour', anef_contour,",
    "    'anef_label', anef_label",
    '  )',
    '  FROM noise_overlays',
    '  WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326))',
    '  ORDER BY anef_contour::int DESC',
    '  LIMIT 1;',
    '$$',
  ].join('\n')
  await sql.unsafe(fnBody)
  console.log('Function get_noise_for_point: OK')

  // Show existing data
  const rows = await sql`SELECT airport, anef_contour, anef_label, count(*) FROM noise_overlays GROUP BY airport, anef_contour, anef_label ORDER BY airport, anef_contour`
  console.log('Existing data:')
  for (const r of rows) console.log(' ', r)

  await sql.end()
  console.log('Sprint 10 schema fixed.')
}

main().catch(e => { console.error(e); process.exit(1) })
