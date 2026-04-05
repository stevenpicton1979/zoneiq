const postgres = require('postgres')
const fs = require('fs'), path = require('path')
try {
  const ep = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(ep)) for (const line of fs.readFileSync(ep,'utf-8').split('\n')) {
    const t = line.trim(); if (!t||t.startsWith('#')) continue
    const eq = t.indexOf('='); if (eq===-1) continue
    const k=t.slice(0,eq).trim(),v=t.slice(eq+1).trim(); if(!process.env[k]) process.env[k]=v
  }
} catch {}
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })
async function main() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'zone_geometries' ORDER BY ordinal_position`
  console.log('zone_geometries columns:', cols.map(c=>c.column_name))
  await sql.end()
}
main().catch(e=>{console.error(e);process.exit(1)})
