-- Sprint 10: Aircraft Noise (ANEF) overlays
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS noise_overlays (
  id bigserial PRIMARY KEY,
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  airport text,           -- 'BRISBANE' | 'GOLD_COAST'
  anef_contour text,      -- '20', '25', '30', '35', '40'
  anef_label text         -- raw label from source e.g. 'ANEF 25-30'
);

CREATE INDEX IF NOT EXISTS noise_overlays_geometry_idx ON noise_overlays USING GIST (geometry);

CREATE OR REPLACE FUNCTION get_noise_for_point(lat float, lng float)
RETURNS jsonb LANGUAGE sql STABLE AS $func$
  SELECT jsonb_build_object(
    'has_noise_overlay', true,
    'airport', airport,
    'anef_contour', anef_contour,
    'anef_label', anef_label
  )
  FROM noise_overlays
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  ORDER BY anef_contour::int DESC
  LIMIT 1;
$func$;

-- Verification
-- SELECT count(*) FROM noise_overlays;
-- SELECT airport, anef_contour, count(*) FROM noise_overlays GROUP BY airport, anef_contour ORDER BY airport, anef_contour;
