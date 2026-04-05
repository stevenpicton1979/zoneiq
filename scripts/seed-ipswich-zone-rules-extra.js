/**
 * Supplementary Ipswich zone rules — covers zones missing from the main seed:
 * Rural C/D/E, Regional Business variants, Township zones, SF precincts,
 * and truncated-name variants from the WFS source data.
 */
const postgres = require('postgres')
const fs = require('fs'), path = require('path')

try {
  const ep = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(ep)) for (const line of fs.readFileSync(ep, 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('='); if (eq === -1) continue
    const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
} catch {}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

const extra = [
  // Rural sub-zones (same rules as Rural B/A)
  { code: 'Rural C', name: 'Rural C', cat: 'Rural', ht: 8.5, st: 2, cov: 10, perm: 80, fr: 15, si: 10, re: 15, sec: 'yes', sterm: 'no', hb: 'yes', lot: 40000, rules: ['Rural zone C. Mixed farming and low-intensity rural uses.'], perm_uses: ['Dwelling house','Farming','Animal keeping'], da_uses: ['Rural industry','Bed and breakfast'], prohib: ['Urban residential','Retail'] },
  { code: 'Rural D', name: 'Rural D', cat: 'Rural', ht: 8.5, st: 2, cov: 10, perm: 80, fr: 15, si: 10, re: 15, sec: 'yes', sterm: 'no', hb: 'yes', lot: 40000, rules: ['Rural zone D. Mixed farming and rural uses.'], perm_uses: ['Dwelling house','Farming'], da_uses: ['Rural industry'], prohib: ['Urban residential','Retail'] },
  { code: 'Rural E', name: 'Rural E', cat: 'Rural', ht: 8.5, st: 2, cov: 10, perm: 80, fr: 15, si: 10, re: 15, sec: 'yes', sterm: 'no', hb: 'yes', lot: 40000, rules: ['Rural zone E. Low-intensity rural and conservation uses.'], perm_uses: ['Dwelling house','Farming','Nature-based recreation'], da_uses: ['Rural industry','Camping'], prohib: ['Urban residential','Retail'] },
  { code: 'Rural Constrained - Ripley Valley', name: 'Rural Constrained - Ripley Valley', cat: 'Rural', ht: null, st: null, cov: 5, perm: 90, fr: 30, si: 20, re: 30, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Constrained rural land in Ripley Valley. Subject to future urban development investigations. Limited development permitted pending resolution of constraints.'], perm_uses: ['Existing rural use'], da_uses: ['Any development'], prohib: ['Urban development (without rezoning)'] },
  // Regional Business and Industry
  { code: 'Regional Business and Industry - Low Impact', name: 'Regional Business and Industry - Low Impact', cat: 'Industrial', ht: 15, st: 3, cov: 65, perm: 15, fr: 8, si: 4, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Regional-scale low impact industry. Manufacturing, warehousing, distribution. Good separation from residential.'], perm_uses: ['Low impact industry','Warehouse','Office'], da_uses: ['Retail store','Food and drink outlet'], prohib: ['Dwelling','High impact industry'] },
  { code: 'Regional Business and Industry - Medium Impact', name: 'Regional Business and Industry - Medium Impact', cat: 'Industrial', ht: 15, st: 3, cov: 65, perm: 10, fr: 10, si: 6, re: 8, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Regional-scale medium impact industry. Larger manufacturing and industrial operations. Buffer separation from sensitive land uses required.'], perm_uses: ['Medium impact industry','Warehouse'], da_uses: ['Low impact industry','Office'], prohib: ['Dwelling','Retail'] },
  { code: 'Regional Business and Industry Buffer', name: 'Regional Business and Industry Buffer', cat: 'Industrial', ht: 10, st: 2, cov: 40, perm: 30, fr: 8, si: 4, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Buffer zone between regional industry and sensitive uses. Restricted development.'], perm_uses: ['Low impact service industry'], da_uses: ['Ancillary office'], prohib: ['Dwelling','High impact industry','Retail'] },
  { code: 'Regional Business and Industry Investigation', name: 'Regional Business and Industry Investigation', cat: 'Industrial', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Area under investigation for future regional business and industry designation. Existing uses permitted. New industrial development subject to scheme amendment.'], perm_uses: ['Existing use rights'], da_uses: ['Any new development'], prohib: ['Urban industrial (without amendment)'] },
  // Truncated variants from WFS data (literal \n in NAME field)
  { code: 'Regional Business and Industry\n(Low Impact Sub Ar', name: 'Regional Business and Industry - Low Impact', cat: 'Industrial', ht: 15, st: 3, cov: 65, perm: 15, fr: 8, si: 4, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Regional-scale low impact industry sub-area.'], perm_uses: ['Low impact industry','Warehouse','Office'], da_uses: ['Retail store'], prohib: ['Dwelling','High impact industry'] },
  { code: 'Regional Business and Industry(Med Impact SubArea)', name: 'Regional Business and Industry - Medium Impact', cat: 'Industrial', ht: 15, st: 3, cov: 65, perm: 10, fr: 10, si: 6, re: 8, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Regional-scale medium impact industry sub-area.'], perm_uses: ['Medium impact industry','Warehouse'], da_uses: ['Low impact industry'], prohib: ['Dwelling','Retail'] },
  { code: 'Regional Business and Industry Buffer\nRBB01', name: 'Regional Business and Industry Buffer', cat: 'Industrial', ht: 10, st: 2, cov: 40, perm: 30, fr: 8, si: 4, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Buffer zone between regional industry and sensitive uses.'], perm_uses: ['Low impact service industry'], da_uses: ['Ancillary office'], prohib: ['Dwelling','Retail'] },
  // Local Business variants
  { code: 'Local Business and Industry Buffer', name: 'Local Business and Industry Buffer', cat: 'Industrial', ht: 10, st: 2, cov: 40, perm: 25, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Buffer zone between local business and industry areas and surrounding land uses.'], perm_uses: ['Low impact service industry'], da_uses: ['Office (ancillary)'], prohib: ['Dwelling','Retail'] },
  { code: 'Local Business and Industry Investigation', name: 'Local Business and Industry Investigation', cat: 'Industrial', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Area under investigation for future local business and industry designation.'], perm_uses: ['Existing use rights'], da_uses: ['Any development'], prohib: ['Urban use (without amendment)'] },
  // CBD zones
  { code: 'CBD Medical Services', name: 'CBD Medical Services', cat: 'Commercial', ht: 20, st: 5, cov: 80, perm: 10, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Medical services zone in Ipswich CBD. Hospitals, specialist medical, allied health. Residential above ground floor may be permitted.'], perm_uses: ['Medical centre','Hospital','Health care services'], da_uses: ['Office','Residential (upper floors)','Food and drink outlet (ancillary)'], prohib: ['Heavy industry','Retail (non-medical)'] },
  { code: 'CBD North Secondary Business', name: 'CBD North Secondary Business', cat: 'Commercial', ht: 15, st: 4, cov: 80, perm: 10, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Secondary business zone north of Ipswich CBD. Office, service commercial, mixed use.'], perm_uses: ['Office','Service industry','Food and drink outlet'], da_uses: ['Multiple dwelling (upper floors)','Hotel','Shop'], prohib: ['Heavy industry','Large format retail'] },
  { code: 'Top of Town', name: 'Top of Town', cat: 'Commercial', ht: 15, st: 4, cov: 80, perm: 10, fr: 0, si: 0, re: 0, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Top of Town precinct — upper CBD commercial. Office, retail, civic. Part of Ipswich CBD revitalisation area.'], perm_uses: ['Office','Shop','Food and drink outlet','Civic use'], da_uses: ['Hotel','Multiple dwelling (upper floors)'], prohib: ['Heavy industry'] },
  // Township zones
  { code: 'Township Business', name: 'Township Business', cat: 'Commercial', ht: 10, st: 2, cov: 70, perm: 15, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Business zone in outlying Ipswich townships. Small-scale retail, service commercial.'], perm_uses: ['Shop','Office','Food and drink outlet'], da_uses: ['Service station','Motel'], prohib: ['Heavy industry','Multiple dwelling'] },
  { code: 'Township Character Housing', name: 'Township Character Housing', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 6, si: 1.5, re: 6, sec: 'yes', sterm: 'no', hb: 'yes', lot: 600, rules: ['Character housing in outlying townships. Protects traditional township residential character. Pre-1947 dwellings may be protected.'], perm_uses: ['Dwelling house','Secondary dwelling','Home business'], da_uses: ['Dual occupancy','Demolition of character dwelling'], prohib: ['Industry','Commercial'] },
  { code: 'Township Character Mixed Use', name: 'Township Character Mixed Use', cat: 'Mixed Use', ht: 10, st: 3, cov: 65, perm: 15, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Mixed use with character provisions in outlying townships. Ground floor commercial, upper residential. Character-compatible design required.'], perm_uses: ['Shop','Office','Food and drink outlet','Dwelling (upper floors)'], da_uses: ['Service station','Multiple dwelling'], prohib: ['Heavy industry'] },
  // Springfield (SF) precincts
  { code: 'Community Residential', name: 'Community Residential', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 6, si: 1.5, re: 6, sec: 'yes', sterm: 'no', hb: 'yes', lot: 400, rules: ['Springfield community residential precinct. Planned urban community with integrated open space and amenity.'], perm_uses: ['Dwelling house','Secondary dwelling','Home business'], da_uses: ['Dual occupancy','Childcare centre'], prohib: ['Industry','Commercial'] },
  { code: 'Open Space', name: 'Open Space', cat: 'Open Space', ht: 6, st: 1, cov: 5, perm: 90, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Springfield open space precinct. Parks, linear parkways, recreational corridors. Development limited to ancillary facilities.'], perm_uses: ['Park','Walking trails','Outdoor recreation'], da_uses: ['Community facility (ancillary)'], prohib: ['Dwelling','Commercial','Industry'] },
  { code: 'SF Town Centre', name: 'SF Town Centre', cat: 'Commercial', ht: 20, st: 5, cov: 80, perm: 10, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Springfield Town Centre — major activity centre for the Springfield growth corridor. Retail, office, residential towers, civic uses.'], perm_uses: ['Shop','Office','Hotel','Multiple dwelling (upper floors)','Food and drink outlet'], da_uses: ['Entertainment venue','Cinema','Service station'], prohib: ['Heavy industry','Rural use'] },
  { code: 'Regional Transport Corridor', name: 'Regional Transport Corridor', cat: 'Special Purpose', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Reserved for regional transport infrastructure (roads, rail, busways). Development not permitted except infrastructure-related works.'], perm_uses: ['Transport infrastructure'], da_uses: ['Utility installation (ancillary)'], prohib: ['Residential','Commercial','Industry'] },
  { code: 'Sub-Urban (T3) - Ripley Valley', name: 'Sub-Urban (T3) - Ripley Valley', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 4, si: 1.5, re: 4, sec: 'yes', sterm: 'no', hb: 'yes', lot: 300, rules: ['Sub-Urban T3 zone in Ripley Valley growth corridor. Medium-low density planned community. Small lots permitted with communal open space.'], perm_uses: ['Dwelling house','Dual occupancy','Secondary dwelling'], da_uses: ['Multiple dwelling','Childcare centre'], prohib: ['Industry','Commercial'] },
  // Recreation Ripley Valley
  { code: 'Recreation - Ripley Valley', name: 'Recreation - Ripley Valley', cat: 'Open Space', ht: 8, st: 2, cov: 15, perm: 70, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Recreation precinct in Ripley Valley growth corridor. Community parks, sports fields, linear open space.'], perm_uses: ['Outdoor sport and recreation','Park'], da_uses: ['Indoor sport (ancillary)','Community facility'], prohib: ['Dwelling','Retail','Industry'] },
  // Special Uses Ripley Valley
  { code: 'Special Uses - Ripley Valley', name: 'Special Uses - Ripley Valley', cat: 'Special Purpose', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Special use zones in Ripley Valley for specific designated facilities. Uses are site-specific. Refer to Ripley Valley Urban Development Area documentation.'], perm_uses: ['Designated use only'], da_uses: ['Any development'], prohib: ['Non-designated uses'] },
  // Showgrounds / Service Trade
  { code: 'Service Trade and Showgrounds', name: 'Service Trade and Showgrounds', cat: 'Industrial', ht: 12, st: 3, cov: 65, perm: 15, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Service trade and showground uses. Automotive, machinery, trade services, showgrounds and equestrian facilities.'], perm_uses: ['Service industry','Showroom','Trade supply','Showgrounds'], da_uses: ['Outdoor sales','Equestrian facility'], prohib: ['Dwelling','Shop (general retail)'] },
  { code: 'Showgrounds, Sport, Recreation, Service Trades an', name: 'Showgrounds, Sport, Recreation, Service Trades and Service Industries', cat: 'Mixed', ht: 12, st: 3, cov: 60, perm: 20, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Mixed zone combining showgrounds, sport, recreation and service trade uses. Includes the Ipswich Showground precinct.'], perm_uses: ['Showgrounds','Outdoor sport','Service industry','Trade supply'], da_uses: ['Indoor sport','Food and drink outlet (ancillary)'], prohib: ['Dwelling','General retail'] },
  // Other
  { code: 'Business Incubator', name: 'Business Incubator', cat: 'Commercial', ht: 10, st: 2, cov: 60, perm: 20, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Business incubator zone for emerging businesses and light commercial. Office, light industry, technology uses. Designed to support business start-ups.'], perm_uses: ['Office','Light industry','Research and technology'], da_uses: ['Retail (ancillary)','Food and drink outlet (ancillary)'], prohib: ['Dwelling','Heavy industry','General retail'] },
  { code: 'Bundamba Racecourse Stables Area', name: 'Bundamba Racecourse Stables Area', cat: 'Special Purpose', ht: 8, st: 2, cov: 30, perm: 40, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Special precinct for the Bundamba Racecourse stables and associated equestrian uses. Development limited to equestrian and ancillary purposes.'], perm_uses: ['Equestrian facility','Stable','Associated infrastructure'], da_uses: ['Caretaker dwelling'], prohib: ['Residential (general)','Commercial','Industry'] },
]

async function main() {
  console.log(`Inserting ${extra.length} supplementary Ipswich zone rules...`)
  let inserted = 0, skipped = 0
  for (const r of extra) {
    try {
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
          ${r.code}, ${r.name}, ${r.cat}, 'ipswich',
          ${r.ht}, ${r.st}, ${r.cov}, ${r.perm},
          ${r.fr}, ${r.si}, ${r.re},
          ${r.sec}, ${r.sterm},
          ${r.hb}, ${r.lot},
          ${r.rules}, ${r.perm_uses}, ${r.da_uses}, ${r.prohib},
          'https://www.legislation.qld.gov.au/view/html/inforce/current/sl-2006-0136',
          '2024-01-01'
        )
        ON CONFLICT (zone_code, council) DO NOTHING
      `
      inserted++
    } catch (e) {
      console.error(`  Error (${r.code}): ${e.message}`)
      skipped++
    }
  }
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`)

  // Final check
  const missing = await sql`
    SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'ipswich'
    AND zone_code NOT IN (SELECT zone_code FROM zone_rules WHERE council = 'ipswich')
    ORDER BY zone_code
  `
  if (missing.length > 0) {
    console.log(`\nStill missing rules for ${missing.length} zone codes:`)
    for (const m of missing) console.log(`  "${m.zone_code}"`)
  } else {
    console.log('\nAll Ipswich zone codes have matching rules. ✓')
  }

  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
