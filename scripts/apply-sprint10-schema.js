const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

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
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
} catch {}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const sql = postgres(DATABASE_URL, { ssl: 'require' })

async function main() {
  console.log('Applying Sprint 10 schema...')

  await sql`
    CREATE TABLE IF NOT EXISTS noise_overlays (
      id bigserial PRIMARY KEY,
      geometry geometry(MultiPolygon, 4326) NOT NULL,
      airport text,
      anef_contour text,
      anef_label text
    )
  `
  console.log('Table noise_overlays: OK')

  await sql`
    CREATE INDEX IF NOT EXISTS noise_overlays_geometry_idx ON noise_overlays USING GIST (geometry)
  `
  console.log('Index noise_overlays_geometry_idx: OK')

  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION get_noise_for_point(lat float, lng float)
    RETURNS jsonb LANGUAGE sql STABLE AS $
      SELECT jsonb_build_object(
        'has_noise_overlay', true,
        'airport', airport,
        'anef_contour', anef_contour,
        'anef_label', anef_label
      )
      FROM noise_overlays
      WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
      ORDER BY anef_contour::int DESC
      LIMIT 1;
    $
  `)
  console.log('Function get_noise_for_point: OK')

  await sql.end()
  console.log('Sprint 10 schema applied.')
}

main().catch(e => { console.error(e); process.exit(1) })
