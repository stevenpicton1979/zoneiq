# ZoneIQ Backlog

## How this works
Claude Code reads this file at the start of every session and works through tasks marked [ ] from top to bottom. Mark [x] when done. Edit via GitHub.com on your phone — no laptop needed.

## Slack triggers
- Single sprint: "sprint: zoneiq [N]" e.g. "sprint: zoneiq 18"
- All remaining: "overnight: zoneiq"
- Brief: "Read BACKLOG.md and work through sprint [N]. Mark [x] tasks when done. Do not stop within a sprint. Log to OVERNIGHT_LOG.md with timestamps."

---

## Ideas to spec (not yet scheduled)
- [ ] Development application tracking — Brisbane open data, DAs near an address
- [ ] Powerline easement overlays — Energex GIS data
- [ ] Noosa Shire Council zone expansion
- [ ] Acid sulfate soils — currently live lookup only, consider ingesting into Supabase for speed

---

## Sprint 17b — Finish Sprint 17: Zone seed + smoke test [x] COMPLETE 2026-04-09
Supabase recovered. Seed applied via apply_migration. Zone_rules brisbane: 12 → 18.
Smoke test: New Farm PASS (LMR, flood=true). Partial 200 fix confirmed (West End returns flood despite zone_not_seeded). SC zone not yet seeded — to be added in a future sprint alongside other missing Brisbane codes.

---

## Sprint 18 — ClearOffer Integration Validation + API Telemetry [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 18"

### [x] Task 1 — Review ClearOffer ZoneIQ response handling
In the buyerside repo (main branch), find the serverless function that calls ZoneIQ
(look for fetch to zoneiq-sigma.vercel.app).
Confirm all of the following:
  a) Handles rules: null gracefully — does not crash when zone not seeded
  b) Reads flood from response.overlays.flood (not response.flood — old shape pre-Sprint 17)
  c) Reads bushfire, heritage, noise, character, schools from response.overlays.*
  d) Handles meta.partial === true — shows disclaimer when zone rules unavailable
Log findings to OVERNIGHT_LOG.md.

### [x] Task 2 — Fix any response shape mismatches
If ClearOffer references the pre-Sprint 17 shape (overlays at top level, not nested
under overlays{}), update all field references. Do not change any UI or Stripe logic.

### [x] Task 3 — Test 5 Brisbane addresses end-to-end
Simulate ClearOffer → ZoneIQ calls for:
1. "8 Fairfield Road, Yeronga QLD 4105"
2. "18 Montague Road, West End QLD 4101"
3. "30 Oxlade Drive, New Farm QLD 4005"
4. "15 Musgrave Road, Red Hill QLD 4059"
5. "42 Wellington Road, East Brisbane QLD 4169"

For each log: geocoded lat/lng, zone code, flood result, bushfire result.
Flag any null flood result for a known flood-affected address.

### [x] Task 4 — Wire api_usage telemetry
The api_usage table has 0 rows — telemetry is unwired.
In zoneiq route.ts, before the final successful response return, insert a row into
api_usage with:
  - timestamp (now)
  - address_input (raw string)
  - council (detected)
  - zone_code
  - partial (true/false)
  - overlays_returned (array of overlay keys that had data)
Use try/catch — a failed insert must NOT break the main response.

### [x] Task 5 — Deploy and verify
Vercel MCP deploy to production.
Run 2 test lookups. Use Supabase MCP to confirm api_usage has rows.
GitHub MCP commit to zoneiq main: "Sprint 18: ClearOffer response shape validation, api_usage telemetry"
If buyerside had changes, commit to buyerside main: "Sprint 18: fix ZoneIQ response shape mapping"

---

## Sprint 19 — NSW Zoning Ingest (Greater Sydney) [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 19"

### [ ] Task 1 — Verify GiST index on zone_geometries
Use Supabase MCP to run:
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'zone_geometries';
Confirm a GiST index exists on the geometry column.
If missing, create it:
  CREATE INDEX IF NOT EXISTS zone_geometries_geom_gist ON zone_geometries USING GIST (geometry);
