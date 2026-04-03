# ZoneIQ — City Plan PDF Extraction Prompt

Use this prompt when feeding Brisbane City Plan 2014 zone code PDFs to Claude.
Run this for each zone to verify or expand the seed data in zone-rules-seed.json.

---

## Where to get the PDFs

Brisbane City Plan 2014 is online at:
https://cityplan.brisbane.qld.gov.au

Navigate to: Planning scheme → Part 4 (Local plans) or Part 3 (Zone codes)

Each zone has its own section. You can print/save as PDF or copy the text directly.

Key sections to extract from:
- Part 3 — Zone codes (all residential, commercial, industrial zones)
- Schedule 1 — Definitions (use definitions)
- Part 2 — State planning framework (height overlays, flood overlays)

---

## Extraction Prompt

Paste this into Claude along with the PDF content or copied text:

---

You are extracting structured development rules from Brisbane City Plan 2014 
for the purpose of building a planning zone API. 

Extract the following information for the zone described in this document.
Return ONLY a JSON object. No preamble, no explanation, no markdown fences.

The JSON must match this exact schema:

{
  "zone_code": string,           // e.g. "LDR", "LMDR", "CR"
  "zone_name": string,           // full name e.g. "Low Density Residential"
  "zone_category": string,       // "residential" | "commercial" | "industrial" | "mixed" | "open_space" | "special"
  "max_height_m": number | null, // maximum building height in metres, null if not specified
  "max_storeys": number | null,  // maximum number of storeys, null if not specified
  "max_site_coverage_pct": number | null,  // % of lot that can be covered by buildings
  "min_permeability_pct": number | null,   // minimum % of lot that must remain permeable
  "front_setback_m": number | null,
  "side_setback_m": number | null,
  "rear_setback_m": number | null,
  "secondary_dwelling_permitted": "yes" | "permit_required" | "no",
  "short_term_accom_permitted": "yes" | "permit_required" | "no",
  "home_business_permitted": "yes" | "permit_required" | "no",
  "subdivision_min_lot_size_m2": number | null,
  "key_rules": string[],         // 5-8 plain-English rules, specific to this zone
  "permitted_uses": string[],    // uses that don't need a permit
  "requires_permit_uses": string[], // uses that need a development permit
  "prohibited_uses": string[],   // uses that are not allowed
  "notes": string | null         // any important caveats or conditions
}

Rules for extraction:
- Be specific. "9.5m or 2 storeys" → max_height_m: 9.5, max_storeys: 2
- If a rule says "subject to neighbourhood plan" put null and note it
- key_rules should be plain English that a homeowner can understand
- For setbacks: use the general/default value, not the maximum possible
- If the document doesn't specify a value, use null — do not guess
- For permitted_uses/requires_permit_uses: use the exact use definitions 
  from the City Plan where possible

Document to extract from:
[PASTE ZONE DOCUMENT TEXT HERE]

---

## After extraction

1. Compare the extracted JSON against the seed values in /data/zone-rules-seed.json
2. Update any values that differ (the PDF is the source of truth)
3. Run: npx ts-node scripts/seed-rules.ts to re-seed the database
4. Test the API against a known address in that zone to verify

---

## Overlay extraction (Sprint 1 — do this after Sprint 0 works)

The most important overlays to add next:

1. **Flood overlay** — affects what can be built and at what floor height
   Document: Part 9, Division 9.4 — Flood and coastal hazard overlay code
   
2. **Character overlay (Dwelling house character)**
   Document: Part 9, Division 9.3 — Dwelling house character overlay code
   Affects: ~30,000 properties in inner Brisbane suburbs

3. **Heritage overlay**
   Document: Part 9, Division 9.6 — Heritage overlay code
   Affects: individual lots listed as local heritage places

4. **Neighbourhood plans**
   These override zone rules in specific suburbs (e.g. Fortitude Valley, New Farm)
   These are the most complex — leave for Sprint 2

For each overlay, use the same extraction prompt structure above,
adapted to extract overlay-specific rules rather than zone-wide rules.
