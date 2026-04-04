-- Sprint 3: Gold Coast Council Expansion
-- Run ALL statements in this file in the Supabase SQL editor before running import scripts.

-- ============================================================
-- STEP 1: Add council column to zone_geometries
-- ============================================================

ALTER TABLE zone_geometries ADD COLUMN IF NOT EXISTS council text DEFAULT 'brisbane';
UPDATE zone_geometries SET council = 'brisbane' WHERE council IS NULL;
CREATE INDEX IF NOT EXISTS zone_geometries_council_idx ON zone_geometries (council);

-- ============================================================
-- STEP 2: Add council column to zone_rules
-- ============================================================

ALTER TABLE zone_rules ADD COLUMN IF NOT EXISTS council text DEFAULT 'brisbane';
UPDATE zone_rules SET council = 'brisbane' WHERE council IS NULL;

-- Change primary key to composite (zone_code, council)
-- Brisbane uses short codes (LDR, MDR). Gold Coast uses full strings
-- ("Low density residential"). No actual clash exists, but composite PK
-- is correct for multi-council architecture.
ALTER TABLE zone_rules DROP CONSTRAINT IF EXISTS zone_rules_pkey;
ALTER TABLE zone_rules ADD PRIMARY KEY (zone_code, council);

-- ============================================================
-- STEP 3: Update get_zone_for_point RPC to return {zone_code, council}
-- ============================================================

CREATE OR REPLACE FUNCTION get_zone_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'zone_code', zone_code,
    'council', council
  )
  FROM zone_geometries
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  LIMIT 1;
$$;

-- ============================================================
-- VERIFICATION (run after imports complete)
-- ============================================================
-- SELECT COUNT(*) FROM zone_geometries WHERE council = 'brisbane';  -- should be ~26,358
-- SELECT COUNT(*) FROM zone_geometries WHERE council = 'goldcoast'; -- should be ~29,537
-- SELECT get_zone_for_point(-28.0023, 153.4145);  -- Surfers Paradise → goldcoast
-- SELECT get_zone_for_point(-27.5108, 153.1016);  -- Carindale → brisbane
-- SELECT DISTINCT zone_code FROM zone_rules WHERE council = 'goldcoast';
