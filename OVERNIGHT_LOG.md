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

### Session 2 update (2026-04-05)

Re-imported with corrected contour format (integer strings: 20/25/30/35/40 instead of N20/N25).
Added Gold Coast Airport (GCCC MapServer Layer 7) — 5 contours.
Total: 14 rows (BRISBANE 6, ARCHERFIELD 3, GOLD_COAST 5).

---
