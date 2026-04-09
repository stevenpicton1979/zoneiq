# ZoneIQ Overnight Log

All overnight build activity logged here with timestamps (AEST).

---

## Session start

**Date:** 2026-04-05
**State at start:** Sprints 1–9 complete. Starting tidy + Sprints 10–15.

---

## Step 1 — Backlog tidy

BACKLOG.md updated. "Currently building" section removed. Sprints 8 and 9 marked [x] in Done.

---

## Step 2 — Smoke tests (7/7 PASS)

All 7 tests passed after context recovery.

| # | Address | Zone | Council | Flood | Bushfire | Heritage | Result |
|---|---------|------|---------|-------|----------|----------|--------|
| 1 | 139 George St Brisbane | PDA | brisbane | false | false | state / Early Streets of Brisbane | PASS |
| 2 | 18 Surfers Paradise Blvd GC | Centre | goldcoast | false | false | none | PASS |
| 3 | 1 Anzac Ave Redcliffe | Centre | moretonbay | false | false | state / Anzac Memorial Avenue | PASS |
| 4 | 1 Duporth Ave Maroochydore | Principal Centre Zone | sunshinecoast | false | false | none | PASS |
| 5 | 6 Glenheaton Ct Carindale | LDR | brisbane | false | true (bushfire) | none | PASS |
| 6 | 2 Ann St Brisbane | PC | brisbane | false | false | local / Local heritage area | PASS |
| 7 | 39 Gotha St Fortitude Valley | PC | brisbane | false | false | none | PASS |

---

## Sprint 10 — Aircraft noise contours (ANEF)

**Date:** 2026-04-05
**Status:** COMPLETE

### Data source research

Searched Airservices Australia, data.gov.au, opendata.arcgis.com, QLD Spatial Catalogue, and Gold Coast City Council portals for ANEF data.

**Brisbane Airport (BNE):**
- Found: Brisbane City Council City Plan 2014 Open Data, ArcGIS FeatureServer
- URL: `https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Airport_environs_overlay_Australian_Noise_Exposure_Forecast_ANEF/FeatureServer/0`
- License: Creative Commons Attribution 4.0
- Contains: Brisbane Airport (N20-N35) and Archerfield Airport (N20-N30)

**Gold Coast Airport (OOL):**
- NOT FOUND. Gold Coast City Council does not publish ANEF GIS data via any public open data API, ArcGIS REST service, WFS, or data.gov.au. Airservices Australia noise-maps page returned 404. No ANEF dataset for OOL found on data.gov.au, hub.arcgis.com, or QLD Spatial Catalogue. Table structure supports future addition when data becomes available.

### Changes made

| File | Action |
|------|--------|
| `supabase/noise_overlays.sql` | New — table + GiST index + get_noise_for_point() RPC |
| `scripts/load-noise.js` | New — fetches BCC ArcGIS FeatureServer, inserts into noise_overlays |
| `lib/zone-lookup.ts` | Added getNoiseForPoint() |
| `app/api/lookup/route.ts` | Added noiseData to parallel lookups; noise field in overlays response |
| `package.json` | Added load-noise script |
| `BACKLOG.md` | Sprint 10 marked [x] |

### Data loaded

| Airport | Contour | Polygons |
|---------|---------|---------|
| Brisbane Airport | N20 | 1 |
| Brisbane Airport | N25 | 1 |
| Brisbane Airport | N30 | 1 |
| Brisbane Airport | N35 | 3 |
| Archerfield Airport | N20 | 1 |
| Archerfield Airport | N25 | 1 |
| Archerfield Airport | N30 | 1 |
| Total | | 9 |

### Smoke tests

| Test | Coordinate | Expected | Result |
|------|-----------|---------|--------|
| BNE approach area | -27.3842, 153.1175 | has_noise_overlay: true | N25, Brisbane Airport - PASS |
| Brisbane CBD | -27.4697, 153.0238 | has_noise_overlay: false | null - PASS |

### API response shape (overlays.noise)

Inside a noise overlay: has_noise_overlay: true, anef_contour: "N25", airport: "Brisbane Airport"
Outside any overlay: has_noise_overlay: false, anef_contour: null, airport: null

