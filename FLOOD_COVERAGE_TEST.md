# ZoneIQ Comprehensive Brisbane Flood + ANEF Coverage Test — 8 April 2026

**API under test:** `https://zoneiq-sigma.vercel.app/api/lookup`  
**Test scope:** 30 Brisbane addresses — flood-known (10), middle-ring (10), outer (10)  
**ANEF subset:** 15 addresses near Archerfield and BNE flight corridors  
**Method:** Live API hit for all 30 + direct Supabase spatial query for flood and ANEF where API fails

---

## Pass/Fail Criteria

| Classification | Meaning | Counts as |
|---|---|---|
| VALID_HIT | API returned a flood overlay code (FPA) | PASS |
| VALID_MISS | API confirmed no overlay — address not in flood zone | PASS |
| FAIL:ZONE_NOT_SEEDED | Zone found in DB but no rules seeded — API exits before returning overlays | FAIL |
| FAIL:GEOCODE_FAIL | Nominatim could not geocode the address | FAIL |
| FAIL:WRONG_STATE | Nominatim returned a location in another state | FAIL |

---

## Full Results Table

| # | Address | Lat, Lng | Zone | API Result | Flood | ANEF | DB Direct† |
|---|---------|---------|------|-----------|-------|------|-----------|
| 1 | 15 Haig Street, Chelmer QLD 4068 | N/A | — | GEOCODE_FAIL | FAIL | N/A | — |
| 2 | 42 Graceville Avenue, Graceville QLD 4075 | -27.52181, 152.98214 | CR | 200 OK | VALID_MISS | MISS | NO FLOOD |
| 3 | 8 Fairfield Road, Yeronga QLD 4104 | -27.51365, 153.02015 | SP | ZONE_NOT_SEEDED | FAIL | FAIL | **FLOOD brisbane_river/high/FHA_R2A** |
| 4 | 25 Oxley Road, Rocklea QLD 4106 | N/A | — | GEOCODE_FAIL | FAIL | N/A | — |
| 5 | 18 Montague Road, West End QLD 4101 | -27.47618, 153.00887 | MU | ZONE_NOT_SEEDED | FAIL | FAIL | **FLOOD brisbane_river/medium/FHA_R3** |
| 6 | 5 Rialto Street, Fairfield QLD 4103 | N/A | — | GEOCODE_FAIL | FAIL | N/A | — |
| 7 | 30 Yeronga Street, Yeronga QLD 4104 | -27.51885, 153.01422 | LMR | ZONE_NOT_SEEDED | FAIL | FAIL | NO FLOOD |
| 8 | 12 Tennyson Road, Tennyson QLD 4105 | -33.52669, 150.74384 | — | WRONG STATE (NSW) | FAIL | FAIL | — |
| 9 | 8 Riding Road, Hawthorne QLD 4171 | -27.46965, 153.06362 | LMR | ZONE_NOT_SEEDED | FAIL | N/A | NO FLOOD |
| 10 | 30 Oxlade Drive, New Farm QLD 4005 | -27.47268, 153.05051 | LMR | ZONE_NOT_SEEDED | FAIL | FAIL | **FLOOD brisbane_river/low/FHA_R5** |
| 11 | 22 Norman Avenue, Norman Park QLD 4170 | -27.47490, 153.05490 | LMR | ZONE_NOT_SEEDED | FAIL | FAIL | NO FLOOD |
| 12 | 15 Lambton Street, Annerley QLD 4103 | -27.51347, 153.03301 | LMR | ZONE_NOT_SEEDED | FAIL | N/A | NO FLOOD |
| 13 | 8 Cavendish Road, Coorparoo QLD 4151 | -27.48899, 153.05558 | SP | ZONE_NOT_SEEDED | FAIL | N/A | — |
| 14 | 25 Wecker Road, Carindale QLD 4152 | -27.53566, 153.11551 | SP | ZONE_NOT_SEEDED | FAIL | N/A | — |
| 15 | 10 Mains Road, Tarragindi QLD 4121 | N/A | — | GEOCODE_FAIL | FAIL | N/A | — |
| 16 | 33 Ipswich Road, Annerley QLD 4103 | -27.52249, 153.02515 | CR | 200 OK | VALID_MISS | N/A | NO FLOOD |
| 17 | 5 Whites Road, Manly West QLD 4179 | -27.46302, 153.18030 | LDR | 200 OK | VALID_MISS | N/A | — |
| 18 | 20 Kessels Road, Coopers Plains QLD 4108 | -27.55802, 153.04512 | CF | ZONE_NOT_SEEDED | FAIL | FAIL | NO FLOOD |
| 19 | 15 Garden City Drive, Upper Mt Gravatt QLD 4122 | N/A | — | GEOCODE_FAIL | FAIL | N/A | — |
| 20 | 40 Boundary Road, Coopers Plains QLD 4108 | -27.56949, 153.03197 | IN | ZONE_NOT_SEEDED | FAIL | FAIL | NO FLOOD |
| 21 | 5 Beckett Road, Bridgeman Downs QLD 4035 | -27.36475, 152.99170 | LDR | 200 OK | VALID_MISS | N/A | — |
| 22 | 100 Newmarket Road, Newmarket QLD 4051 | -27.43627, 153.00905 | LMR | ZONE_NOT_SEEDED | FAIL | N/A | NO FLOOD |
| 23 | 15 Calamvale Drive, Calamvale QLD 4116 | N/A | — | GEOCODE_FAIL | FAIL | FAIL | — |
| 24 | 30 Beenleigh Road, Sunnybank QLD 4109 | -27.58683, 153.05890 | CF | ZONE_NOT_SEEDED | FAIL | FAIL | NO FLOOD |
| 25 | 8 Albany Creek Road, Aspley QLD 4034 | -27.36342, 153.01259 | DC | 200 OK | VALID_MISS | N/A | — |
| 26 | 20 Gympie Road, Aspley QLD 4034 | -27.35613, 153.01656 | SR | ZONE_NOT_SEEDED | FAIL | N/A | — |
| 27 | 12 Beaudesert Road, Sunnybank Hills QLD 4109 | -27.60892, 153.04898 | LDR | 200 OK | VALID_MISS | MISS | — |
| 28 | 5 Draper Road, Calamvale QLD 4116 | N/A | — | GEOCODE_FAIL | FAIL | FAIL | — |
| 29 | 45 Robinson Road, Aspley QLD 4034 | -27.36391, 153.01623 | DC | 200 OK | VALID_MISS | N/A | — |
| 30 | 10 Padstow Road, Eight Mile Plains QLD 4113 | -27.57441, 153.08197 | LDR | 200 OK | VALID_MISS | N/A | NO FLOOD |

