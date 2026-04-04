-- Sprint 8: Bushfire Prone Area overlay
-- Run in Supabase SQL editor before running import-bushfire-overlays.

-- ============================================================
-- BUSHFIRE OVERLAYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bushfire_overlays (
  id bigserial PRIMARY KEY,
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  intensity_class text,   -- 'very_high' | 'high' | 'medium' | 'buffer'
  lga text,               -- source LGA field (e.g. 'Brisbane', 'GoldCoast', 'SunshineC')
  council text            -- normalised council name (e.g. 'brisbane', 'goldcoast')
);

CREATE INDEX IF NOT EXISTS bushfire_overlays_geometry_idx
  ON bushfire_overlays USING GIST (geometry);

-- ============================================================
-- RPC: get_bushfire_for_point
-- Returns highest-intensity bushfire overlay at a given point.
-- Returns NULL (no row) when no overlay exists — caller defaults to has_bushfire_overlay: false.
-- ============================================================

CREATE OR REPLACE FUNCTION get_bushfire_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $func$
  SELECT jsonb_build_object(
    'has_bushfire_overlay', true,
    'intensity_class', intensity_class,
    'lga', lga
  )
  FROM bushfire_overlays
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  ORDER BY
    CASE intensity_class
      WHEN 'very_high' THEN 1
      WHEN 'high'      THEN 2
      WHEN 'medium'    THEN 3
      WHEN 'buffer'    THEN 4
      ELSE 5
    END
  LIMIT 1;
$func$;

-- ============================================================
-- VERIFICATION QUERIES (run after import completes)
-- ============================================================
-- SELECT COUNT(*), intensity_class FROM bushfire_overlays GROUP BY intensity_class ORDER BY intensity_class;
-- SELECT COUNT(*), council FROM bushfire_overlays GROUP BY council ORDER BY council;
-- SELECT get_bushfire_for_point(-27.5270, 152.9387);   -- Karana Downs (bushfire area)
-- SELECT get_bushfire_for_point(-27.4697, 153.0238);   -- Brisbane CBD (no bushfire)
-- SELECT get_bushfire_for_point(-26.3937, 153.0957);   -- Noosa Heads
