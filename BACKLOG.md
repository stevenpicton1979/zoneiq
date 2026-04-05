# ZoneIQ Backlog

## How this works
Claude Code reads this file at the start of every session and works through tasks marked [ ] from top to bottom. Mark [x] when done. Edit via GitHub.com on your phone — no laptop needed.

## Ready to build next
- [ ] Sprint 14: Contaminated land live lookup — QLD MapsOnline API, query by coordinate, no bulk import. Investigation underway — endpoint not yet confirmed.
- [ ] Sprint 15: Acid sulfate soil overlays — QLD Spatial Catalogue.
- [ ] Update RapidAPI listing description to reflect 189,751 polygons and 7 councils.
- [ ] Add usage dashboard endpoint — authenticated users can check usage vs limit.

## Ideas to spec
- [ ] Add basic API tests — Jest or Vitest. Test /api/lookup with known addresses (Brisbane LDR, Gold Coast, Moreton Bay, Sunshine Coast). Verify zone_code, council, overlay fields present. Run in CI on every push via GitHub Actions.
- [ ] Development application tracking — Brisbane open data, DAs near an address
- [ ] Powerline easement overlays — Energex GIS data
- [ ] Noosa Shire Council zone expansion
- [ ] NSW expansion research

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
