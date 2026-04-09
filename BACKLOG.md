# ZoneIQ Backlog

## How this works
Claude Code reads this file at the start of every session and works through tasks marked [ ] from top to bottom. Mark [x] when done. Edit via GitHub.com on your phone — no laptop needed.

## Slack triggers
- Single sprint: "sprint: zoneiq [N]" e.g. "sprint: zoneiq 26"
- All remaining: "overnight: zoneiq"
- Brief: "Read BACKLOG.md and work through sprint [N]. Mark [x] tasks when done. Do not stop within a sprint. Log to OVERNIGHT_LOG.md with timestamps."

---

## Ideas to spec (not yet scheduled)
- [ ] Development application tracking — Brisbane open data, DAs near an address
- [ ] Powerline easement overlays — Energex GIS data
- [ ] Noosa Shire Council zone expansion
- [ ] Acid sulfate soils — currently live lookup only, consider ingesting into Supabase for speed
- [ ] school_catchments council column — add LGA field to enable filtering by council
- [ ] RapidAPI listing update — reflect NSW + VIC national coverage (MANUAL — cannot be done by Claude Code)
- [ ] QFAO endpoint — update QFAO_URL in lib/zone-lookup.ts when QRA publishes queryable FeatureServer
- [ ] Avalon Airport ANEF — VIC Airport Environs MapServer layers 3 (ANEF 2031) + 4 (ANEF 1993) are queryable. Ingest into noise_overlays: airport='AVALON'

---

## Sprint 26 — Update OpenAPI Spec to v2.0 [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 26"

**Goal:** Update the ZoneIQ OpenAPI spec to accurately reflect the current v2.0 API response
shape. This is the single source of truth for all API consumers (ClearOffer, SubdivideIQ,
RapidAPI, external developers). The spec was last updated at Sprint 6 and is significantly
stale — it predates national coverage, the overlays{} response shape change, partial
responses, and most overlay types.

### [x] Task 1 — Audit the current spec
Find the existing OpenAPI spec file in the repo (likely openapi.yaml, openapi.json,
or referenced in next.config.js / a /docs route).
Read it. Log to OVERNIGHT_LOG.md:
  - Current version number
  - What response fields it documents
  - What is missing vs the current actual API response

### [x] Task 2 — Document the current actual response shape
Make a live API call to zoneiq-sigma.vercel.app with a known Brisbane address and
a known Sydney address. Log the full JSON response for each to OVERNIGHT_LOG.md.
This becomes the ground truth for the spec update.

### [x] Task 3 — Update the OpenAPI spec
Rewrite the spec to accurately reflect v2.0. Must include:

  **Request:**
  - address (string, required)

  **Response — top level:**
  - success (boolean)
  - query: { address_input, address_resolved, lat, lng }
  - zone: { code, name, category, council }
  - rules: null | { min_lot_size, max_height_m, max_storeys, max_site_cover,
      setback_front, setback_side, setback_rear, notes }
  - overlays: { flood, character, schools, bushfire, heritage, noise }
  - meta: { partial, reason, version, coverage[] }

  **Overlay shapes:**
  - flood (QLD): { affected, flood_type, source, fpa_code } or null
  - flood (NSW): { affected, source, epi_name, note } or null
  - flood (VIC): { affected, overlay_type, source, note } or null
  - character: { in_overlay, overlay_type } or null
  - schools: { catchment_name, school_type, icsea } or null
  - bushfire: { affected, hazard_level, intensity_class } or null
  - heritage: { is_heritage, heritage_type, heritage_name, place_id } or null
  - noise: { has_noise_overlay, anef_contour, airport } or null

  **Error responses:**
  - 400: address missing or invalid
  - 200 with meta.partial: true — zone rules not seeded for this zone code
  - 200 with geocode_failed: true — address could not be geocoded

  **Coverage:**
  - Document all 84 councils in zone_geometries
  - Note which councils have full zone_rules vs partial (fringe councils)
  - Note which overlays are available per state (QLD/NSW/VIC)

  **Headers:**
  - X-ZoneIQ-Version: 2.0.0

### [x] Task 4 — Verify the spec is served correctly
Confirm the spec is accessible at a public URL (e.g. zoneiq-sigma.vercel.app/api/docs
or zoneiq-sigma.vercel.app/openapi.json).
If it is not currently served as a live endpoint, add a simple route that returns the
spec as JSON at /api/openapi.

### [x] Task 5 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 26: OpenAPI spec updated to v2.0 — full response shape, all overlays, national coverage"

---

## Sprint 27 — Marketing Page Update (zoneiq.com.au) [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 27"
**Run after:** Sprint 26 (spec should be current before marketing copy is written)

