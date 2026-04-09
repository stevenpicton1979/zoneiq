# ZoneIQ Dataset Audit — 2026-04-09

---

## Supabase Tables

All tables live in a Supabase PostgreSQL instance with PostGIS enabled. Geometry columns use EPSG:4326 (WGS84) and are indexed with GiST.

### zone_geometries
**Row count:** 190,751  
**Columns:** id (bigserial PK), zone_code (text), geometry (MultiPolygon, 4326), council (text)  
**Index:** GiST on geometry  
**Data source:** Council ArcGIS REST APIs and data.gov.au WFS (see overlay loading scripts)  
**Council coverage:**

| Council | Rows | Source |
|---------|------|--------|
| brisbane | 26,358 | BCC ArcGIS REST (City Plan 2014 Zoning FeatureServer/0) |
| goldcoast | 29,537 | GCCC ArcGIS REST (City_Plan_Zones FeatureServer/0) |
| moretonbay | 13,950 | MBRC ArcGIS REST + Datahub fallback |
| sunshinecoast | 106,204 | SCC ArcGIS REST (PlanningScheme_Zoning FeatureServer/5) |
| ipswich | 1,516 | data.gov.au WFS (GetFeature) |
| logan | 6,920 | Logan ArcGIS REST (ESRI JSON, Zones_V9_2_WFL1 FeatureServer/4) |
| redland | 6,266 | Redland GIS MapServer/44 (OBJECTID-range pagination) |

**Notes:** Zone codes are stored as raw field values from source — full English strings for most councils, short codes for Brisbane (e.g. LDR, CR). Sunshine Coast codes carry a "Zone" suffix (e.g. "Low Density Residential Zone"). No zone geometries exist for Lockyer Valley, Noosa, Scenic Rim, or Somerset despite those LGAs having bushfire data.

---

### zone_rules
**Row count:** 166  
**Columns:** zone_code (PK component), council (PK component), zone_name, zone_category, max_height_m, max_storeys, max_site_coverage_pct, min_permeability_pct, front_setback_m, side_setback_m, rear_setback_m, secondary_dwelling_permitted, short_term_accom_permitted, home_business_permitted, subdivision_min_lot_size_m2, key_rules (text[]), permitted_uses (text[]), requires_permit_uses (text[]), prohibited_uses (text[]), source_url, last_verified, notes  
**Composite PK:** (zone_code, council)  
**Data source:** Manually seeded from planning scheme documents  
**Council coverage:**

| Council | Rules seeded | Notes |
|---------|-------------|-------|
| brisbane | 12 | ~30+ zone codes exist in geometries; only 12 seeded — many zones will return ZONE_NOT_SEEDED error |
| goldcoast | 24 | Full coverage of main residential/commercial zones |
| moretonbay | 14 | Full coverage of main zones |
| sunshinecoast | 22 | Full coverage of main zones |
| ipswich | 56 | Most comprehensive rule set |
| logan | 16 | Full coverage of main zones |
| redland | 22 | Full coverage of main zones |

**Completeness gap:** Brisbane has only 12 seeded rules against 26,358 geometry polygons covering many more zone codes. Any Brisbane zone not in the 12 seeded rules returns a 404 ZONE_NOT_SEEDED error.

---

### flood_overlays
**Row count:** 7,102  
**Columns:** id (bigserial PK), overlay_type (brisbane_river | overland_flow), flood_category (text), risk_level (high | medium | low | unknown), geometry (MultiPolygon, 4326)  
**Index:** GiST on geometry  
**Data source:** BCC Open Data portal (City Plan 2014 Flood Overlay) + ArcGIS fallback  
**Council coverage:** Brisbane only  

| overlay_type | risk_level | count |
|-------------|-----------|-------|
| brisbane_river | high | 241 |
| brisbane_river | medium | 4,198 |
| brisbane_river | low | 663 |
| overland_flow | high | 794 |
| overland_flow | medium | 660 |
| overland_flow | low | 546 |

**Gaps:** No flood overlay data for Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, or Redland.

---

### character_overlays
**Row count:** 14,164  
**Columns:** id (bigserial PK), character_type (text), geometry (MultiPolygon, 4326)  
**Index:** GiST on geometry  
**Data source:** BCC City Plan 2014 Character Overlay (Open Data / ArcGIS)  
**Council coverage:** Brisbane only  
**Notes:** Populated field is `character_type` = "Dwelling house character". No equivalent overlay for any other council.

