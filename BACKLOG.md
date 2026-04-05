# ZoneIQ Backlog

## How this works
Claude Code reads this file at the start of every session and works through tasks marked [ ] from top to bottom. Mark [x] when done. Edit via GitHub.com on your phone — no laptop needed.

## Ready to build next
- [ ] Sprint 10: Aircraft noise contours — Brisbane Airport + Gold Coast Airport ANEF data from Airservices Australia. Add as noise_overlays table. Return has_noise_overlay, anef_contour.
- [ ] Sprint 11: Ipswich City Council zone expansion — ArcGIS REST API same pattern as Moreton Bay.
- [ ] Sprint 12: Logan City Council zone expansion — ArcGIS REST API pattern.
- [ ] Sprint 13: Redland City Council zone expansion — ArcGIS REST API pattern.
- [ ] Sprint 14: Contaminated land live lookup — QLD MapsOnline API, query by coordinate, no bulk import.
- [ ] Sprint 15: Acid sulfate soil overlays — QLD Spatial Catalogue.
- [ ] Update RapidAPI listing description to reflect 175,049 polygons and 4 councils.
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