**Goal:** Update the zoneiq.com.au landing page to reflect the current product.
Current page says "SEQ's planning zone API" and lists only 4 councils. ZoneIQ now
covers 84 councils across QLD, NSW and VIC with 9 overlay types.

### [x] Task 1 — Read the current marketing page source
Find the landing page component(s) in the repo — likely app/page.tsx or pages/index.tsx.
Read the current copy and component structure. Log to OVERNIGHT_LOG.md what needs changing.

### [x] Task 2 — Update headline and subheadline
Current: "SEQ's planning zone API"
New: "Australia's planning zone API"

Current subheadline: "Instant zone, rules, and overlay data for any South East Queensland address."
New: "Instant zone, rules, and overlay data for any Australian address. One API call. Clean JSON. No scraping."

### [x] Task 3 — Update the Coverage card
Current: "Brisbane City Council, Gold Coast City Council, Moreton Bay Regional Council,
and Sunshine Coast Regional Council. More councils coming soon."

New: "84 councils across QLD, NSW and VIC. Brisbane, Sydney, Melbourne and surrounds.
More states coming soon."

### [x] Task 4 — Update the Overlays card
Current: "Flood risk (river + overland), character heritage overlay, and school catchments
in a single call."

New: "Flood risk, bushfire hazard, heritage listings, school catchments, aircraft noise
(ANEF), character overlays — all in a single call."

### [x] Task 5 — Update demo address examples
Current examples are all QLD only.
Replace with a mix across all three states:
  QLD: "18 Montague Road, West End QLD 4101"
  QLD: "1 Surfers Paradise Blvd, Surfers Paradise QLD 4217"
  NSW: "45 Homebush Bay Drive, Homebush NSW 2140"
  NSW: "12 Martin Place, Sydney NSW 2000"
  VIC: "22 Church Street, Richmond VIC 3121"
  VIC: "200 Swanston Street, Melbourne VIC 3000"

Also update the demo input placeholder text:
Current: "Enter any Brisbane, Gold Coast, Moreton Bay or Sunshine Coast address..."
New: "Enter any Australian address..."

### [x] Task 6 — Update page title and meta tags
Page title: "ZoneIQ — Australia's Planning Zone API"
Meta description: "Instant zone, rules, flood, bushfire, heritage, school and noise overlay
data for any Australian address. 84 councils. One API call. Clean JSON."

### [x] Task 7 — Deploy and commit
Vercel MCP deploy to production.
GitHub MCP commit to main: "Sprint 27: marketing page updated for national coverage"

---

## Sprint 28 — Sydney Kingsford Smith ANEF [x] COMPLETE 2026-04-09
**Slack:** "sprint: zoneiq 28"

**Goal:** Attempt to source and ingest Sydney KSF ANEF contours. KSF is the most
significant absent airport for NSW coverage — affects Mascot, Botany, Rockdale,
Marrickville, Sydenham, Alexandria, Tempe, Wolli Creek corridors.

### [x] Task 1 — Search NSW ePlanning ArcGIS for ANEF layer
The NSW ePlanning MapServer may include ANEF/aircraft noise as a planning overlay layer.
Fetch the full service directory:
  https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_SEPP/MapServer?f=json
  https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/MapServer?f=json
Search layer names for: ANEF, noise, aircraft, airport, Sydney Airport
Log all layer names and IDs to OVERNIGHT_LOG.md.

### [x] Task 2 — Search NSW open data portal
Search https://data.nsw.gov.au for: "ANEF", "Sydney Airport noise", "aircraft noise contour"
Search https://www.planningportal.nsw.gov.au/opendata/dataset/ for same terms.
Log any found datasets with their download URLs.

### [x] Task 3 — Check Sydney Airport Master Plan spatial data
Fetch: https://www.sydneyairport.com.au/corporate/doing-business-with-us/planning-and-environment/master-plan
Look for downloadable ANEF shapefile or GeoJSON linked from the Master Plan page.
Log findings.

### [x] Task 4 — Ingest if found
If ANEF contours found in any of the above sources:
  - Download and inspect CRS
  - Ingest into noise_overlays: airport='SYDNEY_KSF', anef_contour=[value]
  - Log record count

If not found after completing Tasks 1–3:
  - Log "KSF_ANEF_NOT_FOUND — sources exhausted. Manual contact required:
    planning@sydneyairport.com.au or NSW Planning spatial team."
  - Do not create a placeholder entry

