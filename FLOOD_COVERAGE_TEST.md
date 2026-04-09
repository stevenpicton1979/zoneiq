# Brisbane Flood Coverage Test — 2026-04-09

**API under test:** `https://zoneiq-sigma.vercel.app/api/lookup`
**Test scope:** 20 Brisbane addresses — inner/middle/outer ring, known flood and known safe properties
**Pass criteria:** API returns HTTP 200 with `overlays.flood` field present (result can be flood or no-flood — both are valid)

---

## Results

| # | Address | Lat, Lng | Flood Result | Status | Notes |
|---|---------|----------|-------------|--------|-------|
| 1 | 15 Haig Street, Chelmer QLD 4068 | N/A | ERROR: API error: ADDRESS_NOT_FOUND | FAIL | known flood |
| 2 | 42 Graceville Avenue, Graceville QLD 4075 | -27.52181, 152.98214 | no overlay | PASS | known flood |
| 3 | 8 Fairfield Road, Yeronga QLD 4104 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | known flood |
| 4 | 12 Tennyson Road, Tennyson QLD 4105 | -33.52669, 150.74384 | no overlay | PASS | known flood |
| 5 | 25 Oxley Road, Rocklea QLD 4106 | N/A | ERROR: API error: ADDRESS_NOT_FOUND | FAIL | known flood |
| 6 | 5 Given Terrace, Paddington QLD 4064 | -27.46173, 153.00603 | no overlay | PASS | known safe - elevated |
| 7 | 18 Baroona Road, Rosalie QLD 4064 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | known safe - elevated |
| 8 | 30 Latrobe Terrace, Paddington QLD 4064 | -27.45957, 153.00147 | no overlay | PASS | known safe |
| 9 | 10 Ashgrove Avenue, Ashgrove QLD 4060 | -27.44518, 152.99389 | no overlay | PASS | typically safe - elevated |
| 10 | 55 Waterworks Road, Ashgrove QLD 4060 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | mixed - no strong expectation |
| 11 | 22 Norman Avenue, Norman Park QLD 4170 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | middle ring |
| 12 | 8 Wynnum Road, Norman Park QLD 4170 | -27.47597, 153.05067 | FLOOD — brisbane_river / low / FHA_R5 | PASS | near river - flood risk |
| 13 | 15 Lambton Street, Annerley QLD 4103 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | middle ring |
| 14 | 40 Ipswich Road, Annerley QLD 4103 | -27.52249, 153.02515 | no overlay | PASS | flood prone area |
| 15 | 100 Newmarket Road, Newmarket QLD 4051 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | outer ring |
| 16 | 5 Beckett Road, Bridgeman Downs QLD 4035 | -27.36884, 152.99078 | no overlay | PASS | outer ring - safe |
| 17 | 20 Whites Road, Manly West QLD 4179 | -27.46302, 153.18030 | no overlay | PASS | outer east |
| 18 | 8 Riding Road, Hawthorne QLD 4171 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | riverside - flood risk |
| 19 | 30 Oxlade Drive, New Farm QLD 4005 | N/A | ERROR: API error: ZONE_NOT_SEEDED | FAIL | inner - flood risk |
| 20 | 15 Abbott Street, Ascot QLD 4007 | -27.43256, 153.05833 | no overlay | PASS | inner north - mixed |

---

## Summary

| Metric | Value |
|--------|-------|
| Total addresses tested | 20 |
| Passed (valid API response) | 10 |
| Failed (API error / missing field) | 10 |
| **Pass rate** | **50%** |
| Flood overlay detected | 1 |
| No flood (valid green result) | 9 |
| Known-flood addresses tested | 9 |
| Known-flood addresses detected | 1 |
| Likely false negatives (expected flood, got none) | 3 |

---

## Failures

- **#1** 15 Haig Street, Chelmer QLD 4068: API error: ADDRESS_NOT_FOUND
- **#3** 8 Fairfield Road, Yeronga QLD 4104: API error: ZONE_NOT_SEEDED
- **#5** 25 Oxley Road, Rocklea QLD 4106: API error: ADDRESS_NOT_FOUND
- **#7** 18 Baroona Road, Rosalie QLD 4064: API error: ZONE_NOT_SEEDED
- **#10** 55 Waterworks Road, Ashgrove QLD 4060: API error: ZONE_NOT_SEEDED
- **#11** 22 Norman Avenue, Norman Park QLD 4170: API error: ZONE_NOT_SEEDED
- **#13** 15 Lambton Street, Annerley QLD 4103: API error: ZONE_NOT_SEEDED
- **#15** 100 Newmarket Road, Newmarket QLD 4051: API error: ZONE_NOT_SEEDED
- **#18** 8 Riding Road, Hawthorne QLD 4171: API error: ZONE_NOT_SEEDED
- **#19** 30 Oxlade Drive, New Farm QLD 4005: API error: ZONE_NOT_SEEDED

---

## Likely False Negatives (known-flood, returned no overlay)

- **#2** 42 Graceville Avenue, Graceville QLD 4075: returned no-flood (expected flood)
- **#4** 12 Tennyson Road, Tennyson QLD 4105: returned no-flood (expected flood)
- **#14** 40 Ipswich Road, Annerley QLD 4103: returned no-flood (expected flood)

---

## Flood Detections

- **#12** 8 Wynnum Road, Norman Park QLD 4170: brisbane_river, low, category: `FHA_R5`

---

## GO / NO-GO Recommendation for ClearOffer

### Recommendation: NO-GO

Only 10/20 addresses returned valid results (50%). Too many API errors or missing flood fields for ClearOffer to rely on.

### Caveats
- Flood data covers **Brisbane only**. Gold Coast, Moreton Bay, Sunshine Coast, Ipswich, Logan, and Redland have **zero flood overlay data** in ZoneIQ.
- For non-Brisbane addresses, ClearOffer must either suppress the flood field or display "flood data not available for this council".
- The BCC flood overlay is based on City Plan 2014 modelling — it reflects planning overlays, not latest hydraulic flood modelling. It may differ from post-2011 flood maps.
- Overland flow data was imported with an ArcGIS cap of 2,000 features — some overland flow areas near Brisbane edges may be missing.
- BCC source has known gap near Rocklea (see SubdivideIQ notes): Point A (-27.531, 153.018) returns no flood polygon despite being near FHA_R5 boundary. This is an upstream BCC data gap, not a ZoneIQ bug.

### What ClearOffer should display
- **Brisbane addresses:** Show flood overlay type + risk level with BCC City Plan 2014 disclaimer
- **All other councils:** "Flood overlay data not available for this council — check council flood map directly"
- **No overlay:** "Not within a flood overlay area (Brisbane City Plan 2014)" — always show this explicitly, not just silence