Log index status to OVERNIGHT_LOG.md. Do not proceed until confirmed.

### [ ] Task 2 — Discover NSW zoning layer
Fetch the ePlanning MapServer index:
  https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_LEP/MapServer?f=json
Identify the layer ID for Land Zoning polygons.
Test a point query for Sydney CBD (lng=151.2093, lat=-33.8688) to confirm correct layer.
Log layer ID and sample response to OVERNIGHT_LOG.md.

### [ ] Task 3 — Write NSW zoning ingest script
Create scripts/ingest-nsw-zoning.js
Requirements:
  - Page through results using resultOffset (ArcGIS max 1000 per request)
  - Bounding box: xmin=150.3, ymin=-34.4, xmax=151.6, ymax=-33.3 (Greater Sydney)
  - Extract: zone code (SYM_CODE or equivalent), LGA name, geometry
  - Check CRS — reproject to WGS84 (EPSG:4326) if needed
  - Insert into zone_geometries with council = LGA_NAME from feature
  - Use func not $$ for any inline SQL
  - Log progress every 500 records
Target LGAs: City of Sydney, Parramatta, Blacktown, Liverpool, Penrith, Sutherland,
  Inner West, Canterbury-Bankstown, Northern Beaches, Ku-ring-gai, Georges River,
  Randwick, Waverley, Woollahra, Lane Cove, Willoughby, Ryde, Strathfield,
  Bayside, Hornsby, Hunters Hill, Mosman, North Sydney, Burwood, Canada Bay

### [ ] Task 4 — Run ingest
Execute scripts/ingest-nsw-zoning.js
Log total records inserted to OVERNIGHT_LOG.md. If any LGA returns zero records, log as warning.

### [ ] Task 5 — Verify point-in-polygon for Sydney
Use Supabase MCP to test ST_Contains queries:
  - lat=-33.8688, lng=151.2093 (Sydney CBD) — expect B or SP zone
  - lat=-33.8915, lng=151.2767 (Bondi Beach) — expect R2
  - lat=-33.8136, lng=151.0034 (Parramatta) — expect B zone
Log results.

### [ ] Task 6 — Seed minimal NSW zone rules
Insert zone_rules with council = 'NSW_standard':
  R2 — Low Density Residential: min_lot 450m², max_height 9.5m, 2 storeys
  R3 — Medium Density Residential: max_height 11m, 3 storeys, strata permitted
  R4 — High Density Residential: max_height null, note: 'Height by local LEP'
  R1 — General Residential: max_height 9.5m
  B4 — Mixed Use: residential above ground floor, height by LEP
  IN1 — General Industrial: residential not permitted
  RE1 — Public Recreation: residential not permitted

### [ ] Task 7 — Update geocoder for NSW
In lib/geocode.ts:
  - Add state suffix detection:
      'NSW' or 'New South Wales' → append ', New South Wales Australia'
      'VIC' or 'Victoria' → append ', Victoria Australia'
      'QLD' or 'Queensland' → append ', Queensland Australia'
      no state detected → append ', Australia'
  - Update bounding box guard to accept NSW:
      Accept if in SEQ bounds (lat -30 to -24, lng 150 to 155)
      OR in NSW bounds (lat -38 to -28, lng 140 to 154)

### [ ] Task 8 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 19: NSW zoning ingest Greater Sydney, geocoder NSW support"

---

## Sprint 20 — NSW Flood Ingest (Greater Sydney) [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 20"
**Note:** NSW uses EPI flood polygons, not BCC-style FHA_R1/R2A codes. Returns flood status + LEP reference.

### [ ] Task 1 — Inspect the NSW flood layer
Fetch metadata:
  https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Hazard/MapServer/1?f=json
Log: available fields, spatial reference, max record count.
Test a point query for Parramatta (lat=-33.8136, lng=151.0034) — known flood-affected area.