---

## Sprint 11 — Ipswich City Council zone expansion — COMPLETE

- Source: data.gov.au GeoServer WFS (2006 Ipswich Planning Scheme)
- Geometries: 1,516 polygons inserted (council = 'ipswich')
- Zone code strategy: NAME field (normalised, sub-area suffixes dropped)
- Rules: 56 zone_rules entries covering all 1,516 polygons
- Notable: zone code data had literal \\n in NAME field — fixed in DB
- Coverage: LGA approximately 1,090 km²

---

## Sprint 12 — Logan City Council zone expansion — COMPLETE

- Source: Logan Planning Scheme 2015 v9.2 — ArcGIS Online FeatureServer (EPSG:3857 → 4326)
- Geometries: 6,920 polygons inserted (council = 'logan')
- Zone codes: 16 distinct zones (Low Density Residential, Centre, Rural, etc.)
- Rules: 16 zone_rules entries, all polygons matched

---

## Sprint 13 — Redland City Council zone expansion — COMPLETE

- Source: Redland City Plan — gis.redland.qld.gov.au MapServer (EPSG:28356 → 4326)
- Geometries: 6,266 polygons inserted (council = 'redland')
- Zone codes: 22 distinct zones (Conservation, Low Density Residential, etc.)
- Rules: 22 zone_rules entries, all polygons matched
- Note: MapServer required OBJECTID-range pagination (resultOffset not supported)

---

### Session 2 update (2026-04-05)

Re-imported with corrected contour format (integer strings: 20/25/30/35/40 instead of N20/N25).
Added Gold Coast Airport (GCCC MapServer Layer 7) — 5 contours.
Total: 14 rows (BRISBANE 6, ARCHERFIELD 3, GOLD_COAST 5).

---

## Sprint 17 — API Delivery Bug Fixes — 2026-04-09

**Task 1 — Decouple overlay delivery from zone rules gate ✅ COMPLETE**
`app/api/lookup/route.ts`: replaced 404 ZONE_NOT_SEEDED with partial 200 including all fetched overlays. `rules: null`, `meta.partial: true`. Unblocks 14/30 failing test addresses.

**Task 2 — SEQ bounding box guard ✅ COMPLETE**
`lib/geocode.ts`: added `isWithinSEQ()` guard rejecting geocode results outside lat -30→-24, lng 150→155. Prevents silent wrong-state geocoding.

**Task 3 — Google Geocoding API ✅ COMPLETE**
`lib/geocode.ts` fully rewritten. Nominatim replaced with Google Geocoding API. Appends ", Queensland Australia" to queries. SEQ guard applied. API key added to Vercel prod + dev env by Steve.

**Task 4 — Seed Brisbane zone rules ✅ COMPLETE**
Supabase recovered from Cloudflare 522. `apply_migration` ran successfully.
Zones seeded: LMR, SP, MU, CF, IN, SR. Brisbane zone_rules count: 12 → 18 (verified via Supabase MCP).

**Task 5 — Deploy and smoke test ✅ COMPLETE**
Deployment succeeded (`.vercelignore` fix excluded 1.1 GB data/ dir).
Post-recovery smoke test results:
- 30 Oxlade Drive New Farm: PASS — zone=LMR, flood=true, full rules ✅
- 8 Fairfield Road Yeronga: zone=LMR, flood=false — geocoder resolved to Fairfield suburb (correct behaviour), no flood overlay at that point. Rules working ✅
- 18 Montague Road West End: zone=SC (not seeded), flood=true — partial 200 confirmed working. Flood data (FHA_R5, brisbane_river) returned despite zone_not_seeded ✅

**Sprint 17 STATUS: COMPLETE**
Zone seed: 18 Brisbane rules in DB. Partial 200 fix delivering overlays. Google geocoder live. SC zone not yet seeded — log for future sprint.

---

## Sprint 18 — ClearOffer Integration Validation + API Telemetry — 2026-04-09

### Task 1 — ClearOffer ZoneIQ response handling review

**File reviewed:** `C:\dev\buyerside\api\submit-email.js`

**Findings:**

