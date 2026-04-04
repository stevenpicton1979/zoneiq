-- Sprint 7: Sunshine Coast Regional Council expansion
-- No schema changes required — zone_geometries and zone_rules already support
-- multi-council via the composite PK (zone_code, council) added in goldcoast-schema.sql.

-- ============================================================
-- WHAT CHANGED IN SPRINT 7
-- ============================================================
-- 1. Imported 106,204 Sunshine Coast zone polygons (council = 'sunshinecoast')
--    Source: SCC ArcGIS FeatureServer Layer 5 (PlanningScheme_Zoning_SCC)
--    Zone code field: LABEL (full strings, e.g. "Low Density Residential Zone")
--    CRS: WGS84 — ArcGIS f=geojson auto-reprojects. No ST_Transform needed.
--
-- 2. Seeded 22 zone rules rows for sunshinecoast council.
--
-- 3. Updated API: meta.source now returns 'Sunshine Coast Planning Scheme 2014'
--    for council = 'sunshinecoast'.

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Row counts by council:
-- SELECT council, COUNT(*) FROM zone_geometries GROUP BY council ORDER BY council;

-- Distinct zone codes for Sunshine Coast:
-- SELECT DISTINCT zone_code FROM zone_geometries WHERE council = 'sunshinecoast' ORDER BY zone_code;

-- Spot-check a known Sunshine Coast address (Noosa Heads):
-- SELECT * FROM get_zone_for_point(-26.3937, 153.0957);

-- Spot-check Maroochydore:
-- SELECT * FROM get_zone_for_point(-26.6531, 153.0990);

-- Verify zone rules seeded:
-- SELECT zone_code, zone_name FROM zone_rules WHERE council = 'sunshinecoast' ORDER BY zone_code;
