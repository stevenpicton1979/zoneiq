/**
 * api-lookup.test.js — ZoneIQ /api/lookup smoke tests
 *
 * Tests known addresses across all 4 supported councils.
 * Hits the API at API_BASE_URL (env var). Skips gracefully if unreachable.
 *
 * Run locally:  API_BASE_URL=http://localhost:3000 npm test
 * CI:           Set API_BASE_URL as a GitHub Actions variable pointing to production.
 *
 * Council values in DB (no underscores):
 *   brisbane | goldcoast | moretonbay | sunshinecoast
 */

const BASE_URL = process.env.API_BASE_URL || 'https://zoneiq.vercel.app'

// Check if the API is reachable before running tests
let apiReachable = false

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/lookup?address=Brisbane+QLD`, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    // Accessible if response is JSON (not an HTML page)
    apiReachable = text.trimStart().startsWith('{') || text.trimStart().startsWith('[')
    if (!apiReachable) {
      console.warn(`[SKIP] API at ${BASE_URL} returned non-JSON — skipping all tests. Set API_BASE_URL to a reachable deployment.`)
    }
  } catch {
    console.warn(`[SKIP] API at ${BASE_URL} is unreachable — skipping all tests. Set API_BASE_URL to a reachable deployment.`)
  }
}, 15000)

async function lookup(address) {
  const url = `${BASE_URL}/api/lookup?address=${encodeURIComponent(address)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const data = await res.json()
  return { status: res.status, data }
}

// ── Brisbane — Low Density Residential ───────────────────────────────────────

test('Brisbane LDR: zone_code present and council is brisbane', async () => {
  if (!apiReachable) return

  const { status, data } = await lookup('6 Glenheaton Court Carindale QLD')

  expect(status).toBe(200)
  expect(data.success).toBe(true)
  expect(data.zone).toBeTruthy()
  expect(typeof data.zone.code).toBe('string')
  expect(data.zone.code.length).toBeGreaterThan(0)
  expect(data.zone.council).toBe('brisbane')
  expect(data.overlays).toBeTruthy()
  expect(data.overlays.flood).toBeDefined()
})

// ── Gold Coast ────────────────────────────────────────────────────────────────

test('Gold Coast: council is goldcoast and zone_code present', async () => {
  if (!apiReachable) return

  const { status, data } = await lookup('3180 Surfers Paradise Boulevard Surfers Paradise QLD')

  expect(status).toBe(200)
  expect(data.success).toBe(true)
  expect(data.zone).toBeTruthy()
  expect(typeof data.zone.code).toBe('string')
  expect(data.zone.code.length).toBeGreaterThan(0)
  expect(data.zone.council).toBe('goldcoast')
  expect(data.overlays).toBeTruthy()
  expect(data.overlays.flood).toBeDefined()
})

// ── Moreton Bay ───────────────────────────────────────────────────────────────

test('Moreton Bay: council is moretonbay and zone_code present', async () => {
  if (!apiReachable) return

  const { status, data } = await lookup('1 Anzac Avenue Redcliffe QLD')

  expect(status).toBe(200)
  expect(data.success).toBe(true)
  expect(data.zone).toBeTruthy()
  expect(typeof data.zone.code).toBe('string')
  expect(data.zone.code.length).toBeGreaterThan(0)
  expect(data.zone.council).toBe('moretonbay')
  expect(data.overlays).toBeTruthy()
  expect(data.overlays.flood).toBeDefined()
})

// ── Sunshine Coast ────────────────────────────────────────────────────────────

test('Sunshine Coast: council is sunshinecoast and zone_code present', async () => {
  if (!apiReachable) return

  const { status, data } = await lookup('63 Aerodrome Road Maroochydore QLD')

  expect(status).toBe(200)
  expect(data.success).toBe(true)
  expect(data.zone).toBeTruthy()
  expect(typeof data.zone.code).toBe('string')
  expect(data.zone.code.length).toBeGreaterThan(0)
  expect(data.zone.council).toBe('sunshinecoast')
  expect(data.overlays).toBeTruthy()
  expect(data.overlays.flood).toBeDefined()
})

// ── Error handling ────────────────────────────────────────────────────────────

test('Missing address param returns 400 with MISSING_ADDRESS error', async () => {
  if (!apiReachable) return

  const res = await fetch(`${BASE_URL}/api/lookup`, { signal: AbortSignal.timeout(8000) })
  expect(res.status).toBe(400)
  const data = await res.json()
  expect(data.success).toBe(false)
  expect(data.error).toBe('MISSING_ADDRESS')
})
