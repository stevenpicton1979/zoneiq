-- Sprint 17: Seed missing Brisbane zone rules
-- Unblocks ZONE_NOT_SEEDED errors for LMR, SP, MU, CF, IN, SR
-- These 6 zone codes account for 47% of lookup failures in coverage tests

INSERT INTO zone_rules (
  zone_code, council, zone_name, zone_category,
  max_height_m, max_storeys, max_site_coverage_pct, min_permeability_pct,
  front_setback_m, side_setback_m, rear_setback_m,
  secondary_dwelling_permitted, short_term_accom_permitted, home_business_permitted,
  subdivision_min_lot_size_m2,
  key_rules, permitted_uses, requires_permit_uses, prohibited_uses,
  source_url, last_verified, notes
)
VALUES

-- LMR: Low-Medium Density Residential
(
  'LMR', 'brisbane', 'Low-Medium Density Residential', 'residential',
  9.5, 3, 50, 20,
  6.0, 1.5, 6.0,
  'permit_required', 'permit_required', 'yes',
  300,
  ARRAY[
    'Maximum building height 9.5m or 3 storeys',
    'Dual occupancy and small-scale multi-unit permitted up to 3 storeys',
    'Height may be exceeded in identified Infill Areas',
    'Minimum lot size 300m² for subdivision'
  ],
  ARRAY['Dwelling house', 'Dual occupancy', 'Home-based business', 'Multiple dwelling (up to 3 storeys)'],
  ARRAY['Secondary dwelling', 'Short-term accommodation', 'Child care centre'],
  ARRAY['Industry', 'Bulk goods retailing', 'Service station'],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/304',
  '2025-01-01',
  'Allows dual occupancy and small-scale multi-unit up to 3 storeys. Height may be exceeded where site is in an identified Infill Area.'
),

-- SP: Special Purpose
(
  'SP', 'brisbane', 'Special Purpose', 'mixed',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'no', 'no', 'no',
  NULL,
  ARRAY[
    'Highly site-specific zone — no standard height or coverage applies',
    'Development assessment required for all uses',
    'Refer to specific SP zone code provisions in Brisbane City Plan 2014'
  ],
  ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/305',
  '2025-01-01',
  'Development assessment required. Refer to specific SP zone code provisions in Brisbane City Plan 2014.'
),

-- MU: Mixed Use
(
  'MU', 'brisbane', 'Mixed Use', 'mixed',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'permit_required', 'permit_required', 'yes',
  NULL,
  ARRAY[
    'Permits residential and commercial uses within the same building or site',
    'Height limits vary by location — check applicable neighbourhood plan',
    'Ground-floor active uses encouraged on key streets'
  ],
  ARRAY['Shop', 'Office', 'Food and drink outlet', 'Home-based business'],
  ARRAY['Dwelling unit', 'Multiple dwelling', 'Short-term accommodation', 'Childcare centre'],
  ARRAY['Industry (other than low-impact)', 'Extractive industry', 'Cropping'],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/303',
  '2025-01-01',
  'Mixed use zones permit residential and commercial uses. Height limits vary by location — check applicable neighbourhood plan.'
),

-- CF: Community Facilities
(
  'CF', 'brisbane', 'Community Facilities', 'mixed',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'no', 'no', 'no',
  NULL,
  ARRAY[
    'Non-residential zone for community, health, and education uses',
    'Residential use generally not permitted',
    'Development assessment required for most uses'
  ],
  ARRAY['Community use', 'Education establishment', 'Health care services', 'Emergency services'],
  ARRAY['Child care centre', 'Place of worship', 'Outdoor sport and recreation'],
  ARRAY['Dwelling house', 'Multiple dwelling', 'Industry', 'Retail'],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/302',
  '2025-01-01',
  'Non-residential zone. Permits community, health, education uses. Residential use generally not permitted.'
),

-- IN: Industry
(
  'IN', 'brisbane', 'Industry', 'industrial',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'no', 'no', 'no',
  NULL,
  ARRAY[
    'Non-residential zone for industrial and manufacturing uses',
    'Residential use not permitted',
    'Refer to Brisbane City Plan 2014 Industry zone code for specific provisions'
  ],
  ARRAY['Industry', 'Low impact industry', 'Warehouse', 'Transport depot', 'Bulk goods retailing'],
  ARRAY['Service station', 'Sales office', 'Food and drink outlet (ancillary)'],
  ARRAY['Dwelling house', 'Multiple dwelling', 'Retail (standalone)', 'Short-term accommodation'],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/300',
  '2025-01-01',
  'Non-residential zone. Residential use not permitted. Refer to Brisbane City Plan 2014 Industry zone code.'
),

-- SR: Sport & Recreation
(
  'SR', 'brisbane', 'Sport and Recreation', 'mixed',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'no', 'no', 'no',
  NULL,
  ARRAY[
    'Non-residential zone for organised sport, recreation, and entertainment',
    'Residential use not permitted',
    'Ancillary uses (kiosks, change rooms) permitted where incidental to main use'
  ],
  ARRAY['Outdoor sport and recreation', 'Indoor sport and recreation', 'Park'],
  ARRAY['Food and drink outlet (ancillary)', 'Club', 'Entertainment facility'],
  ARRAY['Dwelling house', 'Multiple dwelling', 'Industry', 'Retail (standalone)'],
  'https://cityplan.brisbane.qld.gov.au/eplan/rules/0/131/0/0/0/306',
  '2025-01-01',
  'Non-residential zone. Permits organised sport, recreation, and entertainment facilities.'
)

ON CONFLICT (zone_code, council) DO UPDATE SET
  zone_name = EXCLUDED.zone_name,
  zone_category = EXCLUDED.zone_category,
  max_height_m = EXCLUDED.max_height_m,
  max_storeys = EXCLUDED.max_storeys,
  max_site_coverage_pct = EXCLUDED.max_site_coverage_pct,
  min_permeability_pct = EXCLUDED.min_permeability_pct,
  front_setback_m = EXCLUDED.front_setback_m,
  side_setback_m = EXCLUDED.side_setback_m,
  rear_setback_m = EXCLUDED.rear_setback_m,
  secondary_dwelling_permitted = EXCLUDED.secondary_dwelling_permitted,
  short_term_accom_permitted = EXCLUDED.short_term_accom_permitted,
  home_business_permitted = EXCLUDED.home_business_permitted,
  subdivision_min_lot_size_m2 = EXCLUDED.subdivision_min_lot_size_m2,
  key_rules = EXCLUDED.key_rules,
  permitted_uses = EXCLUDED.permitted_uses,
  requires_permit_uses = EXCLUDED.requires_permit_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  notes = EXCLUDED.notes,
  last_verified = EXCLUDED.last_verified;