---

### school_catchments
**Row count:** 398  
**Columns:** id (bigserial PK), school_name (text), school_type (primary | secondary), school_level (prep_to_6 | year_7_to_10 | year_11_to_12), suburb (text, always null), geometry (MultiPolygon, 4326)  
**Index:** GiST on geometry  
**Data source:** QLD Government KML files (primary_catchments_2026.kml, junior_secondary_catchments_2026.kml) via data.qld.gov.au  
**Council coverage:** QLD-wide source filtered to Brisbane bounding box  

| school_type | count |
|------------|-------|
| primary | 311 |
| secondary | 87 |

**Gaps:** `suburb` column is always null (field not populated at import). Only Brisbane bounding box was imported — other council areas are not covered. No senior secondary (Year 11–12) catchments are loaded.

---

### bushfire_overlays
**Row count:** 132,000  
**Columns:** id (bigserial PK), geometry (MultiPolygon, 4326), intensity_class (very_high | high | medium | buffer), lga (text), council (text)  
**Index:** GiST on geometry  
**Data source:** QFES Bushfire Prone Area (BPA) via ArcGIS Online proxy (item 8ac1ba8eccee472fbd0e7a57bf3ad320)  
**Council/LGA coverage:**

| council | lga | count |
|---------|-----|-------|
| brisbane | Brisbane | 6,460 |
| goldcoast | GoldCoast | 7,234 |
| ipswich | Ipswich | 6,544 |
| lockyer | Lockyer | 15,980 |
| logan | Logan | 7,078 |
| moretonbay | Moreton | 10,497 |
| noosa | Noosa | 4,650 |
| redland | Redland | 2,533 |
| scenicrim | ScenicRim_E | 9,857 |
| scenicrim | ScenicRim_W | 15,619 |
| somerset | Somerset_N | 19,170 |
| somerset | Somerset_S | 14,476 |
| sunshinecoast | SunshineC | 11,902 |

**Notes:** Lockyer, Noosa, Scenic Rim, and Somerset have bushfire overlay data but no zone geometries or rules — the `/api/lookup` endpoint will fail for addresses in those areas before ever reaching the bushfire check.

---

### heritage_overlays
**Row count:** 3,657  
**Columns:** id (bigserial PK), geometry (MultiPolygon, 4326), heritage_type (state | local), heritage_name (text), place_id (text), council (text)  
**Index:** GiST on geometry  
**Data source:**
- State heritage: QLD Heritage Register via `spatial-gis.information.qld.gov.au` (FeatureServer/78) — 1,800 places, QLD-wide, council = null
- Local heritage: BCC City Plan 2014 Heritage Overlay via BCC ArcGIS — 1,857 places, Brisbane only

| heritage_type | council | count |
|--------------|---------|-------|
| state | null (QLD-wide) | 1,800 |
| local | brisbane | 1,857 |

**Gaps:** No local heritage data for Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, or Redland. State heritage applies statewide.

---

### noise_overlays
**Row count:** 14  
**Columns:** id (bigserial PK), airport (text), anef_contour (text: 20 | 25 | 30 | 35 | 40), geom (MultiPolygon, 4326)  
**Index:** GiST on geom  
**Data source:** BCC City Plan 2014 Airport Environs Overlay (ArcGIS REST) — originally loaded for Brisbane/Archerfield; Gold Coast contours also present  

| airport | contours | polygons |
|---------|---------|---------|
| BRISBANE | N20, N25, N30, N35 | 6 (3 polygons for N35) |
| ARCHERFIELD | N20, N25, N30 | 3 |
| GOLD_COAST | N20, N25, N30, N35, N40 | 5 |

**Notes:** Gold Coast Airport (OOL) data is present in the DB despite the load script targeting BCC's ArcGIS endpoint — this may have been loaded in a subsequent sprint or from a secondary source. The column is named `geom` (not `geometry`) — verify the RPC function `get_noise_for_point` references the correct column name.

---

