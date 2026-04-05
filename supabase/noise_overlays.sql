-- Sprint 10: Aircraft noise contours — Brisbane Airport (BNE) + Archerfield Airport ANEF
-- Data source: Brisbane City Council City Plan 2014 Open Data (CC BY 4.0)
-- ArcGIS FeatureServer: https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Airport_environs_overlay_Australian_Noise_Exposure_Forecast_ANEF/FeatureServer/0
-- Note: Gold Coast Airport (OOL) ANEF data is not available via public open data API.
--       This table structure supports adding OOL data when it becomes available.
-- Run in Supabase SQL editor before running scripts/load-noise.js

-- ============================================================
-- NOISE OVERLAYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS noise_overlays (
  id bigserial PRIMARY KEY,
  airport text NOT NULL,         -- e.g. 'Brisbane Airport', 'Archerfield Airport', 'Gold Coast Airport'
  anef_contour text NOT NULL,    -- e.g. 'N20', 'N25', 'N30', 'N35', 'N40'
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS noise_overlays_geom_idx
  ON noise_overlays USING GIST (geom);

-- ============================================================
-- RPC: get_noise_for_point
-- Returns the most restrictive (highest) ANEF contour at a given point.
-- Returns NULL when no noise overlay exists — caller defaults to has_noise_overlay: false.
-- ============================================================

CREATE OR REPLACE FUNCTION get_noise_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $func$
  SELECT jsonb_build_object(
    'has_noise_overlay', true,
    'anef_contour', anef_contour,
    'airport', airport
  )
  FROM noise_overlays
  WHERE ST_Contains(
    geom,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  ORDER BY
    CASE anef_contour
      WHEN 'N40' THEN 1
      WHEN 'N35' THEN 2
      WHEN 'N30' THEN 3
      WHEN 'N25' THEN 4
      WHEN 'N20' THEN 5
      ELSE 6
    END
  LIMIT 1;
$func$;

-- ============================================================
-- VERIFICATION QUERIES (run after import completes)
-- ============================================================
-- SELECT COUNT(*), airport, anef_contour FROM noise_overlays GROUP BY airport, anef_contour ORDER BY airport, anef_contour;
-- SELECT get_noise_for_point(-27.3842, 153.1175);   -- Near Brisbane Airport runway
-- SELECT get_noise_for_point(-27.5675, 153.0803);   -- Archerfield Airport area
-- SELECT get_noise_for_point(-27.4697, 153.0238);   -- Brisbane CBD (no noise overlay expected)