† DB Direct = result of `ST_Contains` query against `flood_overlays` table run directly via Supabase, bypassing zone rules gate. Confirms whether flood data actually exists at this coordinate regardless of API delivery failure.

---

## Summary Statistics

### Flood Coverage — Live API

| Metric | Count | Rate |
|--------|-------|------|
| Total addresses tested | 30 | — |
| **Live API PASS** (VALID_HIT + VALID_MISS) | **9** | **30%** |
| FAIL: ZONE_NOT_SEEDED | 14 | 47% |
| FAIL: GEOCODE_FAIL (inc. wrong-state #8) | 7 | 23% |
| Flood VALID_HIT (overlay code returned by API) | **0** | **0%** |
| Flood VALID_MISS (confirmed no overlay) | 9 | 30% |

### Flood-Known Suburb Analysis (Addresses 1–10)

| Metric | Count |
|--------|-------|
| Flood-known addresses tested | 10 |
| Live API VALID_HIT (flood code returned) | **0** |
| Live API VALID_MISS | 1 (#2 Graceville) |
| Flood data confirmed in DB but blocked | **3** (#3 high/FHA_R2A, #5 medium/FHA_R3, #10 low/FHA_R5) |
| Geocode failures in flood-known group | 4 (#1, #4, #6, #8 wrong-state) |
| ZONE_NOT_SEEDED in flood-known group | 5 (#3, #5, #7, #9, #10) |

### ANEF Coverage — Live API (15-address subset)

| Metric | Count |
|--------|-------|
| ANEF subset addresses | 15 |
| Valid ANEF API responses | 2 (#2 MISS, #27 MISS) |
| **ANEF HIT (contour returned)** | **0** |
| Blocked by ZONE_NOT_SEEDED | 9 |
| Geocode failures | 4 |
| Nearest Archerfield addresses (#18, #20 — Coopers Plains) | Both ZONE_NOT_SEEDED |

---

## Root Cause Breakdown

### Cause 1: ZONE_NOT_SEEDED — 14/30 failures (47%) — primary blocker

`route.ts` exits at line 122 with a 404 when zone rules are not found, discarding all overlay data already fetched (lines 86–94 run flood, noise, character, schools, bushfire, heritage in parallel — all discarded on zone rules miss).

**Unseeded zone codes blocking overlay delivery:**

| Zone code | Description | Addresses blocked |
|---|---|---|
| LMR | Low-Medium Density Residential | #7, #9, #10, #11, #12, #22 — 6 |
| SP | Special Purpose | #3, #13, #14 — 3 |
| CF | Community Facilities | #18, #24 — 2 |
| MU | Mixed Use | #5 — 1 |
| IN | Industry | #20 — 1 |
| SR | Sport & Recreation | #26 — 1 |

LMR alone covers a massive proportion of Brisbane's inner and middle-ring residential stock (New Farm, Newmarket, Annerley, Norman Park, Hawthorne, Yeronga and dozens more). This is not a fringe zone — it is one of the most common zone codes in inner Brisbane.

**Critical finding from direct DB query:** Flood data exists and is correct for 3 blocked addresses: Fairfield Rd Yeronga (high/FHA_R2A), West End (medium/FHA_R3), New Farm (low/FHA_R5). The spatial data is accurate — the API just won't return it.

### Cause 2: Geocoding Failures — 7/30 failures (23%)

| # | Address | Issue |
|---|---|---|
| 1 | 15 Haig Street, Chelmer | Street not in Nominatim |
| 4 | 25 Oxley Road, Rocklea | Street not in Nominatim |
| 6 | 5 Rialto Street, Fairfield | Street not in Nominatim |
| 8 | 12 Tennyson Road, Tennyson QLD | **Geocoded to Tennyson NSW** — wrong state, silent failure |
| 15 | 10 Mains Road, Tarragindi | Street not in Nominatim |
| 19 | 15 Garden City Drive, Upper Mt Gravatt | Street not in Nominatim |
| 23 | 15 Calamvale Drive, Calamvale | Street not in Nominatim |
| 28 | 5 Draper Road, Calamvale | Street not in Nominatim |

Address #8 is a critical silent bug. Nominatim returned `lat=-33.53, lng=150.74` (Tennyson, Hawkesbury, NSW) for "12 Tennyson Road, Tennyson QLD 4105". The API returned HTTP 200 with `zone=Unzoned, flood=false` — a plausible-looking but entirely wrong result. There is currently no bounding box guard on geocode results.

---

## GO / NO-GO Recommendations

### Flood Data — NO-GO (current state)

**Live API pass rate: 30%. Flood-known detection rate: 0/10. Flood VALID_HITs: 0.**

The flood overlay data in Supabase is correct and present for known flood areas. The failure is entirely in API delivery. Two specific fixes would likely push the pass rate above 85%:

1. **Seed LMR, SP, MU, CF, IN, SR zone rules** — unblocks 14/30 failures immediately
2. **Decouple overlays from zone rules gate** — return overlay data even when `zone_rules` not seeded; makes the API useful to ClearOffer regardless of rule completeness

Neither fix requires new data. Both are code-only changes.

### ANEF Data — NO-GO (cannot assess)

**ANEF hit rate: 0/15.** Every address near Archerfield that would plausibly be inside an ANEF contour (Coopers Plains IDs 18, 20) failed with ZONE_NOT_SEEDED. No valid ANEF response was returned from the suburb cluster most likely to show hits. Cannot confirm or deny ANEF data quality until zone rules are fixed.

---

## Recommended Fixes (Priority Order)

### Fix 1 — Seed LMR, SP, MU, CF, IN, SR zone rules for Brisbane

Unblocks 14/30 (47%) of this test's failures. LMR is the single highest-impact addition — covers New Farm, Newmarket, Norman Park, Hawthorne, Annerley, Yeronga and most inner-ring Brisbane.

### Fix 2 — Decouple overlay delivery from zone rules gate (route.ts)

Change the ZONE_NOT_SEEDED block (lines 122–133) from returning a 404 to returning a partial 200 response:

```ts
// Instead of returning 404, return overlays with rules: null
if (dbError || !rules) {
  return Response.json({
    success: true,
    query: { address_input: addressInput, address_resolved, lat, lng },
    zone: { code: zoneCode, name: null, category: null, council },
    rules: null,
    overlays: {
      flood: floodData,
      character: characterData,
      schools: schoolsData,
      bushfire: bushfireData,
      heritage: heritageData,
      noise: noiseData,
    },
    meta: { ... }
  }, { status: 200, headers: CORS_HEADERS })
}
```

This is the correct architectural move for ClearOffer — it needs flood and noise data independently of planning rules.

### Fix 3 — Add SEQ bounding box guard to geocoding

In `lib/geocode.ts`, after receiving a Nominatim result, validate it is within the SEQ bounding box before returning:

```ts
// SEQ bounding box: roughly lat -30 to -24, lng 150 to 155
if (lat < -30 || lat > -24 || lng < 150 || lng > 155) {
  return null // Reject — not in SEQ
}
```

Prevents silent wrong-state geocoding (Tennyson QLD → Tennyson NSW).

### Fix 4 — Geocoding fallback for unresolved addresses

Nominatim fails on ~20% of suburban Brisbane addresses. Options:
- Retry with suburb+state only when street-level fails (broader match)  
- Add QSCF (QLD cadastral parcel API) as geocoding fallback
- Append "Queensland Australia" explicitly to the query

---

## Fallback Recommendation for ClearOffer (if ZoneIQ not fixed in time)

BCC publishes the City Plan 2014 flood overlay as a live ArcGIS FeatureServer that can be queried server-side:

```
GET https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/
    City_Plan_2014_Flood_Overlay/FeatureServer/0/query
    ?geometry=<lng>,<lat>
    &geometryType=esriGeometryPoint
    &spatialRel=esriSpatialRelIntersects
    &outFields=OVL2_CAT,OVL2_DESC
    &f=json
```

Returns the same FHA codes (FHA_R2A, FHA_R3, FHA_R5 etc.) as ZoneIQ stores. No zone rules dependency. Same Brisbane-only limitation. Suitable as a short-term ClearOffer fallback — but do not call from the browser (CORS); always call server-side.
