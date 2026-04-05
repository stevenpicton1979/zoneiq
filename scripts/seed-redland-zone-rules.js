/**
 * Sprint 13: Seed Redland City Council zone rules.
 * Planning scheme: Redland City Plan
 * Zone codes = QPP_Description values from MapServer.
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
  { code: 'Low Density Residential', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 6, si: 1.5, re: 6, sec: 'yes', sterm: 'no', hb: 'yes', lot: 600, rules: ['Standard low density residential. Detached dwellings predominate. Min lot 600m². Includes Redland Bay, Cleveland, Capalaba residential areas.'], perm_uses: ['Dwelling house','Secondary dwelling','Home based business'], da_uses: ['Dual occupancy','Multiple dwelling','Childcare centre'], prohib_uses: ['Industry','Service station'] },
  { code: 'Character Residential', cat: 'Residential', ht: 8.5, st: 2, cov: 50, perm: 30, fr: 6, si: 1.5, re: 6, sec: 'yes', sterm: 'no', hb: 'yes', lot: 600, rules: ['Residential zone protecting the traditional character of older Redland City residential areas. Design must complement existing character streetscapes.'], perm_uses: ['Dwelling house','Secondary dwelling','Home based business'], da_uses: ['Dual occupancy','Renovations inconsistent with character'], prohib_uses: ['Industry','Commercial'] },
  { code: 'Low-medium Density Residential', cat: 'Residential', ht: 10, st: 3, cov: 55, perm: 25, fr: 4, si: 1.5, re: 4, sec: 'yes', sterm: 'no', hb: 'yes', lot: 400, rules: ['Low to medium density residential. Dual occupancy and small townhouse developments by code. Min lot 400m².'], perm_uses: ['Dwelling house','Dual occupancy','Secondary dwelling'], da_uses: ['Multiple dwelling (small)','Childcare centre'], prohib_uses: ['Industry','Service station'] },
  { code: 'Medium Density Residential', cat: 'Residential', ht: 13, st: 4, cov: 65, perm: 20, fr: 4, si: 1.5, re: 4, sec: 'no', sterm: 'yes', hb: 'no', lot: 300, rules: ['Medium density residential. Apartments, townhouses, unit complexes. Design quality and amenity standards apply.'], perm_uses: ['Multiple dwelling','Dual occupancy','Short-term accommodation'], da_uses: ['Retirement facility','Hotel','Childcare centre'], prohib_uses: ['Industry','Dwelling house (new standalone)'] },
  { code: 'Rural', cat: 'Rural', ht: 8.5, st: 2, cov: 10, perm: 80, fr: 20, si: 10, re: 20, sec: 'yes', sterm: 'no', hb: 'yes', lot: 100000, rules: ['Rural production and agricultural land. Includes rural areas on Redland mainland and North Stradbroke Island. Farming, grazing. Dwellings ancillary to rural use.'], perm_uses: ['Dwelling house (ancillary to rural)','Farming','Animal keeping'], da_uses: ['Rural industry','Aquaculture','Tourist facility'], prohib_uses: ['Urban residential','Commercial','Industry'] },
  { code: 'Conservation', cat: 'Environmental', ht: null, st: null, cov: 3, perm: 95, fr: 30, si: 30, re: 30, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Environmental conservation — the largest zone in Redland City by area. Covers koala habitat corridors, bushland, wetlands, North Stradbroke Island conservation areas. Development prohibited except environmental management.'], perm_uses: ['Nature-based recreation','Environmental management'], da_uses: ['Walking trails','Utility installation (essential)'], prohib_uses: ['Dwelling','Commercial','Industry','Clearing of native vegetation'] },
  { code: 'Environmental Management', cat: 'Environmental', ht: null, st: null, cov: 5, perm: 90, fr: 30, si: 30, re: 30, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Environmental management zone for areas of ecological significance requiring active management. Includes buffers around conservation areas and waterway corridors.'], perm_uses: ['Environmental management','Nature-based recreation'], da_uses: ['Research facility','Utility installation'], prohib_uses: ['Dwelling','Commercial','Industry'] },
  { code: 'Recreation and Open Space', cat: 'Open Space', ht: 8, st: 2, cov: 15, perm: 70, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Sport, recreation and open space. Parks, sporting fields, foreshore reserves. Buildings ancillary to recreation purpose only.'], perm_uses: ['Park','Outdoor sport and recreation','Community use (ancillary)'], da_uses: ['Indoor sport','Club (sports)','Food and drink outlet (ancillary)'], prohib_uses: ['Dwelling','Commercial','Industry'] },
  { code: 'Community Facilities', cat: 'Community', ht: 12, st: 3, cov: 60, perm: 20, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Community infrastructure. Schools, hospitals, emergency services, places of worship, cemeteries. Residential uses not permitted.'], perm_uses: ['Community use','Health care','Educational establishment','Emergency services','Place of worship'], da_uses: ['Childcare centre','Retirement facility','Caretaker dwelling (ancillary)'], prohib_uses: ['Residential','Commercial','Industrial'] },
  { code: 'Neighbourhood Centre', cat: 'Commercial', ht: 10, st: 2, cov: 70, perm: 15, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Small neighbourhood shopping precincts. Convenience retail, café, personal services for surrounding residential areas.'], perm_uses: ['Shop (small format)','Food and drink outlet','Office','Service industry'], da_uses: ['Residential (upper floors)','Medical centre','Service station'], prohib_uses: ['Heavy industry','Bulky goods retail','Drive-through'] },
  { code: 'Local Centre', cat: 'Commercial', ht: 12, st: 3, cov: 75, perm: 12, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Local activity centres serving multiple suburbs. Supermarket, specialty retail, medical, office. Residential above ground floor may be permitted.'], perm_uses: ['Shop','Office','Food and drink outlet','Medical centre'], da_uses: ['Multiple dwelling (upper floors)','Hotel','Service station'], prohib_uses: ['Heavy industry','Warehouse (primary use)'] },
  { code: 'District Centre', cat: 'Commercial', ht: 15, st: 4, cov: 80, perm: 10, fr: 0, si: 0, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['District-level activity centres (Capalaba, Cleveland). Mixed retail, commercial, office. Residential above ground floor. Public transport node.'], perm_uses: ['Shop','Office','Hotel','Food and drink outlet','Multiple dwelling (upper floors)'], da_uses: ['Entertainment venue','Cinema','Service station','Drive-through'], prohib_uses: ['Heavy industry','Rural use'] },
  { code: 'Major Centre', cat: 'Commercial', ht: 25, st: 7, cov: 85, perm: 8, fr: 0, si: 0, re: 0, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Major activity centres. High-density mixed use, major retail, office towers, residential apartments. Urban renewal focus.'], perm_uses: ['Shop','Office','Hotel','Multiple dwelling','Entertainment venue'], da_uses: ['Service station','Residential (standalone)'], prohib_uses: ['Heavy industry','Rural use'] },
  { code: 'Principal Centre', cat: 'Commercial', ht: 30, st: 8, cov: 90, perm: 5, fr: 0, si: 0, re: 0, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Cleveland principal centre — highest order activity centre in Redland City. Regional retail, office, residential towers, civic uses. Highest development intensity.'], perm_uses: ['Shop','Office','Hotel','Multiple dwelling','Civic use'], da_uses: ['Entertainment venue','Service station'], prohib_uses: ['Heavy industry','Rural use','Low-intensity residential'] },
  { code: 'Specialised Centre', cat: 'Commercial', ht: 12, st: 3, cov: 70, perm: 15, fr: 5, si: 3, re: 5, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Specialised commercial precincts (bulky goods, trade, hospitality). Large format retail, showrooms, hospitality venues.'], perm_uses: ['Large format retail','Showroom','Food and drink outlet','Hotel'], da_uses: ['Service station','Shop (standard)','Indoor sport'], prohib_uses: ['Dwelling','Heavy industry'] },
  { code: 'Mixed Use', cat: 'Mixed Use', ht: 15, st: 4, cov: 70, perm: 15, fr: 3, si: 1.5, re: 3, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Mixed use zones integrating residential with commercial. Ground floor commercial encouraged. Upper floors residential.'], perm_uses: ['Multiple dwelling','Shop','Office','Food and drink outlet'], da_uses: ['Service station','Childcare centre'], prohib_uses: ['Heavy industry','Warehouse'] },
  { code: 'Low Impact Industry', cat: 'Industrial', ht: 12, st: 3, cov: 70, perm: 10, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Low impact industrial. Light manufacturing, warehousing, trade. No offensive odour or noise.'], perm_uses: ['Low impact industry','Warehouse','Office (ancillary)'], da_uses: ['Retail showroom','Service station'], prohib_uses: ['Dwelling','Medium/High impact industry'] },
  { code: 'Medium Impact Industry', cat: 'Industrial', ht: 15, st: 3, cov: 70, perm: 10, fr: 8, si: 4, re: 8, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Medium impact industrial. Manufacturing, processing, storage. Buffer required from sensitive uses.'], perm_uses: ['Medium impact industry','Warehouse','Low impact industry'], da_uses: ['Office (ancillary)'], prohib_uses: ['Dwelling','Retail','High impact industry'] },
  { code: 'Waterfront and Marine Industry', cat: 'Industrial', ht: 10, st: 2, cov: 60, perm: 20, fr: 6, si: 3, re: 6, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Marine industry and waterfront activities. Boat building/repair, marine services, maritime commercial. Unique to Redland City coast.'], perm_uses: ['Marine industry','Boat repair','Marine sales'], da_uses: ['Tourist facility (marine)','Food and drink outlet (ancillary)'], prohib_uses: ['Residential','General industry'] },
  { code: 'Tourist Accommodation', cat: 'Tourism', ht: 15, st: 4, cov: 60, perm: 25, fr: 5, si: 3, re: 5, sec: 'no', sterm: 'yes', hb: 'no', lot: null, rules: ['Tourist accommodation zone in scenic locations including Redland Bay and North Stradbroke Island hinterland. Hotels, resorts, eco-tourism.'], perm_uses: ['Short-term accommodation','Hotel','Resort'], da_uses: ['Food and drink outlet','Function facility','Eco-tourism facility'], prohib_uses: ['Permanent residential','Industry','General commercial'] },
  { code: 'Emerging Communities', cat: 'Emerging Community', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Land for future urban growth. Development requires structure plan and sequence approval. Includes areas on mainland and islands planned for future residential communities.'], perm_uses: ['Existing rural use'], da_uses: ['Any development — subject to structure plan'], prohib_uses: ['Urban development (without approval)'] },
  { code: 'Unzoned', cat: 'Unzoned', ht: null, st: null, cov: null, perm: null, fr: null, si: null, re: null, sec: 'no', sterm: 'no', hb: 'no', lot: null, rules: ['Areas not assigned a specific zone under the Redland City Plan. May include road reserves, waterways, tidal areas. Contact Redland City Council for applicable requirements.'], perm_uses: ['Existing use rights'], da_uses: ['Any development — contact council'], prohib_uses: [] },
]

async function main() {
  console.log(`Seeding ${zones.length} Redland zone rules...`)
  await sql`DELETE FROM zone_rules WHERE council = 'redland'`

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
        ${r.code}, ${r.code}, ${r.cat}, 'redland',
        ${r.ht??null}, ${r.st??null}, ${r.cov??null}, ${r.perm??null},
        ${r.fr??null}, ${r.si??null}, ${r.re??null},
        ${r.sec}, ${r.sterm}, ${r.hb}, ${r.lot??null},
        ${r.rules}, ${r.perm_uses}, ${r.da_uses}, ${r.prohib_uses},
        'https://www.redland.qld.gov.au/info/20014/planning_and_building/262/planning_and_building',
        '2024-01-01'
      )
    `
    inserted++
  }
  console.log(`Inserted ${inserted} rules`)

  const missing = await sql`
    SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'redland'
    AND zone_code NOT IN (SELECT zone_code FROM zone_rules WHERE council = 'redland')
    ORDER BY zone_code
  `
  if (missing.length === 0) {
    console.log('All Redland zone codes have matching rules. ✓')
  } else {
    console.log(`Missing (${missing.length}):`)
    for (const m of missing) console.log(`  ${m.zone_code}`)
  }

  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