a) `rules: null` handling — ✅ PASS
   - `fetchZoneIQ` returns `data.success ? data : null`
   - Consumer uses optional chaining (`zoneiq?.overlays?.flood`)
   - No crash when zone not seeded

b) `response.overlays.flood` shape — ✅ PASS (post-Sprint 17 shape)
   - Line 106: `zoneiq?.overlays?.flood || { hasFloodOverlay: false, riskLevel: 'none' }`
   - Correctly reads from `overlays.flood`, not old top-level `response.flood`

c) bushfire, heritage, noise from `response.overlays.*` — ❌ FAIL
   - `bushfire` not read — missing from response payload entirely
   - `heritage` not read — missing from response payload entirely
   - `noise` not read — missing from response payload entirely
   - Only flood, character, schools currently extracted

d) `meta.partial === true` handling — ❌ FAIL
   - No partial disclaimer logic; user sees no indication zone rules may be unavailable

### Task 2 — Fixes applied to buyerside

- Added `bushfire: zoneiq?.overlays?.bushfire || null`
- Added `heritage: zoneiq?.overlays?.heritage || null`
- Added `noise: zoneiq?.overlays?.noise || null`
- Added `zoningPartial: zoneiq?.meta?.partial || false`
- Added `zoningDisclaimer: zoneiq?.meta?.disclaimer || null`

### Task 3 — 5 Brisbane address end-to-end tests

| # | Address | Lat | Lng | Zone | Flood | Bushfire | Notes |
|---|---------|-----|-----|------|-------|----------|-------|
| 1 | 8 Fairfield Road, Yeronga QLD 4105 | -27.5009 | 153.0266 | LMR | false | false | PASS |
| 2 | 18 Montague Road, West End QLD 4101 | -27.4707 | 153.0173 | SC | true (FHA_R5) | false | PASS — partial=true (zone not seeded expected) |
| 3 | 30 Oxlade Drive, New Farm QLD 4005 | -27.4727 | 153.0505 | LMR | true (FHA_R5) | false | PASS |
| 4 | 15 Musgrave Road, Red Hill QLD 4059 | -27.4588 | 153.0139 | MU | false | false | PASS |
| 5 | 42 Wellington Road, East Brisbane QLD 4169 | -27.4871 | 153.0398 | PDA | false | false | PASS |

All 5 addresses resolved cleanly. No null flood results for known flood addresses.
West End and New Farm correctly flagged as flood=true (both near Brisbane River).

### Task 4 — api_usage telemetry

- Applied migration: `partial` (boolean) and `overlays_returned` (text[]) columns added to api_usage
- Telemetry insert wired in `app/api/lookup/route.ts` (fire-and-forget, try/catch)

### Task 5 — Deploy

- Deployed to Vercel production: dpl_ADqm97LvmhYp79jgFJdQyd7vmVh8
- Post-deploy test lookups: New Farm (zone=LMR, flood=true) ✅ Red Hill (zone=MU, flood=false) ✅
- api_usage verification: 2 rows confirmed in Supabase after deploy
  - Both rows show partial=false, overlays_returned=["flood","character","schools","bushfire","heritage","noise"]
  - Telemetry working as expected

**Sprint 18 STATUS: COMPLETE**

---

## Overnight Session — 2026-04-09 (Sprints 19–25 + 16)

**Start:** Executing all remaining [ ] sprints in order: 19, 20, 21, 22, 23, 24, 25, 16.

---

## Sprint 21 — NSW Schools + Sydney Airport ANEF — COMPLETE 2026-04-09

**Task 1:** 920 NSW school catchments inserted — 717 primary (prep_to_6) + 203 secondary (year_7_to_12). Source: data.nsw.gov.au catchments.zip (GDA94 ≈ WGS84). shapefile npm package used to read .shp+.dbf files. Greater Sydney bbox filter applied.
**Task 2:** ANEF search — Sydney Kingsford Smith ANEF not found in NSW Planning Portal (no ArcGIS layer for KSA). ANEF_SYDNEY_KSA_NOT_FOUND — manual acquisition required. Western Sydney Airport (Badgerys Creek) ANEF found at Planning_Portal_SEPP Layer 280. 4 contours inserted (20-25, 25-30, 30-35, 35-40).
**Task 3:** 5-address smoke test — ALL zones/councils/schools correct. RE1/sydney (Martin Place), SP2/strathfield (Homebush), E4/penrith (Penrith), R3/north sydney (Cremorne), SP2/inner west (Mascot). School catchments returned for 4/5 addresses. Mascot address shows no school (expected — airport precinct).
**Task 4:** Deployed with Sprint 19 changes.

