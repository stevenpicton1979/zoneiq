// Phase 1: geocode + hit live API for all 30 addresses
// Saves geocoded coordinates and API results to flood-anef-results.json
// Phase 2 (Supabase direct query) is run separately via MCP

const fs = require('fs')
const path = require('path')

const API_BASE = 'https://zoneiq-sigma.vercel.app'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OUT_FILE = path.join(__dirname, '..', 'flood-anef-results.json')

const ANEF_SUBSET = new Set([1, 2, 3, 5, 6, 7, 8, 10, 11, 18, 20, 23, 24, 27, 28])

const addresses = [
  // FLOOD-KNOWN SUBURBS
  { id: 1,  address: '15 Haig Street, Chelmer QLD 4068',              group: 'flood-known', expectFlood: true },
  { id: 2,  address: '42 Graceville Avenue, Graceville QLD 4075',     group: 'flood-known', expectFlood: true },
  { id: 3,  address: '8 Fairfield Road, Yeronga QLD 4104',            group: 'flood-known', expectFlood: true },
  { id: 4,  address: '25 Oxley Road, Rocklea QLD 4106',               group: 'flood-known', expectFlood: true },
  { id: 5,  address: '18 Montague Road, West End QLD 4101',           group: 'flood-known', expectFlood: true },
  { id: 6,  address: '5 Rialto Street, Fairfield QLD 4103',           group: 'flood-known', expectFlood: true },
  { id: 7,  address: '30 Yeronga Street, Yeronga QLD 4104',           group: 'flood-known', expectFlood: true },
  { id: 8,  address: '12 Tennyson Road, Tennyson QLD 4105',           group: 'flood-known', expectFlood: true },
  { id: 9,  address: '8 Riding Road, Hawthorne QLD 4171',             group: 'flood-known', expectFlood: true },
  { id: 10, address: '30 Oxlade Drive, New Farm QLD 4005',            group: 'flood-known', expectFlood: true },
  // MIDDLE-RING SUBURBS
  { id: 11, address: '22 Norman Avenue, Norman Park QLD 4170',        group: 'middle-ring',  expectFlood: null },
  { id: 12, address: '15 Lambton Street, Annerley QLD 4103',          group: 'middle-ring',  expectFlood: null },
  { id: 13, address: '8 Cavendish Road, Coorparoo QLD 4151',          group: 'middle-ring',  expectFlood: null },
  { id: 14, address: '25 Wecker Road, Carindale QLD 4152',            group: 'middle-ring',  expectFlood: false },
  { id: 15, address: '10 Mains Road, Tarragindi QLD 4121',            group: 'middle-ring',  expectFlood: null },
  { id: 16, address: '33 Ipswich Road, Annerley QLD 4103',            group: 'middle-ring',  expectFlood: null },
  { id: 17, address: '5 Whites Road, Manly West QLD 4179',            group: 'middle-ring',  expectFlood: null },
  { id: 18, address: '20 Kessels Road, Coopers Plains QLD 4108',      group: 'middle-ring',  expectFlood: null },
  { id: 19, address: '15 Garden City Drive, Upper Mount Gravatt QLD 4122', group: 'middle-ring', expectFlood: false },
  { id: 20, address: '40 Boundary Road, Coopers Plains QLD 4108',     group: 'middle-ring',  expectFlood: null },
  // OUTER SUBURBS
  { id: 21, address: '5 Beckett Road, Bridgeman Downs QLD 4035',      group: 'outer',        expectFlood: false },
  { id: 22, address: '100 Newmarket Road, Newmarket QLD 4051',        group: 'outer',        expectFlood: null },
  { id: 23, address: '15 Calamvale Drive, Calamvale QLD 4116',        group: 'outer',        expectFlood: null },
  { id: 24, address: '30 Beenleigh Road, Sunnybank QLD 4109',         group: 'outer',        expectFlood: null },
  { id: 25, address: '8 Albany Creek Road, Aspley QLD 4034',          group: 'outer',        expectFlood: false },
  { id: 26, address: '20 Gympie Road, Aspley QLD 4034',               group: 'outer',        expectFlood: false },
  { id: 27, address: '12 Beaudesert Road, Sunnybank Hills QLD 4109',  group: 'outer',        expectFlood: null },
  { id: 28, address: '5 Draper Road, Calamvale QLD 4116',             group: 'outer',        expectFlood: null },
  { id: 29, address: '45 Robinson Road, Aspley QLD 4034',             group: 'outer',        expectFlood: false },
  { id: 30, address: '10 Padstow Road, Eight Mile Plains QLD 4113',   group: 'outer',        expectFlood: false },
]

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function geocode(address) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=au`
  const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ-CoverageTest/1.0' } })
  const data = await res.json()
  if (!data || data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
}

async function hitApi(address) {
  const url = `${API_BASE}/api/lookup?address=${encodeURIComponent(address)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'ZoneIQ-CoverageTest/1.0' } })
  const body = await res.json()
  return { status: res.status, body }
}

