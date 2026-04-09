const addresses = [
  '8 Fairfield Road, Yeronga QLD 4105',
  '18 Montague Road, West End QLD 4101',
  '30 Oxlade Drive, New Farm QLD 4005',
  '15 Musgrave Road, Red Hill QLD 4059',
  '42 Wellington Road, East Brisbane QLD 4169',
]

const BASE = 'https://zoneiq-sigma.vercel.app/api/lookup'

async function test(address) {
  const url = `${BASE}?address=${encodeURIComponent(address)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const data = await res.json()
  return {
    address,
    lat: data.query?.lat,
    lng: data.query?.lng,
    zone: data.zone?.code,
    council: data.zone?.council,
    flood: data.overlays?.flood?.has_flood_overlay ?? null,
    flood_category: data.overlays?.flood?.flood_category ?? null,
    bushfire: data.overlays?.bushfire?.has_bushfire_overlay ?? null,
    partial: data.meta?.partial ?? false,
    success: data.success,
    error: data.error ?? null,
  }
}

;(async () => {
  for (const addr of addresses) {
    try {
      const result = await test(addr)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(`FAIL: ${addr} — ${err.message}`)
    }
  }
})()