### api_keys
**Row count:** 1  
**Columns:** id (uuid PK), key_hash (text), key_prefix (text), name (text), email (text), plan (free | starter | pro), requests_today (int), requests_total (int), rate_limit_per_day (int), is_active (boolean), created_at, last_used_at  
**Notes:** 1 registered key (likely internal/test). No commercial key distribution yet.

---

### api_usage
**Row count:** 0  
**Columns:** id (uuid PK), key_id (FK → api_keys.id), address (text), council (text), zone_code (text), response_ms (int), created_at  
**Notes:** No usage recorded yet — either the logging is not yet wired into the lookup route, or no authenticated requests have been made.

---

### lookup_log
**Columns:** id (uuid PK), address_input, lat, lng, zone_code, created_at, user_agent, origin, source (text)  
**Notes:** Row count not queried — this table logs all lookups (unauthenticated and authenticated). Separate from `api_usage` which is keyed to authenticated API keys only.

---

## External APIs Called at Query Time

These APIs are called live during each `/api/lookup` request (not pre-loaded into the DB):

### Nominatim (OpenStreetMap Geocoding)
- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Parameters:** `q={address}`, `format=json`, `limit=1`, `countrycodes=au`
- **Returns:** Resolved address string, lat/lng coordinates
- **Coverage:** Australia-wide
- **Rate limit:** 1 req/sec (User-Agent: `ZoneIQ/0.1`)
- **Notes:** No API key required. Single point of failure — if Nominatim is down or returns no result, the entire lookup fails with ADDRESS_NOT_FOUND.

### Acid Sulfate Soils — QLD Spatial Services (Live)
- **Endpoint:** `https://spatial-gis.information.qld.gov.au/arcgis/rest/services/GeoscientificInformation/SoilsAndLandResource/MapServer`
- **Route:** `/api/check-acid-sulfate`
- **Layers queried:** Layer 1952 (1:50,000 SEQ) with Layer 2052 (national scale) fallback
- **Parameters:** bounding box around lat/lng, `spatialRel=esriSpatialRelIntersects`
- **Returns:** `has_acid_sulfate_soil`, `map_code`, `probability_class`, `scale`, `source_layer`
- **Coverage:** Queensland-wide (Layer 1952 prioritised for SEQ)
- **Notes:** Not pre-loaded into DB — live query only. Not currently called from the main `/api/lookup` endpoint; separate endpoint only.

### Contaminated Land Register (No API)
- **Route:** `/api/check-contaminated`
- **Returns:** `checked: false`, `reason: "no_free_api"`, redirect URL to QLD Government paid search portal
- **Notes:** No free public API exists. Returns a static redirect only.

---

## Overlays by Type

### Flood

| Field | Value |
|-------|-------|
| Data source | BCC City Plan 2014 Flood Overlay — Open Data portal + ArcGIS FeatureServer fallback |
| Source URL | `data.brisbane.qld.gov.au` / `services2.arcgis.com/dEKgZETqwmDAh1rP/...` |
| Councils covered | Brisbane only |
| Councils NOT covered | Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland |
| Last loaded | Unknown — no timestamp stored in table |
| DB rows | 7,102 (5,102 river flood + 2,000 overland flow) |
| Known issues | Overland flow source capped at 2,000 features by ArcGIS default limit. No statewide flood fallback (QFAO/QRA data identified in BACKLOG as Sprint 16 — not yet executed). |

---

### Zoning

| Field | Value |
|-------|-------|
| Data source | Council-specific ArcGIS REST APIs and data.gov.au WFS |
| Councils covered | Brisbane, Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland |
| Councils NOT covered | Lockyer Valley, Noosa, Scenic Rim, Somerset (bushfire data exists for these but no zones) |
| Last loaded | Unknown — no timestamp stored in zone_geometries |
| DB rows (geometries) | 190,751 |
| DB rows (rules) | 166 across 7 councils |
| Known issues | Brisbane has only 12 seeded zone rules vs. many more zone codes in geometries. Addresses in unmapped Brisbane zones return ZONE_NOT_SEEDED. Zone code field names differ by council (zone_code vs LVL1_ZONE vs LABEL etc.) — normalised at import time. |

---

### Character Overlay

| Field | Value |
|-------|-------|
| Data source | BCC City Plan 2014 Character Overlay — BCC Open Data / ArcGIS |
| Councils covered | Brisbane only |
| Councils NOT covered | All others (Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland) |
| Last loaded | Unknown |
| DB rows | 14,164 |
| Known issues | Only "Dwelling house character" type stored. Other BCC character subtypes may exist but are not differentiated. No equivalent overlay concept for non-Brisbane councils. |

