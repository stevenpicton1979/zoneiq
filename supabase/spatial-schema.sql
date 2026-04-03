-- Sprint 1: PostGIS spatial lookup
-- Run these statements in the Supabase SQL editor in order.

-- Step 1: Enable PostGIS (skip if already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Zone geometries table
-- Stores one row per zone polygon. zone_code is NOT a FK to zone_rules
-- so missing rules return ZONE_NOT_SEEDED rather than a DB error.
CREATE TABLE IF NOT EXISTS zone_geometries (
  id bigserial PRIMARY KEY,
  zone_code text NOT NULL,
  geometry geometry(MultiPolygon, 4326) NOT NULL
);

-- Step 3: GiST spatial index (required for ST_Contains performance)
CREATE INDEX IF NOT EXISTS zone_geometries_geometry_idx
  ON zone_geometries USING GIST (geometry);

-- Step 4: RPC function — called by lib/zone-lookup.ts via supabase.rpc()
CREATE OR REPLACE FUNCTION get_zone_for_point(lat float, lng float)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT zone_code
  FROM zone_geometries
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  LIMIT 1;
$$;

-- Step 5: Verify the RPC after running import-geometries
-- SELECT get_zone_for_point(-27.4612, 153.0089);  -- expect LDR or CR
-- SELECT get_zone_for_point(-27.4698, 153.0251);  -- expect PC (CBD)
-- SELECT COUNT(*) FROM zone_geometries;            -- expect ~26,360
