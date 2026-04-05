const postgres = require('postgres')
const fs = require('fs'), path = require('path')
try {
  const ep = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(ep)) for (const line of fs.readFileSync(ep,'utf-8').split('\n')) {
    const t=line.trim();if(!t||t.startsWith('#'))continue
    const eq=t.indexOf('=');if(eq===-1)continue
    const k=t.slice(0,eq).trim(),v=t.slice(eq+1).trim();if(!process.env[k])process.env[k]=v
  }
} catch {}
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

async function main() {
  // Find the exact zone_code stored in zone_geometries
  const rows = await sql`SELECT DISTINCT zone_code, length(zone_code) as len FROM zone_geometries WHERE council = 'ipswich' AND zone_code LIKE 'Regional Business and Industry%Low%' ORDER BY zone_code`
  console.log('Matching rows:')
  for (const r of rows) {
    console.log(`  len=${r.len} code=${JSON.stringify(r.zone_code)}`)
  }

  // Normalise: update zone_code to strip literal \n and anything after it
  // literal \n = two chars: \ and n
  const updated = await sql`
    UPDATE zone_geometries
    SET zone_code = 'Regional Business and Industry - Low Impact'
    WHERE council = 'ipswich'
    AND zone_code LIKE 'Regional Business and Industry%Low%'
  `
  console.log(`Updated ${updated.count} row(s)`)

  // Verify
  const check = await sql`SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'ipswich' AND zone_code LIKE 'Regional Business%'`
  console.log('After fix:')
  for (const r of check) console.log(`  ${JSON.stringify(r.zone_code)}`)

  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