---

### Schools / Catchments

| Field | Value |
|-------|-------|
| Data source | QLD Government KML (data.qld.gov.au) — 2026 catchment boundaries |
| Source URLs | `primary_catchments_2026.kml`, `junior_secondary_catchments_2026.kml` |
| Councils covered | Brisbane bounding box only (filtered at import) |
| Councils NOT covered | Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland |
| Last loaded | 2026 catchment year |
| DB rows | 398 (311 primary, 87 junior secondary) |
| Known issues | `suburb` column always null. No senior secondary (Year 11–12) catchments. Geographic filter means outer-Brisbane addresses may be near school catchments that weren't imported. QLD Government KML URLs may change annually. |

---

### Bushfire

| Field | Value |
|-------|-------|
| Data source | QFES Bushfire Prone Area (BPA) dataset via ArcGIS Online hosted service |
| Source | ArcGIS Online item `8ac1ba8eccee472fbd0e7a57bf3ad320` |
| Councils covered | Brisbane, Gold Coast, Ipswich, Logan, Moreton Bay, Noosa, Redland, Scenic Rim, Somerset, Sunshine Coast, Lockyer Valley |
| Councils NOT covered | None of the 7 main lookup councils are missing; Noosa/Lockyer/Scenic Rim/Somerset have BPA data but no zone data |
| Last loaded | Unknown |
| DB rows | 132,000 |
| Known issues | ArcGIS Online proxy URL may change (uses item ID, not stable service URL). Lockyer/Noosa/Scenic Rim/Somerset addresses cannot complete a full lookup as zone geometries are absent. |

---

### Heritage

| Field | Value |
|-------|-------|
| Data source | (1) QLD Heritage Register — `spatial-gis.information.qld.gov.au` FeatureServer/78; (2) BCC Local Heritage Overlay — `services2.arcgis.com/dEKgZETqwmDAh1rP/...` |
| Councils covered | State: QLD-wide; Local: Brisbane only |
| Councils NOT covered (local) | Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland |
| Last loaded | Unknown |
| DB rows | 3,657 (1,800 state + 1,857 local) |
| Known issues | State heritage records have `council = null` — they are not tied to any council in the DB. Local heritage only covers Brisbane. No local heritage for any other council. |

---

### Aircraft Noise (ANEF)

| Field | Value |
|-------|-------|
| Data source | BCC City Plan 2014 Airport Environs Overlay — ArcGIS REST FeatureServer |
| Councils covered | Brisbane (BNE + Archerfield); Gold Coast (OOL) data is present |
| Councils NOT covered | Moreton Bay, Sunshine Coast, Ipswich, Logan, Redland |
| Last loaded | Unknown |
| DB rows | 14 (6 BNE + 3 Archerfield + 5 OOL) |
| Contours | BNE: N20–N35; Archerfield: N20–N30; Gold Coast: N20–N40 |
| Known issues | Column is named `geom` (not `geometry`) — verify RPC function uses correct column name. Gold Coast data is present but was not expected from the original load script (source unknown). Sunshine Coast Airport (MCY) not covered. |

---

### Acid Sulfate Soils

| Field | Value |
|-------|-------|
| Data source | QLD Spatial Services — SoilsAndLandResource MapServer (Layers 1952 + 2052) |
| Councils covered | QLD-wide (live query) |
| DB rows | 0 — not pre-loaded, live API only |
| Endpoint | `/api/check-acid-sulfate` (separate from main lookup) |
| Known issues | Not integrated into main `/api/lookup` response. Relies on external API availability. Layer 1952 covers SEQ at 1:50k; Layer 2052 is national scale fallback. |

---

### Contaminated Land

| Field | Value |
|-------|-------|
| Data source | None — no free public API exists |
| Councils covered | None |
| DB rows | 0 — no table |
| Endpoint | `/api/check-contaminated` returns a static redirect to QLD Government paid search |
| Known issues | Cannot programmatically check contaminated land status. Returns only a link to `environment.qld.gov.au/apps/property-searches-about`. |

---

## Coverage Matrix