### [ ] Task 2 — Write NSW flood ingest script
Create scripts/ingest-nsw-flood.js
Requirements:
  - Page through results for Greater Sydney bounding box (same as Sprint 19)
  - Insert into flood_overlays with:
      council = LGA_NAME from feature
      source = 'NSW_EPI'
      flood_type = 'flood_planning_area'
      epi_name = EPI_NAME from feature
  - Use func not $$ for any SQL
  - Log progress every 500 records

### [ ] Task 3 — Run ingest
Execute scripts/ingest-nsw-flood.js
Log record count per LGA to OVERNIGHT_LOG.md.

### [ ] Task 4 — Update route.ts flood response for NSW
When council is an NSW LGA, query flood_overlays where source = 'NSW_EPI'.
ClearOffer response shape for NSW flood:
  {
    affected: true,
    source: 'NSW_EPI',
    epi_name: '<LEP name>',
    note: 'Flood affected under local LEP — refer to council for risk classification'
  }
When not affected: { affected: false, source: 'NSW_EPI' }

### [ ] Task 5 — Test 3 Sydney addresses for flood
1. An address in Parramatta near the river — expect flood affected
2. An address in Penrith near the Nepean River — expect flood affected
3. An address in Mosman — expect not affected
Log results to OVERNIGHT_LOG.md.

### [ ] Task 6 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 20: NSW flood overlay ingest Greater Sydney"

---

## Sprint 21 — NSW Schools + Sydney Airport ANEF [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 21"

### [ ] Task 1 — Ingest NSW school catchments
Download:
  https://data.nsw.gov.au/data/dataset/8b1e8161-7252-43d9-81ed-6311569cb1d7/resource/32d6f502-ddb1-45d9-b114-5e34ddfd33ac/download/catchments.zip
Extract and inspect CRS — reproject to WGS84 if needed.
Write and run: scripts/ingest-nsw-schools.js
  - Filter to Greater Sydney bounding box (lat -34.4 to -33.3, lng 150.3 to 151.6)
  - Insert into school_catchments
  - Log record count

### [ ] Task 2 — Sydney Airport ANEF
Search for Sydney Airport ANEF contour shapefile via:
  1. https://www.planningportal.nsw.gov.au/opendata/dataset/ → search "ANEF" or "Sydney Airport"
  2. https://data.nsw.gov.au → search "ANEF Sydney"
  3. Sydney Airport Master Plan spatial data (check sydneyairport.com.au)

If found: ingest into noise_overlays with source='Sydney_Airport_ANEF', field: anef_band
If not found after 20 minutes: log "ANEF_SYDNEY_NOT_FOUND — manual acquisition required"
and move to Task 3.

### [ ] Task 3 — Smoke test 5 Sydney addresses
1. "12 Martin Place, Sydney NSW 2000"
2. "45 Homebush Bay Drive, Homebush NSW 2140"
3. "8 Penrith Street, Penrith NSW 2750"
4. "20 Military Road, Cremorne NSW 2090"
5. "15 Airport Drive, Mascot NSW 2020" (near Sydney Airport — expect ANEF if ingested)
For each log: coordinates, zone code, flood result, school catchment, ANEF band.

### [ ] Task 4 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 21: NSW school catchments, Sydney Airport ANEF"

---

## Sprint 22 — Victoria Zoning + Flood Ingest (Greater Melbourne) [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 22"
**Critical:** VIC geometry is GDA94 VicGrid EPSG:3111 — ST_Transform required. Same pattern as Gold Coast EPSG:28356 — reference existing Gold Coast ingest script.

### [x] Task 1 — Locate Vicmap Planning ArcGIS endpoint
Fetch: https://data-planvic.opendata.arcgis.com/
Also try: https://services6.arcgis.com/GB33F62SbDxJjwEL/arcgis/rest/services
Find the Land Zoning FeatureServer URL.
Test a point query for Melbourne CBD (lng=144.9631, lat=-37.8136).
Log correct endpoint and layer ID to OVERNIGHT_LOG.md.

