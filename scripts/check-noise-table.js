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
  const cols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'noise_overlays' ORDER BY ordinal_position`
  console.log('noise_overlays columns:', cols)
  const cnt = await sql`SELECT count(*) FROM noise_overlays`
  console.log('row count:', cnt[0].count)
  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
