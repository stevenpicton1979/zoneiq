-- Sprint 2: Overlay layers — flood, character, school catchments
-- Run this entire file in the Supabase SQL editor before running import scripts.

-- ============================================================
-- FLOOD OVERLAYS
-- ============================================================

CREATE TABLE IF NOT EXISTS flood_overlays (
  id bigserial PRIMARY KEY,
  overlay_type text NOT NULL,  -- 'brisbane_river' | 'overland_flow'
  flood_category text,         -- raw category value from source data
  risk_level text NOT NULL,    -- 'high' | 'medium' | 'low' | 'unknown'
  geometry geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS flood_overlays_geometry_idx
  ON flood_overlays USING GIST (geometry);

CREATE OR REPLACE FUNCTION get_flood_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'has_flood_overlay', true,
    'overlay_type', overlay_type,
    'flood_category', flood_category,
    'risk_level', risk_level
  )
  FROM flood_overlays
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  ORDER BY
    CASE risk_level
      WHEN 'high'   THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low'    THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

-- ============================================================
-- CHARACTER OVERLAYS (Dwelling House Character)
-- ============================================================

CREATE TABLE IF NOT EXISTS character_overlays (
  id bigserial PRIMARY KEY,
  character_type text,
  geometry geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS character_overlays_geometry_idx
  ON character_overlays USING GIST (geometry);

CREATE OR REPLACE FUNCTION get_character_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'has_character_overlay', true,
    'character_type', character_type
  )
  FROM character_overlays
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  LIMIT 1;
$$;

-- ============================================================
-- SCHOOL CATCHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS school_catchments (
  id bigserial PRIMARY KEY,
  school_name text NOT NULL,
  school_type text NOT NULL,  -- 'primary' | 'secondary'
  school_level text,          -- 'prep_to_6' | 'year_7_to_10' | 'year_11_to_12'
  suburb text,
  geometry geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS school_catchments_geometry_idx
  ON school_catchments USING GIST (geometry);

CREATE OR REPLACE FUNCTION get_schools_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'school_name', school_name,
      'school_type', school_type,
      'school_level', school_level,
      'suburb', suburb
    )
  )
  FROM school_catchments
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  );
$$;

-- ============================================================
-- VERIFICATION QUERIES (run after imports complete)
-- ============================================================
-- SELECT COUNT(*) FROM flood_overlays;
-- SELECT COUNT(*) FROM character_overlays;
-- SELECT COUNT(*) FROM school_catchments;
-- SELECT get_flood_for_point(-27.5108, 153.1016);      -- Rocklea (flood-affected)
-- SELECT get_character_for_point(-27.4612, 153.0089);  -- Paddington
-- SELECT get_schools_for_point(-27.5108, 153.1016);    -- Carindale area