| Overlay | Brisbane | Gold Coast | Moreton Bay | Sunshine Coast | Ipswich | Logan | Redland |
|---------|----------|------------|-------------|----------------|---------|-------|---------|
| **Zoning (geometries)** | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| **Zoning (rules)** | PARTIAL (12/many) | FULL | FULL | FULL | FULL | FULL | FULL |
| **Flood** | FULL | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| **Character** | FULL | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| **Schools** | FULL | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| **Bushfire** | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| **Heritage (state)** | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| **Heritage (local)** | FULL | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| **Aircraft Noise** | FULL | FULL | MISSING | MISSING | MISSING | MISSING | MISSING |
| **Acid Sulfate** | LIVE API | LIVE API | LIVE API | LIVE API | LIVE API | LIVE API | LIVE API |
| **Contaminated Land** | REDIRECT | REDIRECT | REDIRECT | REDIRECT | REDIRECT | REDIRECT | REDIRECT |

Key: **FULL** = data loaded and queryable | **PARTIAL** = incomplete data | **MISSING** = no data | **LIVE API** = queried at runtime, not stored | **REDIRECT** = no data, returns external link only

---

## Gaps & Limitations

### Critical

1. **Brisbane zone rules incomplete.** Only 12 zone rules are seeded for Brisbane, but the geometry table contains many more distinct zone codes (Low Density Residential, Medium Density Residential, Character Residential, Mixed Use, etc.). Any Brisbane address in an unseeded zone returns a 404 `ZONE_NOT_SEEDED` error — this is the most likely source of lookup failures for Brisbane addresses.

2. **Flood data is Brisbane-only.** Flood overlays cover only Brisbane (BCC City Plan 2014 data). Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, and Redland all have significant flood-prone areas with no data coverage. The statewide QFAO/QRA flood dataset was scoped as Sprint 16 but not yet executed.

3. **School catchments are Brisbane-only.** The import was filtered to the Brisbane bounding box. Addresses in Gold Coast, Moreton Bay, and other councils will always return an empty schools array.

4. **Character overlay is Brisbane-only.** No other council has character overlay data loaded.

5. **Local heritage is Brisbane-only.** State heritage applies statewide but local heritage designations (often more granular and property-relevant) are only loaded for Brisbane.

### Significant

6. **Acid sulfate soils not in main lookup.** The `/api/check-acid-sulfate` endpoint exists as a standalone route but is not called from `/api/lookup` — the primary response has no acid sulfate field.

7. **Contaminated land has no data.** Only returns a redirect URL; no programmatic check is possible with free public APIs.

8. **No overlay timestamps.** None of the overlay tables store a `loaded_at` or `source_date` column. There is no way to determine when data was last refreshed or whether it is current.

9. **Lockyer Valley, Noosa, Scenic Rim, Somerset are half-supported.** These LGAs have bushfire overlay data but no zone geometries or rules. A lookup for an address in Noosa will fail at zone detection (`OUTSIDE_COVERAGE`) despite having bushfire data in the DB.

10. **Noise overlay column naming mismatch risk.** The `noise_overlays` table uses `geom` as the geometry column name while all other overlay tables use `geometry`. The RPC function `get_noise_for_point` must reference `geom` explicitly — if it was written against `geometry` the query would silently fail.

11. **Gold Coast noise data provenance unknown.** The `noise_overlays` table contains 5 GOLD_COAST contour polygons (N20–N40), but the original load script (`load-noise.js`) targeted BCC's City Plan 2014 ArcGIS endpoint. The source of the Gold Coast data is undocumented.

12. **api_usage has 0 rows.** Either authenticated API key usage logging is not wired into the lookup route, or no authenticated requests have been made. This means there is no usage telemetry.

### Minor

13. **School `suburb` column always null.** The field exists in the schema but was never populated during import.

14. **Brisbane overland flow capped at 2,000 features.** ArcGIS pagination was limited to 2,000 records for the overland flow layer — there may be more features in the source that were not imported.

15. **Nominatim is a single point of failure for geocoding.** No fallback geocoder is configured. Nominatim downtime or rate-limiting would break all lookups.

16. **No council coverage check beyond bounding box.** The `OUTSIDE_COVERAGE` error is triggered by a bounding box or distance check, not a polygon boundary check — addresses near council borders may be misclassified.
