// Sprint 17 — Seed missing Brisbane zone rules (LMR, SP, MU, CF, IN, SR)
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-brisbane-lmr-zones.js
// Or via doppler: doppler run -- node scripts/seed-brisbane-lmr-zones.js

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const zones = [
  {
    zone_code: 'LMR', council: 'brisbane',
    zone_name: 'Low-Medium Density Residential', zone_category: 'residential',
    max_height_m: 9.5, max_storeys: 3, max_site_coverage_pct: 50, min_permeability_pct: 20,
    front_setback_m: 6.0, side_setback_m: 1.5, rear_setback_m: 6.0,
    secondary_dwelling_permitted: 'permit_required',
    short_term_accom_permitted: 'permit_required',
    home_business_permitted: 'yes',
    subdivision_min_lot_size_m2: 300,
    key_rules: [
      'Maximum building height 9.5m or 3 storeys',
      'Dual occupancy and small-scale multi-unit permitted up to 3 storeys',
      'Height may be exceeded in identified Infill Areas',
      'Minimum lot size 300m² for subdivision',
    ],
    permitted_uses: ['Dwelling house', 'Dual occupancy', 'Home-based business', 'Multiple dwelling (up to 3 storeys)'],
    requires_permit_uses: ['Secondary dwelling', 'Short-term accommodation', 'Child care centre'],
    prohibited_uses: ['Industry', 'Bulk goods retailing', 'Service station'],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/304',
    last_verified: '2025-01-01',
    notes: 'Allows dual occupancy and small-scale multi-unit up to 3 storeys. Height may be exceeded where site is in an identified Infill Area.',
  },
  {
    zone_code: 'SP', council: 'brisbane',
    zone_name: 'Special Purpose', zone_category: 'mixed',
    key_rules: [
      'Highly site-specific zone — no standard height or coverage applies',
      'Development assessment required for all uses',
      'Refer to specific SP zone code provisions in Brisbane City Plan 2014',
    ],
    permitted_uses: [], requires_permit_uses: [], prohibited_uses: [],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/305',
    last_verified: '2025-01-01',
    notes: 'Development assessment required. Refer to specific SP zone code provisions in Brisbane City Plan 2014.',
  },
  {
    zone_code: 'MU', council: 'brisbane',
    zone_name: 'Mixed Use', zone_category: 'mixed',
    secondary_dwelling_permitted: 'permit_required',
    short_term_accom_permitted: 'permit_required',
    home_business_permitted: 'yes',
    key_rules: [
      'Permits residential and commercial uses within the same building or site',
      'Height limits vary by location — check applicable neighbourhood plan',
      'Ground-floor active uses encouraged on key streets',
    ],
    permitted_uses: ['Shop', 'Office', 'Food and drink outlet', 'Home-based business'],
    requires_permit_uses: ['Dwelling unit', 'Multiple dwelling', 'Short-term accommodation', 'Childcare centre'],
    prohibited_uses: ['Industry (other than low-impact)', 'Extractive industry', 'Cropping'],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/303',
    last_verified: '2025-01-01',
    notes: 'Mixed use zones permit residential and commercial uses. Height limits vary by location — check applicable neighbourhood plan.',
  },
  {
    zone_code: 'CF', council: 'brisbane',
    zone_name: 'Community Facilities', zone_category: 'mixed',
    secondary_dwelling_permitted: 'no',
    short_term_accom_permitted: 'no',
    home_business_permitted: 'no',
    key_rules: [
      'Non-residential zone for community, health, and education uses',
      'Residential use generally not permitted',
      'Development assessment required for most uses',
    ],
    permitted_uses: ['Community use', 'Education establishment', 'Health care services', 'Emergency services'],
    requires_permit_uses: ['Child care centre', 'Place of worship', 'Outdoor sport and recreation'],
    prohibited_uses: ['Dwelling house', 'Multiple dwelling', 'Industry', 'Retail'],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/302',
    last_verified: '2025-01-01',
    notes: 'Non-residential zone. Permits community, health, education uses. Residential use generally not permitted.',
  },
  {
    zone_code: 'IN', council: 'brisbane',
    zone_name: 'Industry', zone_category: 'industrial',
    secondary_dwelling_permitted: 'no',
    short_term_accom_permitted: 'no',
    home_business_permitted: 'no',
    key_rules: [
      'Non-residential zone for industrial and manufacturing uses',
      'Residential use not permitted',
      'Refer to Brisbane City Plan 2014 Industry zone code for specific provisions',
    ],
    permitted_uses: ['Industry', 'Low impact industry', 'Warehouse', 'Transport depot', 'Bulk goods retailing'],
    requires_permit_uses: ['Service station', 'Sales office', 'Food and drink outlet (ancillary)'],
    prohibited_uses: ['Dwelling house', 'Multiple dwelling', 'Retail (standalone)', 'Short-term accommodation'],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/300',
    last_verified: '2025-01-01',
    notes: 'Non-residential zone. Residential use not permitted. Refer to Brisbane City Plan 2014 Industry zone code.',
  },
  {
    zone_code: 'SR', council: 'brisbane',
    zone_name: 'Sport and Recreation', zone_category: 'mixed',
    secondary_dwelling_permitted: 'no',
    short_term_accom_permitted: 'no',
    home_business_permitted: 'no',
    key_rules: [
      'Non-residential zone for organised sport, recreation, and entertainment',
      'Residential use not permitted',
      'Ancillary uses (kiosks, change rooms) permitted where incidental to main use',
    ],
    permitted_uses: ['Outdoor sport and recreation', 'Indoor sport and recreation', 'Park'],
    requires_permit_uses: ['Food and drink outlet (ancillary)', 'Club', 'Entertainment facility'],
    prohibited_uses: ['Dwelling house', 'Multiple dwelling', 'Industry', 'Retail (standalone)'],
    source_url: 'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/306',
    last_verified: '2025-01-01',
    notes: 'Non-residential zone. Permits organised sport, recreation, and entertainment facilities.',
  },
]

async function main() {
  console.log(`Seeding ${zones.length} Brisbane zone rules...`)
  const { error } = await db
    .from('zone_rules')
    .upsert(zones, { onConflict: 'zone_code,council' })

  if (error) {
    console.error('Upsert failed:', error.message)
    process.exit(1)
  }

  const { data, error: countErr } = await db
    .from('zone_rules')
    .select('zone_code', { count: 'exact' })
    .eq('council', 'brisbane')

  if (countErr) {
    console.error('Count query failed:', countErr.message)
  } else {
    console.log(`Brisbane zone_rules count after upsert: ${data?.length ?? '?'}`)
  }

  console.log('Done. Zones seeded:')
  zones.forEach(z => console.log(`  ${z.zone_code} — ${z.zone_name}`))
}

main().catch(e => { console.error(e); process.exit(1) })
