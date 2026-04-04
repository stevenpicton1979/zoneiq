-- Sprint 5: API Keys + Nearest Polygon Fallback
-- Run ALL statements in this file in the Supabase SQL editor before deploying Sprint 5.

-- ============================================================
-- STEP 1: Nearest polygon fallback for get_zone_for_point
-- Fixes gap problem — addresses on boundary lines returned NULL
-- ============================================================

DROP FUNCTION IF EXISTS get_zone_for_point(float, float);

CREATE OR REPLACE FUNCTION get_zone_for_point(lat float, lng float)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $func$
  -- First try exact point-in-polygon
  SELECT jsonb_build_object('zone_code', zone_code, 'council', council)
  FROM zone_geometries
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1

  UNION ALL

  -- Fallback: nearest polygon within 100 metres
  SELECT jsonb_build_object('zone_code', zone_code, 'council', council)
  FROM zone_geometries
  WHERE ST_DWithin(
    geography(geometry),
    geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326)),
    100
  )
  ORDER BY geometry <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT 1

  LIMIT 1;
$func$;

-- Verification:
-- SELECT get_zone_for_point(-27.4700, 153.0200);  -- gap coordinate → should now return a zone
-- SELECT get_zone_for_point(-27.5108, 153.1016);  -- Carindale → brisbane (regression check)
-- SELECT get_zone_for_point(-28.0023, 153.4145);  -- Surfers Paradise → goldcoast

-- ============================================================
-- STEP 2: API keys table
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text unique not null,       -- SHA-256 hash of the actual key
  key_prefix text not null,            -- First 12 chars for display (e.g. "ziq_live_a1b")
  name text not null,                  -- Human name e.g. "My App"
  email text not null,                 -- Owner email
  plan text not null default 'free',   -- free | starter | pro
  requests_today integer default 0,
  requests_total integer default 0,
  rate_limit_per_day integer default 100,
  is_active boolean default true,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

-- ============================================================
-- STEP 3: API usage log (keep 90 days)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_usage (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references api_keys(id),
  address text,
  council text,
  zone_code text,
  response_ms integer,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS api_usage_key_id_idx ON api_usage(key_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON api_usage(created_at);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM api_keys;
-- SELECT get_zone_for_point(-27.4700, 153.0200);
