// Sprint 17 smoke tests — verify flood data + zone rules returned post-fix
const BASE = 'https://zoneiq-sigma.vercel.app'

const tests = [
  { address: '8 Fairfield Road Yeronga QLD 4105', expect_flood: true, expect_zone: 'LMR' },
  { address: '18 Montague Road West End QLD 4101', expect_flood: true, expect_zone: 'MU' },
  { address: '30 Oxlade Drive New Farm QLD 4005', expect_flood: true, expect_zone: null },
]

async function run() {
  let passed = 0
  for (const t of tests) {
    const url = `${BASE}/api/lookup?address=${encodeURIComponent(t.address)}`
    try {
      const res = await fetch(url)
      const j = await res.json()
      const zone = j.zone?.code ?? 'null'
      const flood = j.overlays?.flood
      const has_flood = flood?.has_flood_overlay ?? false
      const partial = j.meta?.partial ?? false
      const reason = j.meta?.reason ?? '-'

      const flood_ok = has_flood === t.expect_flood
      const zone_ok = t.expect_zone ? zone === t.expect_zone : true
      const ok = flood_ok && zone_ok && !partial

      console.log(`${ok ? 'PASS' : 'FAIL'} | ${t.address}`)
      console.log(`       zone=${zone} flood=${has_flood} partial=${partial} reason=${reason}`)
      if (!flood_ok) console.log(`       !! Expected flood=${t.expect_flood}, got ${has_flood}`)
      if (!zone_ok) console.log(`       !! Expected zone=${t.expect_zone}, got ${zone}`)
      if (ok) passed++
    } catch (e) {
      console.log(`ERROR | ${t.address}: ${e.message}`)
    }
  }
  console.log(`\n${passed}/${tests.length} passed`)
}

run()
