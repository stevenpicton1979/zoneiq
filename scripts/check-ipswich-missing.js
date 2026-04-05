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
  const missing = await sql`
    SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'ipswich'
    AND zone_code NOT IN (SELECT zone_code FROM zone_rules WHERE council = 'ipswich')
    ORDER BY zone_code
  `
  if (missing.length === 0) {
    console.log('All Ipswich zones have rules. ✓')
  } else {
    console.log(`Missing (${missing.length}):`)
    for (const m of missing) console.log(`  ${JSON.stringify(m.zone_code)}`)
  }
  const total = await sql`SELECT count(*) FROM zone_geometries WHERE council = 'ipswich'`
  const rules = await sql`SELECT count(*) FROM zone_rules WHERE council = 'ipswich'`
  console.log(`\nTotal geometries: ${total[0].count}, Total rules: ${rules[0].count}`)
  await sql.end()
}
main().catch(e=>{console.error(e);process.exit(1)})