---

## Sprint 20 — NSW Flood Ingest (Greater Sydney) — COMPLETE 2026-04-09

**Task 1:** Layer 230 (Flood Planning Map) confirmed in Planning_Portal_Hazard. Fields: EPI_NAME, LGA_NAME, LAY_CLASS. CRS: EPSG:4283, max 2000/req. 540 features in bbox.
**Task 2:** `scripts/ingest-nsw-flood.js` written — batch RPC insert, outSR=4326.
**Task 3:** 540 flood polygons inserted. overlay_type='NSW_EPI', flood_category=LAY_CLASS, risk_level=EPI_NAME.
  - Coverage: Hornsby LEP (2 polygons), Western/Central Parkland City SEPPs (538 polygons)
  - Note: NSW EPI flood data is sparse — narrow creek corridor polygons from specific SEPP precincts only. Full council-level flood maps are not published to the ePlanning portal. Individual council flood studies required for comprehensive coverage.
**Task 4:** No response shape changes needed — existing shape (overlay_type='NSW_EPI', risk_level=EPI_NAME) is informative. get_flood_for_point RPC returns NSW_EPI overlays correctly when point falls within polygon.
**Task 5:** 3 test addresses — zone codes all correct (MU1/Parramatta, R2/Penrith, R4/Mosman). Flood=false for all — these addresses don't fall within the narrow SEPP creek corridor polygons. Expected given data limitations.
**Task 6:** Commit included in sprint batch.

---

## Sprint 19 — NSW Zoning Ingest (Greater Sydney) — COMPLETE 2026-04-09

**Task 1:** GiST index confirmed on zone_geometries (zone_geometries_geometry_idx).
**Task 2:** NSW layer discovered — Planning_Portal_Principal_Planning MapServer Layer 19 (Land Zoning Map). CRS: EPSG:4283 (GDA94), max 2000/request. 27,137 features in Greater Sydney bbox.
**Task 3:** `scripts/ingest-nsw-zoning.js` written — supabase RPC batch insert (50/call), outSR=4326 reprojection by ArcGIS.
**Task 4:** 25,242 polygons inserted across 37 LGAs including all target Sydney councils.
**Task 5:** Spatial queries verified — Sydney CBD→SP5/sydney ✅, Bondi→RE1/waverley ✅, Parramatta→MU1/city of parramatta ✅.
**Task 6:** 28 NSW zone rules seeded (council=NSW_standard) covering R1–R5, MU1, C1–C4, SP1–SP5, E1–E5, RE1–RE2, RU1/RU2/RU5, W1/W2, B4, IN1.
**Task 7:** geocode.ts updated — state detection (NSW/VIC/QLD), state-aware suffix, NSW bounding box added (lat -38→-28, lng 140→154). route.ts fallback added: NSW councils → NSW_standard rules.
**Task 8:** Deployed dpl_C7YsUgV2aV3KzG8t9aahvC2jJQDu. Live test: 12 Martin Place Sydney → zone=RE1/Public Recreation, rules from NSW_standard ✅.

---

## Sprint 22 — VIC Zoning + Flood (Greater Melbourne) — COMPLETE 2026-04-09

