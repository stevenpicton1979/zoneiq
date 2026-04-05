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
const rules = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ipswich-zone-rules-seed.json'), 'utf-8'))

async function main() {
  console.log(`Seeding ${rules.length} Ipswich zone rules...`)

  // Delete existing ipswich rules
  await sql`DELETE FROM zone_rules WHERE council = 'ipswich'`
  console.log('Cleared existing ipswich rules')

  let inserted = 0
  for (const r of rules) {
    // key_rules is text[] in DB — wrap string in array
    const keyRulesArr = Array.isArray(r.key_rules) ? r.key_rules : [r.key_rules]
    // boolean-like fields are stored as text 'yes'/'no'
    const secDwelling = r.secondary_dwelling_permitted ? 'yes' : 'no'
    const shortTerm = r.short_term_accom_permitted ? 'yes' : 'no'
    const homeBiz = r.home_business_permitted ? 'yes' : 'no'

    await sql`
      INSERT INTO zone_rules (
        zone_code, zone_name, zone_category, council,
        max_height_m, max_storeys, max_site_coverage_pct, min_permeability_pct,
        front_setback_m, side_setback_m, rear_setback_m,
        secondary_dwelling_permitted, short_term_accom_permitted,
        home_business_permitted, subdivision_min_lot_size_m2,
        key_rules, permitted_uses, requires_permit_uses, prohibited_uses,
        source_url, last_verified
      ) VALUES (
        ${r.zone_code}, ${r.zone_name}, ${r.zone_category}, ${r.council},
        ${r.max_height_m}, ${r.max_storeys}, ${r.max_site_coverage_pct}, ${r.min_permeability_pct},
        ${r.front_setback_m}, ${r.side_setback_m}, ${r.rear_setback_m},
        ${secDwelling}, ${shortTerm},
        ${homeBiz}, ${r.subdivision_min_lot_size_m2},
        ${keyRulesArr}, ${r.permitted_uses}, ${r.requires_permit_uses}, ${r.prohibited_uses},
        ${r.source_url}, ${r.last_verified}
      )
    `
    inserted++
  }

  console.log(`Inserted ${inserted} zone rules`)

  // Check what zones exist in geometries but not in rules
  const missing = await sql`
    SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'ipswich'
    AND zone_code NOT IN (SELECT zone_code FROM zone_rules WHERE council = 'ipswich')
    ORDER BY zone_code
    LIMIT 30
  `
  if (missing.length > 0) {
    console.log(`\nZone codes in geometries but missing rules (${missing.length}):`)
    for (const m of missing) console.log(`  ${m.zone_code}`)
  } else {
    console.log('\nAll zone codes have matching rules.')
  }

  await sql.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