async function main() {
  console.log(`ZoneIQ Comprehensive Coverage Test`)
  console.log(`API: ${API_BASE}`)
  console.log(`Addresses: ${addresses.length}\n`)

  const results = []

  for (const entry of addresses) {
    const testAnef = ANEF_SUBSET.has(entry.id)
    process.stdout.write(`[${String(entry.id).padStart(2)}] ${entry.address.padEnd(58)} `)

    // Geocode
    const geo = await geocode(entry.address)
    await sleep(1100) // Nominatim 1 req/sec

    if (!geo) {
      console.log(`GEOCODE_FAIL`)
      results.push({ ...entry, testAnef, geocoded: false, lat: null, lng: null, apiStatus: null, apiError: 'GEOCODE_FAIL', floodResult: 'FAIL', anefResult: 'N/A', zone_code: null, flood: null, noise: null })
      continue
    }

    // Hit live API
    const { status, body } = await hitApi(entry.address)
    await sleep(600)

    const apiSuccess = body.success === true
    const apiError = !apiSuccess ? (body.error || String(status)) : null
    const zone_code = body.zone?.code ?? body.zone?.name ?? (body.zone_code ?? null)
    const flood = apiSuccess ? body.overlays?.flood : null
    const noise = apiSuccess ? body.overlays?.noise : null

    let floodResult, anefResult

    if (!apiSuccess) {
      floodResult = `FAIL:${apiError}`
      anefResult = testAnef ? `FAIL:${apiError}` : 'N/A'
      console.log(`FAIL(${apiError}) zone=${zone_code ?? '—'}  lat=${geo.lat.toFixed(4)},${geo.lng.toFixed(4)}`)
    } else {
      const hasFlood = flood?.has_flood_overlay
      floodResult = hasFlood
        ? `VALID_HIT:${flood.overlay_type}/${flood.risk_level}/${flood.flood_category}`
        : 'VALID_MISS'

      const hasNoise = noise?.has_noise_overlay
      anefResult = !testAnef
        ? 'N/A'
        : hasNoise
          ? `HIT:${noise.airport}/${noise.anef_contour}`
          : 'MISS'

      const line = `PASS zone=${zone_code} flood=${hasFlood ? `HIT(${flood.risk_level})` : 'MISS'}`
      const anefLine = testAnef ? ` anef=${hasNoise ? `HIT(${noise.airport} ${noise.anef_contour})` : 'MISS'}` : ''
      console.log(line + anefLine)
    }

    results.push({
      ...entry,
      testAnef,
      geocoded: true,
      lat: geo.lat,
      lng: geo.lng,
      geocodedDisplay: geo.display,
      apiStatus: status,
      apiError,
      zone_code,
      floodResult,
      anefResult,
      flood,
      noise,
    })
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8')
  console.log(`\nResults saved to flood-anef-results.json`)

  // Quick summary
  const passed = results.filter(r => r.floodResult.startsWith('VALID'))
  const failed = results.filter(r => r.floodResult.startsWith('FAIL'))
  const hits = results.filter(r => r.floodResult.startsWith('VALID_HIT'))
  const floodKnown = results.filter(r => r.group === 'flood-known')
  const floodKnownHit = floodKnown.filter(r => r.floodResult.startsWith('VALID_HIT'))
  const anefTested = results.filter(r => r.testAnef)
  const anefHit = anefTested.filter(r => r.anefResult && r.anefResult.startsWith('HIT'))

  console.log(`\n=== QUICK SUMMARY ===`)
  console.log(`Flood pass rate:    ${passed.length}/30 (${Math.round(passed.length/30*100)}%)`)
  console.log(`Flood VALID_HITs:   ${hits.length}`)
  console.log(`Flood-known hit:    ${floodKnownHit.length}/${floodKnown.length}`)
  console.log(`FAIL breakdown:     ${failed.map(r => r.apiError).reduce((a,e) => { a[e]=(a[e]||0)+1; return a }, {})}`)
  console.log(`ANEF tested:        ${anefTested.length} addresses`)
  console.log(`ANEF HITs:          ${anefHit.length}/${anefTested.length}`)

  return results
}

main().catch(e => { console.error(e); process.exit(1) })