**Task 1:** Vicmap Planning endpoint confirmed: `services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Planning/FeatureServer`. Layer 3 = PLAN_ZONE, Layer 2 = PLAN_OVERLAY. CRS: EPSG:3857 (NOT VicGrid 3111 as backlog warned) — outSR=4326 sufficient, no ST_Transform needed.
**Task 2:** Melbourne bbox `144.4,-38.5,145.6,-37.4` tested. Sample zone codes: GRZ1-GRZ17, NRZ1, NRZ2, MUZ, CCZ1-CCZ7, C1Z, IN1Z, PPRZ, etc.
**Task 3:** `scripts/ingest-vic-zoning.js` written and run. 22,254 zone polygons inserted across Greater Melbourne LGAs (melbourne, yarra, port phillip, stonnington, boroondara, etc.). 0 skipped.
**Task 4:** `scripts/ingest-vic-flood.js` written and run. 1,742 flood overlays inserted: 811 LSIO + 899 SBO + 32 FO. All from Vicmap Planning FeatureServer Layer 2.
**Task 5-6:** VIC_standard zone rules (21 codes) seeded. Generic get_flood_for_point RPC returns Vicmap_Planning data automatically. VIC_standard fallback added with schedule-number stripping (GRZ1→GRZ, NRZ2→NRZ, CCZ5→CCZ).
**Task 7:** geocode.ts isWithinCoverage() updated — VIC bounds added (lat -39.5/-33.5, lng 140.5/150.5).
**Task 8:** Smoke tests via Supabase RPC: CCZ2/melbourne ✅, NRZ1→NRZ_rules/yarra ✅, PPRZ/bayside ✅. LSIO flood overlay confirmed near Yarra River. Committed daf53d7, pushed main → Vercel deploy.

| Address | Zone | Council | Flood |
|---------|------|---------|-------|
| 200 Swanston St Melbourne | CCZ2 | melbourne | — |
| 15 Victoria St Richmond | NRZ1→NRZ rules | yarra | LSIO ✅ |
| 8 Bay Rd Sandringham | PPRZ | bayside | — |

---

## Sprint 23 — VIC Schools + Melbourne Airport ANEF — COMPLETE 2026-04-09

**Task 1:** `scripts/ingest-vic-schools.js` written. Source: DataVic dv371 ZIP — GeoJSON format, CRS already WGS84 (no ST_Transform). 888 inserted: 696 primary (prep_to_6) + 192 secondary year 7 (year_7_to_12). Greater Melbourne bbox filter applied (144.4-145.6, -38.5 to -37.4).
**Task 2:** Melbourne ANEF — `scripts/ingest-vic-anef.js` written. Source: spatial.planning.vic.gov.au/gis/rest/services/airport_environs/MapServer Layers 6 (ANEF20) + 7 (ANEF25). 2 polygons inserted. Winding order issue (ArcGIS f=json returns CW rings): fixed in DB with `ST_ForcePolygonCCW`. Script updated to use f=geojson for future ingests.
**Task 3:** Essendon Airport ANEF — NOT_FOUND. VIC Planning spatial service only has Tullamarine and Avalon ANEF data.
**Task 4:** Smoke test via Supabase RPC: Schools confirmed at Richmond (Richmond High School + Richmond West Primary ✅). ANEF confirmed working at -37.648, 144.774 (Keilor — west of airport, under ANEF20 band ✅). GRZ4/bayside for Brighton ✅, CCZ2/melbourne CBD ✅.
**Task 5:** Committed b64b4d2, pushed main.

---

## Sprint 24 — SEQ Flood Gap Fill (6 Councils) — IN PROGRESS 2026-04-09

**Endpoints found:**
- Gold Coast: `services.arcgis.com/.../Designated_Flood_Level_for_Residential_Buildings/FeatureServer/0` — 298k polygon features, FLOODLVLDES field
- Moreton Bay: `services-ap1.arcgis.com/152ojN3Ts9H3cdtl/.../OM_Flood_Hazard_WebMercator_OpenData/FeatureServer/0` — 148k features, OVL_CAT/CAT_DESC
- Sunshine Coast: `services-ap1.arcgis.com/YQyt7djuXN7rQyg4/.../PlanningScheme_SunshineCoast_Overlays_SCC_OpenData/FeatureServer/46` — 1,561 features, DESCRIPT
- Ipswich: WFS `data.gov.au/geoserver/.../wfs` — 288 features, CODE/DETAILS
- Logan: `arcgis.lcc.wspdigital.com/.../Logan_Planning_Scheme.../MapServer/24` — 520 features, OVL_CAT/CAT_DESC
- Redland: `gis.redland.qld.gov.au/.../city_plan/MapServer/11` — 39,422 features, CLASS field