### [x] Task 2 — Test Melbourne bounding box query
Bounding box: xmin=144.4, ymin=-38.5, xmax=145.6, ymax=-37.4
Query for zone polygons. Log: record count, sample zone codes, CRS.
Expect zone codes like GRZ, NRZ, RGZ, MUZ, C1Z, IN1Z.

### [x] Task 3 — Write and run VIC zoning ingest
Create scripts/ingest-vic-zoning.js
Requirements:
  - Page through results using resultOffset
  - ST_Transform from EPSG:3111 to WGS84 — reference Gold Coast script pattern
  - Insert into zone_geometries with council = LGA name
  - Log progress every 500 records
Target LGAs: City of Melbourne, Port Phillip, Yarra, Stonnington, Boroondara,
  Merri-bek, Darebin, Moonee Valley, Maribyrnong, Hobsons Bay, Brimbank,
  Whitehorse, Manningham, Knox, Monash, Glen Eira, Bayside, Kingston,
  Frankston, Maroondah

### [x] Task 4 — Locate and ingest VIC flood overlays
Search within the same Vicmap Planning ArcGIS service for flood overlay layers.
Three types to ingest — all three:
  LSIO — Land Subject to Inundation Overlay
  FO — Floodway Overlay
  SBO — Special Building Overlay

### [x] Task 5 — Update route.ts for VIC flood response
Generic get_flood_for_point RPC returns Vicmap_Planning overlay_type automatically.
Schedule-number stripping added to VIC_standard fallback (GRZ1→GRZ, NRZ1→NRZ).

### [x] Task 6 — Seed minimal VIC zone rules
21 VIC zone rules seeded with council = 'VIC_standard'.

### [x] Task 7 — Update geocoder bounding box for VIC
VIC bounds added to isWithinCoverage (lat -39.5/-33.5, lng 140.5/150.5).

### [x] Task 8 — Deploy, smoke test, commit
CCZ2/melbourne ✅, NRZ1→NRZ/yarra ✅, PPRZ/bayside ✅. LSIO flood confirmed near Yarra.
Committed daf53d7. Pushed to main → Vercel deploy triggered.

---

## Sprint 23 — Victoria Schools + Melbourne Airport ANEF [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 23"

### [x] Task 1 — Ingest VIC school zones
File was GeoJSON (CRS84/WGS84) — no ST_Transform needed. 888 inserted (696 primary + 192 secondary year 7). Greater Melbourne bbox filter applied.

### [x] Task 2 — Melbourne Tullamarine ANEF
Source: spatial.planning.vic.gov.au/gis/rest/services/airport_environs/MapServer Layer 6 (ANEF20) + Layer 7 (ANEF25). 2 polygons inserted. Winding order fixed in DB with ST_ForcePolygonCCW after ArcGIS f=json returned CW rings.

### [x] Task 3 — Essendon Airport ANEF
ESSENDON_ANEF_NOT_FOUND — no public ANEF data available for Essendon Fields. Only Tullamarine and Avalon are in the VIC Planning spatial service.

### [x] Task 4 — Smoke test 5 Melbourne addresses
| Address | Zone | Council | Schools | ANEF |
|---------|------|---------|---------|------|
| 385 Bourke St Melbourne | CCZ2 | melbourne | — | — |
| 22 Church St Richmond | NRZ1→NRZ | yarra | Richmond High + Richmond West Primary | — |
| 56 Were St Brighton | GRZ4 | bayside | — | — |
| 12 Tullamarine Park Rd | — | (airport perimeter) | — | band confirmed at adjacent residential |
| 8 Matthews Ave Airport West | — | (Essendon ANEF NOT_FOUND) | — | — |

### [x] Task 5 — Deploy and commit
Committed with Sprint 23 scripts. Pushed main → Vercel.

---

