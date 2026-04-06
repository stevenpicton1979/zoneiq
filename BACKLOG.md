# ZoneIQ Backlog

## How this works
Claude Code reads this file at the start of every session and works through tasks marked [ ] from top to bottom. Mark [x] when done. Edit via GitHub.com on your phone — no laptop needed.

## Ready to build next
- [x] Sprint 14: Contaminated land live lookup — No free API exists. Returns link-out to QLD Government paid search via /api/check-contaminated. Response: checked: false, reason: no_free_api, search_url to environment.qld.gov.au.
- [x] Sprint 15: Acid sulfate soil overlays — /api/check-acid-sulfate. Layer 1952 (1:50,000, SEQ) with national Layer 2052 fallback. Live lookup via QLD SoilsAndLandResource MapServer. Returns has_acid_sulfate_soil, scale, map_code, probability_class, description, source_layer.
- [x] Update RapidAPI listing description to reflect 189,751 polygons and 7 councils.
- [x] Add usage dashboard endpoint — authenticated users can check usage vs limit.

## Ideas to spec
- [x] Add basic API tests — Jest or Vitest. Test /api/lookup with known addresses (Brisbane LDR, Gold Coast, Moreton Bay, Sunshine Coast). Verify zone_code, council, overlay fields present. Run in CI on every push via GitHub Actions.
- [ ] Development application tracking — Brisbane open data, DAs near an address
- [ ] Powerline easement overlays — Energex GIS data
- [ ] Noosa Shire Council zone expansion
- [ ] NSW expansion research

## Sprint 16 — QFAO Statewide Flood Fallback [ ]

**Goal:** For addresses outside the 7 councils with existing flood overlay
data, fall back to the Queensland Floodplain Assessment Overlay (QFAO) API
instead of returning no data.

**Endpoint:**
https://services8.arcgis.com/g9mppFwSsmIw9E0Z/arcgis/rest/services/Queensland_floodplain_assessment_overlay/FeatureServer/0/query

**Query pattern:**
- geometry: point (lng, lat)
- geometryType: esriGeometryPoint
- spatialRel: esriSpatialRelIntersects
- inSR: 4326
- f: json

**Response fields to use:** SUB_NAME, SUB_NUMBER, QRA_SUPPLY

**Logic:**
1. Check if address falls within existing 7-council bounding boxes
2. If yes: use existing Supabase flood data — DO NOT change this path
3. If no: query QFAO endpoint live at runtime
4. If QFAO returns a polygon: flag as FLOOD_RISK_POSSIBLE
5. If QFAO returns nothing: flag as NO_STATE_FLOOD_OVERLAY

**Disclaimer to include in API response for QFAO results:**
"This flood assessment is based on the Queensland state-level floodplain
overlay and is not property-specific. Contact your local council for
detailed flood mapping."

**Rules:**
- Do NOT ingest QFAO data into Supabase — live query only
- Do NOT modify existing flood overlay logic for the 7 current councils
- Do NOT execute this sprint — backlog only

## Done
- [x] Sprint 1-2: Brisbane zones + PostGIS + flood/character/school overlays
- [x] Sprint 3: Gold Coast expansion
- [x] Sprint 4: Moreton Bay expansion
- [x] Sprint 5: API keys + nearest polygon fallback + pricing page
- [x] Sprint 6: RapidAPI proxy auth + OpenAPI spec
- [x] Sprint 7: Sunshine Coast expansion (106,204 polygons, 175,049 total)
- [x] Sprint 8: Bushfire Prone Area overlay (132,000 SEQ polygons, 4 intensity classes)
- [x] Sprint 9: QLD Heritage overlays — State Heritage Register (1,800) + BCC Local Heritage Area (1,857) = 3,657 records. API returns is_heritage, heritage_type, heritage_name, place_id.
- [x] Sprint 10: Aircraft noise contours — BNE (N20–N35) + Archerfield (N20–N30) + Gold Coast Airport (5 contours) = 14 polygons total. Source: BCC City Plan 2014 Open Data ArcGIS + GCCC MapServer. API returns has_noise_overlay, anef_contour, airport.
- [x] Sprint 11: Ipswich City Council zone expansion — 1,516 polygons (council = 'ipswich'). Source: data.gov.au GeoServer WFS (2006 Ipswich Planning Scheme). 56 zone_rules entries.
- [x] Sprint 12: Logan City Council zone expansion — 6,920 polygons (council = 'logan'). Source: Logan Planning Scheme 2015 v9.2, ArcGIS Online FeatureServer (EPSG:3857 → 4326). 16 zone_rules entries.
- [x] Sprint 13: Redland City Council zone expansion — 6,266 polygons (council = 'redland'). Source: Redland City Plan, gis.redland.qld.gov.au MapServer (EPSG:28356 → 4326). 22 zone_rules entries. Required OBJECTID-range pagination.
- Total zone polygons: 189,751 across 7 councils (Brisbane, Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland)