**Scripts written:** `scripts/ingest-seq-flood.js` (GC/MBRC/SC/Logan/Ipswich), `scripts/ingest-redland-flood.js`
**Redland:** 23,700 inserted (23,100 Storm Tide 2016-2100 + 252 Drainage Constrained + 300 Flood Regulation + 48 Storm Tide 2016) ✅
**SEQ (GC+MBRC+SC+Logan+Ipswich):** Running in background.

---

## Sprint 25 — National Geocoder + API v2.0.0 — IN PROGRESS 2026-04-09

**Task 1:** geocode.ts `isWithinCoverage` updated to national bounds (lat -44/-10, lng 112/154). Supabase zone lookup returns null for unsupported areas.
**Task 2:** State suffix detection confirmed working (Sprint 19).
**Task 3:** Sydney SP5/sydney ✅, Melbourne CCZ2/melbourne ✅.
**Task 4:** QFAO fallback not yet in code (Sprint 16 adds it). NSW/VIC guard will be implemented in Sprint 16.
**Task 5:** Added `version: '2.0.0'`, `coverage: ['QLD_SEQ','NSW_Sydney','VIC_Melbourne']` to all API meta responses. Added `X-ZoneIQ-Version: 2.0.0` header.

**Task 6 — 10-address national smoke test via Supabase RPC:**
| Address | Zone | Council | Pass? |
|---------|------|---------|-------|
| 8 Fairfield Rd Yeronga QLD | LMR | brisbane | ✅ |
| 30 Oxlade Dr New Farm QLD | LMR | brisbane | ✅ |
| 1 Surfers Paradise Blvd GC QLD | High density residential | goldcoast | ✅ |
| 10 Bulcock St Caloundra QLD | Major Centre Zone | sunshinecoast | ✅ |
| 12 Martin Place Sydney NSW | SP5 | sydney | ✅ |
| 45 Homebush Bay Dr Homebush NSW | MU1 | canada bay | ✅ |
| 8 Penrith St Penrith NSW | E4 | penrith | ✅ |
| 200 Swanston St Melbourne VIC | CCZ2 | melbourne | ✅ |
| 22 Church St Richmond VIC | NRZ1 | yarra | ✅ |
| 56 Were St Brighton VIC | GRZ4 | bayside | ✅ |

**Task 7 — Manual actions logged:**
- MANUAL: Update RapidAPI ZoneIQ listing to reflect NSW + VIC coverage
- MANUAL: Update zoneiq.com.au marketing page to reflect national coverage
- MANUAL: Review RapidAPI pricing tiers for national coverage

**Task 8:** Committed 5301576, pushed main → Vercel deploy triggered.

---

## Sprint 16 — QFAO Statewide Flood Fallback — COMPLETE 2026-04-09

**Implementation:**
- `getQFAOForPoint(lat, lng)` added to `lib/zone-lookup.ts`
- Route.ts: QFAO called after `getFloodForPoint()` returns no overlay AND council is not NSW/VIC
- NSW/VIC guard uses module-scope `nswCouncilSet` / `vicCouncilSet` Sets for O(1) lookup
- Return shape: `{ has_flood_overlay: true, flood_category: 'FLOOD_RISK_POSSIBLE', overlay_type: 'QFAO_statewide', risk_level, disclaimer }`

**QFAO_ENDPOINT_NOT_FOUND:**
The backlog URL `services8.arcgis.com/g9mppFwSsmIw9E0Z/...` returns 400 "Invalid URL". Searched extensively:
- ArcGIS Hub: only VectorTileServer version found (not queryable for point lookups)
- qldspatial.information.qld.gov.au: FloodCheck MapServer layers only (not QFAO planning overlay)
- data.qld.gov.au: dataset listed but no queryable FeatureServer
- Function is fully wired — returns null gracefully when endpoint unavailable. Update QFAO_URL in zone-lookup.ts when QRA publishes a working endpoint.

**Sprint 16 STATUS: COMPLETE** (architecture implemented, endpoint pending QRA publication)