## Sprint 24 — SEQ Flood Gap Fill (6 Councils) [ ]
**Slack:** "sprint: zoneiq 24"
**Note:** Can run in parallel with Sprints 19–23 if overnight capacity allows.
**Current state:** flood_overlays has 7,102 rows (Brisbane only).
Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland = zero flood data.

### [ ] Task 1 — Discover flood overlay endpoints for all 6 councils
For each council below, search for their flood overlay ArcGIS FeatureServer or
downloadable shapefile. Search pattern:
  "[council name] flood overlay ArcGIS FeatureServer"
  "[council name] planning scheme flood data download"

Known starting points:
  Gold Coast: https://cityplan.goldcoast.qld.gov.au — Overlays section
    Note: Gold Coast uses EPSG:28356 — ST_Transform required (same as zone geometries)
  Moreton Bay: https://www.moretonbay.qld.gov.au/Services/Planning/Planning-Scheme
    Note: ArcGIS auto-reprojects — no ST_Transform needed (same as zone geometries)
  Sunshine Coast: https://www.sunshinecoast.qld.gov.au/planning-and-development
    Note: ArcGIS auto-reprojects — no ST_Transform needed
  Ipswich: https://www.ipswich.qld.gov.au → Planning → Planning Scheme
  Logan: https://www.logan.qld.gov.au → Planning Scheme
  Redland: https://www.redland.qld.gov.au → Planning Scheme

Spend max 15 minutes per council. Log found URL or "NOT_FOUND — manual required".

### [ ] Task 2 — Ingest each council's flood data
For each council with a confirmed endpoint:
  - Write: scripts/ingest-[council]-flood.js
  - Apply ST_Transform if CRS is not WGS84 (check per council)
  - Insert into flood_overlays:
      council = '[council name]' matching convention in zone_geometries
      source = '[Council]_flood_overlay'
      flood_type = appropriate type from that council's schema
  - Log record count per council

### [ ] Task 3 — Run 30-address re-test
Re-run the original 30-address test set from FLOOD_COVERAGE_TEST.md against
the live API at zoneiq-sigma.vercel.app.
Log results to FLOOD_COVERAGE_TEST_V2.md. Target pass rate: >80%.

### [ ] Task 4 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 24: SEQ flood gap fill — Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland"

---

## Sprint 25 — National Geocoder + Routing + API v2.0 [ ]
**Slack:** "sprint: zoneiq 25"
**Run after:** Sprints 19–23 complete (NSW and VIC data must be ingested first).

### [ ] Task 1 — Update geocoder to national bounds
In lib/geocode.ts, replace all regional bounding box guards with a single national check:
  Accept: lat -44 to -10, lng 112 to 154
Remove all previous TODO comments about widening bounds.

### [ ] Task 2 — Confirm state-aware address suffix
Verify state suffix detection from Sprint 19 Task 7 is working for all three states.
Test: 3 addresses with no state → confirm ', Australia' appended.
Test: NSW, VIC, QLD addresses → confirm correct suffix.

### [ ] Task 3 — Verify council detection for NSW and VIC
Use Supabase MCP to confirm ST_Contains returns correct council:
  - lat=-33.8688, lng=151.2093 → should return a Sydney LGA council name
  - lat=-37.8136, lng=144.9631 → should return City of Melbourne or Port Phillip
If either returns null, halt and log — geometry ingest from Sprint 19 or 22 has an issue.

### [ ] Task 4 — Disable QFAO fallback for non-QLD addresses
In route.ts, add state detection before QFAO fallback:
  NSW LGA → skip QFAO, use NSW EPI flood data already in DB
  VIC LGA → skip QFAO, use Vicmap Planning flood data already in DB
  QLD council → proceed with QFAO fallback as before (Sprint 16)

### [ ] Task 5 — Add API version to response
Add response header: X-ZoneIQ-Version: 2.0.0
Add to response body meta:
  {
    version: '2.0.0',
    coverage: ['QLD_SEQ', 'NSW_Sydney', 'VIC_Melbourne'],
    partial: true/false,
    reason: '...'
  }

