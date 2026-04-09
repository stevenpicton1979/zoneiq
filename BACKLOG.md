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
- [ ] Sydney Kingsford Smith ANEF — not available as open data, manual acquisition required
- [ ] Essendon Airport ANEF — check planning.vic.gov.au again, was absent from Sprint 23 ingest
- [ ] school_catchments council column — add LGA field to enable filtering by council
- [ ] RapidAPI listing update — reflect NSW + VIC national coverage (MANUAL — cannot be done by Claude Code)
- [ ] zoneiq.com.au marketing page — update to reflect national coverage (MANUAL)
- [ ] QFAO endpoint — update QFAO_URL in lib/zone-lookup.ts when QRA publishes queryable FeatureServer

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
