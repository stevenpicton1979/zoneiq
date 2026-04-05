/**
 * Sprint 12: Seed Logan City Council zone rules.
 * Planning scheme: Logan Planning Scheme 2015 v9.2
 * Zone codes come from the 'Zone' field in the ArcGIS FeatureServer.
 */
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

const zones = [
  { code: 'Low Density Residential', name: 'Low Density Residential', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 6, si: 1.5, re: 6, sec: 'yes', sterm: 'no', hb: 'yes', lot: 600, rules: ['Standard low density residential. Single detached dwellings predominate. Dual occupancy and secondary dwelling subject to code assessment. Min lot 600m².'], perm: ['Dwelling house', 'Secondary dwelling', 'Home based business'], da: ['Dual occupancy', 'Multiple dwelling', 'Childcare centre'], prohib: ['Industry', 'Service station'] },
  { code: 'Low-Medium Density Residential', name: 'Low-Medium Density Residential', cat: 'Residential', ht: 10, st: 3, cov: 55, perm2: 25, fr: 5, si: 1.5, re: 5, sec: 'yes', sterm: 'no', hb: 'yes', lot: 400, rules: ['Low to medium density residential. Allows dual occupancy and townhouses as code assessable. Min lot 400m².'], perm: ['Dwelling house', 'Dual occupancy', 'Multiple dwelling (up to 3)', 'Secondary dwelling'], da: ['Retirement facility', 'Childcare centre', 'Short-term accommodation'], prohib: ['Industry', 'Service station'] },
  { code: 'Medium Density Residential', name: 'Medium Density Residential', cat: 'Residential', ht: 13, st: 4, cov: 65, perm2: 20, fr: 4, si: 1.5, re: 4, sec: 'no', sterm: 'yes', hb: 'no', lot: 300, rules: ['Medium density residential. Apartments, townhouses, unit complexes permitted. Design quality standards apply.'], perm: ['Multiple dwelling', 'Dual occupancy', 'Short-term accommodation'], da: ['Retirement facility', 'Childcare centre', 'Hotel'], prohib: ['Industry', 'Dwelling house (new)'] },
  { code: 'Rural Residential', name: 'Rural Residential', cat: 'Residential', ht: 8.5, st: 2, cov: 20, perm2: 60, fr: 10, si: 5, re: 10, sec: 'yes', sterm: 'no', hb: 'yes', lot: 4000, rules: ['Rural residential on large lots. Single dwelling with rural amenity. Min lot 4,000m². Limited subdivision potential.'], perm: ['Dwelling house', 'Secondary dwelling', 'Animal keeping', 'Home based business'], da: ['Bed and breakfast', 'Dual occupancy'], prohib: ['Multiple dwelling', 'Commercial', 'Industry'] },
  { code: 'Centre', name: 'Centre', cat: 'Commercial', ht: 20, st: 5, cov: 80, perm2: 10, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Activity centre zones including Beenleigh, Springwood, Loganholme. Retail, commercial, office, mixed-use. Residential above ground floor. High design quality required.'], perm: ['Shop', 'Office', 'Food and drink outlet', 'Hotel', 'Multiple dwelling (upper floors)'], da: ['Service station', 'Drive-through', 'Entertainment venue', 'Large format retail'], prohib: ['Heavy industry', 'Rural use'] },
  { code: 'Specialised Centre', name: 'Specialised Centre', cat: 'Commercial', ht: 15, st: 4, cov: 70, perm2: 15, fr: 5, si: 3, re: 5, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Specialised commercial precincts (bulky goods, trade, hospitality). Large format retail, showrooms, hospitality venues.'], perm: ['Large format retail', 'Showroom', 'Food and drink outlet', 'Hotel'], da: ['Shop (standard)', 'Service station', 'Indoor sport'], prohib: ['Dwelling', 'Heavy industry'] },
  { code: 'Mixed Use', name: 'Mixed Use', cat: 'Mixed Use', ht: 15, st: 4, cov: 70, perm2: 15, fr: 3, si: 1.5, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Mixed use zones combining residential with compatible commercial uses. Ground floor commercial encouraged. Upper floor residential permitted.'], perm: ['Multiple dwelling', 'Shop', 'Office', 'Food and drink outlet', 'Short-term accommodation'], da: ['Service station', 'Childcare centre', 'Entertainment venue'], prohib: ['Heavy industry', 'Warehouse'] },
  { code: 'Low Impact Industry', name: 'Low Impact Industry', cat: 'Industrial', ht: 12, st: 3, cov: 70, perm2: 10, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Low impact industrial precincts. Light manufacturing, warehousing, trade services. No offensive odour, noise or emissions.'], perm: ['Low impact industry', 'Warehouse', 'Office (ancillary)', 'Service station'], da: ['Retail showroom', 'Food and drink outlet (ancillary)'], prohib: ['Dwelling', 'Medium/High impact industry'] },
  { code: 'Medium Impact Industry', name: 'Medium Impact Industry', cat: 'Industrial', ht: 15, st: 3, cov: 70, perm2: 10, fr: 8, si: 4, re: 8, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Medium impact industrial. Manufacturing, processing, transport and logistics. Buffer required from sensitive uses.'], perm: ['Medium impact industry', 'Warehouse', 'Low impact industry'], da: ['Office (ancillary)', 'Service station'], prohib: ['Dwelling', 'Retail', 'High impact industry'] },
  { code: 'Rural', name: 'Rural', cat: 'Rural', ht: 8.5, st: 2, cov: 10, perm2: 80, fr: 20, si: 10, re: 20, sec: 'yes', sterm: 'no', hb: 'yes', lot: 100000, rules: ['Rural zone for agricultural and rural production activities. Cropping, grazing, horticulture. Dwellings must be ancillary to rural use. Min lot 100ha for subdivision.'], perm: ['Dwelling house (ancillary to rural use)', 'Farming', 'Animal keeping', 'Roadside stall'], da: ['Rural industry', 'Aquaculture', 'Tourist facility', 'Secondary dwelling'], prohib: ['Urban residential', 'General commercial', 'Industry'] },
  { code: 'Recreation and Open Space', name: 'Recreation and Open Space', cat: 'Open Space', ht: 8, st: 2, cov: 15, perm2: 70, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Parks, reserves, open space corridors and sport/recreation facilities. Development limited to ancillary facilities. Preserves open space network.'], perm: ['Park', 'Outdoor sport and recreation', 'Community use (ancillary)'], da: ['Indoor sport and recreation', 'Club (sports)', 'Food and drink outlet (ancillary)'], prohib: ['Dwelling', 'Commercial', 'Industry'] },
  { code: 'Environmental Management and Conservation', name: 'Environmental Management and Conservation', cat: 'Environmental', ht: null, st: null, cov: 5, perm2: 95, fr: 30, si: 30, re: 30, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Protects areas of significant ecological value including koala habitat, wetlands, waterways, bushland. Development severely restricted. Environmental management activities only.'], perm: ['Nature-based recreation', 'Environmental management'], da: ['Utility installation', 'Walking tracks'], prohib: ['Dwelling', 'Commercial', 'Industry', 'Clearing (native vegetation)'] },
  { code: 'Community Facilities', name: 'Community Facilities', cat: 'Community', ht: 12, st: 3, cov: 60, perm2: 20, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Community infrastructure and services. Schools, hospitals, places of worship, emergency services, cemeteries. Residential use not permitted.'], perm: ['Community use', 'Health care services', 'Educational establishment', 'Place of worship', 'Emergency services'], da: ['Child care centre', 'Retirement facility', 'Ancillary dwelling (caretaker)'], prohib: ['Residential', 'Commercial', 'Industrial'] },
  { code: 'Special Purpose', name: 'Special Purpose', cat: 'Special Purpose', ht: null, st: null, cov: null, perm2: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Site-specific zones for unique or major infrastructure uses (airports, utilities, defence, major sport). Development requirements are site-specific. Contact Logan City Council.'], perm: ['Designated use only'], da: ['Any development consistent with designation'], prohib: ['Uses inconsistent with designation'] },
  { code: 'Emerging Community', name: 'Emerging Community', cat: 'Emerging Community', ht: null, st: null, cov: null, perm2: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Land transitioning from rural to urban. Development generally not permitted until a development sequence approval (structure plan) is in place. Future residential and mixed-use community.'], perm: ['Existing rural use', 'Dwelling house (existing)'], da: ['Any development — subject to development sequence approval'], prohib: ['Urban development (without structure plan approval)'] },
  { code: 'Priority Development Area', name: 'Priority Development Area', cat: 'Special Purpose', ht: null, st: null, cov: null, perm2: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['State-declared Priority Development Areas (PDAs) subject to Economic Development Queensland development schemes, not the Logan Planning Scheme. Development assessed by Economic Development Queensland.'], perm: ['As specified in the applicable PDA development scheme'], da: ['Any development — refer to EDQ development scheme'], prohib: ['Uses inconsistent with PDA scheme'] },
]

async function main() {
  console.log(`Seeding ${zones.length} Logan zone rules...`)

  await sql`DELETE FROM zone_rules WHERE council = 'logan'`
  console.log('Cleared existing logan rules')

  let inserted = 0
  for (const r of zones) {
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
        ${r.code}, ${r.name}, ${r.cat}, 'logan',
        ${r.ht ?? null}, ${r.st ?? null}, ${r.cov ?? null}, ${r.perm2 ?? null},
        ${r.fr ?? null}, ${r.si ?? null}, ${r.re ?? null},
        ${r.sec}, ${r.sterm},
        ${r.hb}, ${r.lot ?? null},
        ${r.rules}, ${r.perm}, ${r.da}, ${r.prohib},
        'https://www.logan.qld.gov.au/planning-building/planning-scheme',
        '2024-01-01'
      )
    `
    inserted++
  }
  console.log(`Inserted ${inserted} zone rules`)

  const missing = await sql`
    SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'logan'
    AND zone_code NOT IN (SELECT zone_code FROM zone_rules WHERE council = 'logan')
    ORDER BY zone_code
  `
  if (missing.length === 0) {
    console.log('All Logan zone codes have matching rules. ✓')
  } else {
    console.log(`Missing rules for ${missing.length} zones:`)
    for (const m of missing) console.log(`  ${m.zone_code}`)
  }

  await sql.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
