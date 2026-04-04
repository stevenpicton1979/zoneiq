-- Sprint 9: Heritage overlays — Queensland State Heritage Register + BCC Local Heritage
-- Run in Supabase SQL editor before running import-heritage-overlays.

-- ============================================================
-- HERITAGE OVERLAYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS heritage_overlays (
  id bigserial PRIMARY KEY,
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  heritage_type text,    -- 'state' | 'local'
  heritage_name text,    -- place name (state) or overlay description (local)
  place_id text,         -- QHR registration number (state only, e.g. '600033')
  council text           -- 'brisbane' for BCC local overlays; null for state
);

CREATE INDEX IF NOT EXISTS heritage_overlays_geometry_idx
  ON heritage_overlays USING GIST (geometry);

-- ============================================================
-- RPC: get_heritage_for_point
-- Returns the most significant heritage overlay at a given point.
-- State heritage takes priority over local heritage.
-- Returns NULL when no heritage overlay exists — caller defaults to is_heritage: false.
-- ============================================================

CREATE OR REPLACE FUNCTION get_heritage_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $func$
  SELECT jsonb_build_object(
    'is_heritage', true,
    'heritage_type', heritage_type,
    'heritage_name', heritage_name,
    'place_id', place_id
  )
  FROM heritage_overlays
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  ORDER BY
    CASE heritage_type
      WHEN 'state' THEN 1
      WHEN 'local' THEN 2
      ELSE 3
    END
  LIMIT 1;
$func$;

-- ============================================================
-- VERIFICATION QUERIES (run after import completes)
-- ============================================================
-- SELECT COUNT(*), heritage_type FROM heritage_overlays GROUP BY heritage_type;
-- SELECT get_heritage_for_point(-27.4693, 153.0259);   -- Regent Building (state heritage)
-- SELECT get_heritage_for_point(-27.4697, 153.0238);   -- Brisbane CBD (likely no heritage)
-- SELECT * FROM heritage_overlays WHERE heritage_type = 'state' ORDER BY heritage_name LIMIT 10;