### [x] Task 5 — Also attempt Essendon Airport ANEF
While in ANEF territory, retry Essendon which was absent from Sprint 23.
Fetch: https://www.planning.vic.gov.au/guides-and-resources/guides/all-guides/airports/airport-spatial-information
Look specifically for Essendon Fields / Essendon Airport ANEF shapefile.
If found: ingest into noise_overlays: airport='ESSENDON', anef_contour=[value]
If not found: log "ESSENDON_ANEF_NOT_FOUND"

### [x] Task 6 — Deploy and commit
Vercel MCP deploy to production (only if new data was ingested).
GitHub MCP commit to main: "Sprint 28: KSF + Essendon ANEF ingest attempt"

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
- [x] Sprint 16: QFAO statewide flood fallback — architecture wired. QFAO endpoint not publicly available — returns graceful null. Update QFAO_URL in lib/zone-lookup.ts when QRA publishes queryable FeatureServer. QLD only — NSW/VIC correctly bypass QFAO.
- [x] Sprint 17: API delivery bug fixes — ZONE_NOT_SEEDED gate removed (overlays returned with rules: null + meta.partial: true), SEQ bounding box guard added, Google Geocoding API replacing Nominatim (GOOGLE_GEOCODING_API_KEY in Vercel env), .vercelignore added (data/ dir was 1.3GB).
- [x] Sprint 17b: Brisbane zone rules seeded — LMR, SP, MU, CF, IN, SR confirmed present. Brisbane total: 18 rules.
- [x] Sprint 18: ClearOffer response shape validated (overlays.flood/bushfire/heritage/noise/character/schools all wired, meta.partial disclaimer shown). api_usage telemetry wired at route.ts line 293 — partial and overlays_returned columns confirmed. 12 rows verified.
- [x] Sprint 19: NSW zoning ingest — 25,242 polygons across ~25 Sydney LGAs. 29 NSW_standard zone rules. Geocoder updated with state-aware suffix detection and NSW bounding box (lat -38 to -28, lng 140 to 154).
- [x] Sprint 20: NSW flood ingest — 540 NSW EPI flood polygons (source='NSW_EPI'). route.ts updated for NSW flood response shape (epi_name field, refer-to-council note).
- [x] Sprint 21: NSW schools + ANEF — 920 school catchments. Western Sydney Airport ANEF ingested (4 contour bands: 20-25, 25-30, 30-35, 35-40). Sydney Kingsford Smith ANEF absent — not available as open data.
- [x] Sprint 22: VIC zoning + flood ingest — 22,254 zone polygons across ~20 Melbourne LGAs (EPSG:3111 → WGS84). 1,742 LSIO/FO/SBO flood overlays (source='Vicmap_Planning'). 21 VIC_standard zone rules. Geocoder updated with VIC bounding box.
- [x] Sprint 23: VIC schools + Melbourne ANEF — 888 school zones (WGS84 GeoJSON). Melbourne Tullamarine ANEF20 + ANEF25 ingested. Essendon Airport absent from VIC planning portal.
- [x] Sprint 24: SEQ flood gap fill — goldcoast 159,950 · redland 23,700 · sunshinecoast 1,561 · moretonbay 1,000 · logan 520 · ipswich 288. Total flood_overlays: 196,403 across all sources.
- [x] Sprint 25: National geocoder + routing + API v2.0 — national bounds (lat -44 to -10, lng 112 to 154), state-aware address suffix, QFAO bypass for NSW/VIC, X-ZoneIQ-Version: 2.0.0 header, meta.coverage field, 10-address national smoke test all passed.
- Total zone polygons: 238,993 across 84 councils (7 SEQ + ~35 NSW + ~42 VIC including fringe)
- Total flood_overlays: 196,403
- Total zone_rules: 222
- Total school_catchments: 2,206 (1,724 primary + 482 secondary)
- Total noise_overlays: 18 rows across 5 airports
- [x] Sprint 26: OpenAPI spec rewritten to v2.0.0 — full response shape, all 6 overlays, key_rules, uses, meta.partial, error responses, examples. /api/openapi route added. public/rapidapi-openapi.json updated.
- [x] Sprint 27: Marketing page updated — headline "Australia's planning zone API", 84 councils, 6 overlay types, national example addresses (QLD/NSW/VIC), placeholder text, meta title+description, footer. layout.tsx updated.
- [x] Sprint 28: KSF_ANEF_NOT_FOUND — no public ANEF data in NSW ePlanning services (Planning_Portal_SEPP Layer 280 is Western Sydney Airport only). data.nsw.gov.au: no ANEF datasets. ESSENDON_ANEF_NOT_FOUND — not in VIC Airport Environs MapServer (only Avalon + Melbourne Tullamarine). Note: Avalon Airport ANEF layers exist (layers 3+4) — not yet ingested, consider for future sprint.