### [ ] Task 6 — 10-address national smoke test
  "8 Fairfield Road, Yeronga QLD 4105"
  "30 Oxlade Drive, New Farm QLD 4005"
  "1 Surfers Paradise Boulevard, Surfers Paradise QLD 4217"
  "10 Bulcock Street, Caloundra QLD 4551"
  "12 Martin Place, Sydney NSW 2000"
  "45 Homebush Bay Drive, Homebush NSW 2140"
  "8 Penrith Street, Penrith NSW 2750"
  "200 Swanston Street, Melbourne VIC 3000"
  "22 Church Street, Richmond VIC 3121"
  "56 Were Street, Brighton VIC 3186"
For each log: state detected, coordinates, council, zone code, flood, school, ANEF.
Flag any null council or null zone.

### [ ] Task 7 — Log manual actions required
Log to OVERNIGHT_LOG.md:
  MANUAL: Update RapidAPI ZoneIQ listing to reflect NSW + VIC coverage
  MANUAL: Update zoneiq.com.au marketing page to reflect national coverage
  MANUAL: Review RapidAPI pricing tiers for national coverage

### [ ] Task 8 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 25: national geocoder, NSW+VIC routing, API v2.0.0"

---

## Sprint 16 — QFAO Statewide Flood Fallback [ ]
**Slack:** "sprint: zoneiq 16"
**Run after:** Sprint 24 complete. SEQ flood gap fill must be done first — otherwise
QFAO fires incorrectly for councils that have real flood data incoming.

**Goal:** For addresses outside all councils with flood overlay data, fall back to the
Queensland Floodplain Assessment Overlay (QFAO) API instead of returning no data.

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
3. If no AND council is QLD: query QFAO endpoint live at runtime
4. If no AND council is NSW or VIC: do not use QFAO (handled by Sprint 25 Task 4)
5. If QFAO returns a polygon: flag as FLOOD_RISK_POSSIBLE
6. If QFAO returns nothing: flag as NO_STATE_FLOOD_OVERLAY

**Disclaimer to include in API response for QFAO results:**
"This flood assessment is based on the Queensland state-level floodplain overlay
and is not property-specific. Contact your local council for detailed flood mapping."

**Rules:**
- Do NOT ingest QFAO data into Supabase — live query only
- Do NOT modify existing flood overlay logic for the 7 current councils

---

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
- [x] Sprint 14: Contaminated land live lookup — No free API exists. Returns link-out to QLD Government paid search via /api/check-contaminated. Response: checked: false, reason: no_free_api, search_url to environment.qld.gov.au.
- [x] Sprint 15: Acid sulfate soil overlays — /api/check-acid-sulfate. Layer 1952 (1:50,000, SEQ) with national Layer 2052 fallback. Live lookup via QLD SoilsAndLandResource MapServer. Returns has_acid_sulfate_soil, scale, map_code, probability_class, description, source_layer.
- [x] Update RapidAPI listing description to reflect 189,751 polygons and 7 councils.
- [x] Add usage dashboard endpoint — authenticated users can check usage vs limit.
- [x] Add basic API tests — Jest or Vitest. Test /api/lookup with known addresses. Run in CI on every push via GitHub Actions.
- [x] Sprint 17 + 17b: API delivery bug fixes — ZONE_NOT_SEEDED gate removed (overlays now returned with rules: null on partial response), SEQ bounding box guard added to geocoder, Google Geocoding API replacing Nominatim (GOOGLE_GEOCODING_API_KEY in Vercel env), .vercelignore added to exclude 1.3GB data/ directory. Brisbane zone_rules seeded: 18 total (LDR, CR, NC, PC, HDR, MDR, CM, LI, MU, CF, IN, SR, SP, LMR + others). Smoke tested. SC zone code not yet seeded.
- Total zone polygons: 190,751 across 7 SEQ councils (Brisbane, Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland)
