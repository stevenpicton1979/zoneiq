-- Sprint 6: RapidAPI listing prep
-- Run in Supabase SQL editor before deploying Sprint 6.

-- ============================================================
-- STEP 1: Add source column to lookup_log
-- Tracks whether requests came from direct API or RapidAPI
-- ============================================================

ALTER TABLE lookup_log ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT source, COUNT(*) FROM lookup_log GROUP BY source;
-- SELECT * FROM lookup_log ORDER BY created_at DESC LIMIT 5;
