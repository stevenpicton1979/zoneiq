const API_BASE = 'https://zoneiq-sigma.vercel.app'

const addresses = [
  { id: 1,  address: '15 Haig Street, Chelmer QLD 4068',          expectFlood: true,  note: 'known flood' },
  { id: 2,  address: '42 Graceville Avenue, Graceville QLD 4075', expectFlood: true,  note: 'known flood' },
  { id: 3,  address: '8 Fairfield Road, Yeronga QLD 4104',        expectFlood: true,  note: 'known flood' },
  { id: 4,  address: '12 Tennyson Road, Tennyson QLD 4105',       expectFlood: true,  note: 'known flood' },
  { id: 5,  address: '25 Oxley Road, Rocklea QLD 4106',           expectFlood: true,  note: 'known flood' },
  { id: 6,  address: '5 Given Terrace, Paddington QLD 4064',      expectFlood: false, note: 'known safe - elevated' },
  { id: 7,  address: '18 Baroona Road, Rosalie QLD 4064',         expectFlood: false, note: 'known safe - elevated' },
  { id: 8,  address: '30 Latrobe Terrace, Paddington QLD 4064',   expectFlood: false, note: 'known safe' },
  { id: 9,  address: '10 Ashgrove Avenue, Ashgrove QLD 4060',     expectFlood: false, note: 'typically safe - elevated' },
  { id: 10, address: '55 Waterworks Road, Ashgrove QLD 4060',     expectFlood: null,  note: 'mixed - no strong expectation' },
  { id: 11, address: '22 Norman Avenue, Norman Park QLD 4170',    expectFlood: null,  note: 'middle ring' },
  { id: 12, address: '8 Wynnum Road, Norman Park QLD 4170',       expectFlood: true,  note: 'near river - flood risk' },
  { id: 13, address: '15 Lambton Street, Annerley QLD 4103',      expectFlood: null,  note: 'middle ring' },
  { id: 14, address: '40 Ipswich Road, Annerley QLD 4103',        expectFlood: true,  note: 'flood prone area' },
  { id: 15, address: '100 Newmarket Road, Newmarket QLD 4051',    expectFlood: null,  note: 'outer ring' },
  { id: 16, address: '5 Beckett Road, Bridgeman Downs QLD 4035',  expectFlood: false, note: 'outer ring - safe' },
  { id: 17, address: '20 Whites Road, Manly West QLD 4179',       expectFlood: null,  note: 'outer east' },
  { id: 18, address: '8 Riding Road, Hawthorne QLD 4171',         expectFlood: true,  note: 'riverside - flood risk' },
  { id: 19, address: '30 Oxlade Drive, New Farm QLD 4005',        expectFlood: true,  note: 'inner - flood risk' },
  { id: 20, address: '15 Abbott Street, Ascot QLD 4007',          expectFlood: null,  note: 'inner north - mixed' },
]

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function testAddress(entry) {
  const url = `${API_BASE}/api/lookup?address=${encodeURIComponent(entry.address)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ZoneIQ-FloodTest/1.0' }
    })
    const body = await res.json()

    if (!body.success) {
      return {
        ...entry,
        status: 'API_ERROR',
        http_status: res.status,
        error_code: body.error || null,
        error_msg: body.message || null,
        lat: null,
        lng: null,
        zone_code: null,
        has_flood: null,
        overlay_type: null,
        flood_category: null,
        risk_level: null,
        pass: false,
        fail_reason: `API error: ${body.error || res.status}`,
      }
    }

    const flood = body.overlays?.flood
    const hasFloodField = flood !== undefined && flood !== null

    if (!hasFloodField) {
      return {
        ...entry,
        status: 'MISSING_FLOOD_FIELD',
        http_status: res.status,
        error_code: null,
        error_msg: null,
        lat: body.query?.lat ?? null,
        lng: body.query?.lng ?? null,
        zone_code: body.zone?.code ?? body.zone?.name ?? null,
        has_flood: null,
        overlay_type: null,
        flood_category: null,
        risk_level: null,
        pass: false,
        fail_reason: 'overlays.flood field missing from response',
      }
    }

    return {
      ...entry,
      status: 'OK',
      http_status: res.status,
      error_code: null,
      error_msg: null,
      lat: body.query?.lat ?? null,
      lng: body.query?.lng ?? null,
      zone_code: body.zone?.code ?? body.zone?.name ?? null,
      has_flood: flood.has_flood_overlay,
      overlay_type: flood.overlay_type ?? null,
      flood_category: flood.flood_category ?? null,
      risk_level: flood.risk_level ?? null,
      pass: true,
      fail_reason: null,
    }
  } catch (err) {
    return {
      ...entry,
      status: 'FETCH_ERROR',
      http_status: null,
      error_code: null,
      error_msg: err.message,
      lat: null,
      lng: null,
      zone_code: null,
      has_flood: null,
      overlay_type: null,
      flood_category: null,
      risk_level: null,
      pass: false,
      fail_reason: `Fetch error: ${err.message}`,
    }
  }
}

async function main() {
  console.log(`Running flood coverage test against ${API_BASE}`)
  console.log(`Testing ${addresses.length} addresses...\n`)

  const results = []
  for (const entry of addresses) {
    process.stdout.write(`[${entry.id.toString().padStart(2)}] ${entry.address.padEnd(55)} `)
    const result = await testAddress(entry)
    results.push(result)

    if (!result.pass) {
      console.log(`FAIL — ${result.fail_reason}`)
    } else if (result.has_flood) {
      console.log(`PASS — FLOOD (${result.overlay_type}, ${result.risk_level}, cat: ${result.flood_category})`)
    } else {
      console.log(`PASS — NO FLOOD (${result.zone_code})`)
    }
    // Respectful delay between requests
    await sleep(600)
  }

  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  const passRate = ((passed / results.length) * 100).toFixed(0)

  const floodDetected = results.filter(r => r.pass && r.has_flood)
  const noFlood = results.filter(r => r.pass && r.has_flood === false)
  const knownFloodAddresses = results.filter(r => r.expectFlood === true)
  const knownFloodDetected = knownFloodAddresses.filter(r => r.pass && r.has_flood)
  const falseNegatives = knownFloodAddresses.filter(r => r.pass && r.has_flood === false)

  console.log(`\n--- SUMMARY ---`)
  console.log(`Total: ${results.length} | Pass: ${passed} | Fail: ${failed} | Pass rate: ${passRate}%`)
  console.log(`Flood detected: ${floodDetected.length} | No flood: ${noFlood.length}`)
  console.log(`Known-flood addresses: ${knownFloodAddresses.length} | Detected: ${knownFloodDetected.length} | Missed: ${falseNegatives.length}`)

  // Build markdown report
  const now = new Date().toISOString().split('T')[0]
  const rows = results.map(r => {
    const latLng = r.lat !== null ? `${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)}` : 'N/A'
    const floodResult = !r.pass
      ? `ERROR: ${r.fail_reason}`
      : r.has_flood
        ? `FLOOD — ${r.overlay_type ?? ''} / ${r.risk_level ?? ''} / ${r.flood_category ?? ''}`
        : `no overlay`
    const status = !r.pass ? 'FAIL' : 'PASS'
    return `| ${r.id} | ${r.address} | ${latLng} | ${floodResult} | ${status} | ${r.note} |`
  }).join('\n')

  const failRows = results.filter(r => !r.pass).map(r =>
    `- **#${r.id}** ${r.address}: ${r.fail_reason}`
  ).join('\n') || '(none)'

  const falseNegRows = falseNegatives.map(r =>
    `- **#${r.id}** ${r.address}: returned no-flood (expected flood)`
  ).join('\n') || '(none)'

  const floodRows = floodDetected.map(r =>
    `- **#${r.id}** ${r.address}: ${r.overlay_type}, ${r.risk_level}, category: \`${r.flood_category}\``
  ).join('\n') || '(none)'

  // GO / NO-GO logic
  let recommendation, rationale
  if (passed < 16) {
    recommendation = 'NO-GO'
    rationale = `Only ${passed}/20 addresses returned valid results (${passRate}%). Too many API errors or missing flood fields for ClearOffer to rely on.`
  } else if (knownFloodDetected.length < Math.ceil(knownFloodAddresses.length * 0.7)) {
    recommendation = 'NO-GO'
    rationale = `API calls succeed but only ${knownFloodDetected.length}/${knownFloodAddresses.length} known-flood addresses returned a flood overlay. False-negative rate too high for ClearOffer use.`
  } else if (passed >= 18 && knownFloodDetected.length >= Math.ceil(knownFloodAddresses.length * 0.7)) {
    recommendation = 'GO (Brisbane only)'
    rationale = `${passRate}% of lookups returned valid flood data. ${knownFloodDetected.length}/${knownFloodAddresses.length} known-flood addresses detected. Suitable for Brisbane addresses in ClearOffer — clearly caveat no-data for Gold Coast / other councils.`
  } else {
    recommendation = 'CONDITIONAL GO'
    rationale = `${passRate}% pass rate with ${knownFloodDetected.length}/${knownFloodAddresses.length} known-flood addresses detected. Usable with caveats — display data for Brisbane only and show a prominent disclaimer.`
  }

  const md = `# Brisbane Flood Coverage Test — ${now}

**API under test:** \`${API_BASE}/api/lookup\`
**Test scope:** 20 Brisbane addresses — inner/middle/outer ring, known flood and known safe properties
**Pass criteria:** API returns HTTP 200 with \`overlays.flood\` field present (result can be flood or no-flood — both are valid)

---

## Results

| # | Address | Lat, Lng | Flood Result | Status | Notes |
|---|---------|----------|-------------|--------|-------|
${rows}

---

## Summary

| Metric | Value |
|--------|-------|
| Total addresses tested | ${results.length} |
| Passed (valid API response) | ${passed} |
| Failed (API error / missing field) | ${failed} |
| **Pass rate** | **${passRate}%** |
| Flood overlay detected | ${floodDetected.length} |
| No flood (valid green result) | ${noFlood.length} |
| Known-flood addresses tested | ${knownFloodAddresses.length} |
| Known-flood addresses detected | ${knownFloodDetected.length} |
| Likely false negatives (expected flood, got none) | ${falseNegatives.length} |

---

## Failures

${failRows}

---

## Likely False Negatives (known-flood, returned no overlay)

${falseNegRows}

---

## Flood Detections

${floodRows}

---

## GO / NO-GO Recommendation for ClearOffer

### Recommendation: ${recommendation}

${rationale}

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
`

  const mdPath = `${process.cwd()}/FLOOD_COVERAGE_TEST.md`
  const fs = require('fs')
  fs.writeFileSync(mdPath, md, 'utf8')
  console.log(`\nReport written to FLOOD_COVERAGE_TEST.md`)
  console.log(`\nRecommendation: ${recommendation}`)
  console.log(`Rationale: ${rationale}`)
}

main().catch(e => { console.error(e); process.exit(1) })
