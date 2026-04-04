export const metadata = { title: 'ZoneIQ API Documentation' }

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">

      {/* Nav */}
      <nav className="border-b border-zinc-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <a href="/" className="text-lg font-bold tracking-tight hover:text-zinc-600">ZoneIQ</a>
            <span className="text-xs text-zinc-400">API Docs</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="/#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="/#get-key" className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              Get API Key
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-12">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24 space-y-1 text-sm text-zinc-500">
              {[
                ['#authentication', 'Authentication'],
                ['#endpoint', 'Endpoint'],
                ['#parameters', 'Parameters'],
                ['#response', 'Response format'],
                ['#errors', 'Error codes'],
                ['#coverage', 'Coverage'],
                ['#rate-limits', 'Rate limits'],
                ['#examples', 'Examples'],
              ].map(([href, label]) => (
                <a key={href} href={href} className="block py-1 hover:text-zinc-900 transition-colors">{label}</a>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 space-y-14">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 mb-3">API Documentation</h1>
              <p className="text-zinc-500 leading-relaxed">
                ZoneIQ provides planning zone and overlay data for South East Queensland addresses.
                Pass any address as a query parameter and receive structured JSON with zone rules, setbacks, permitted uses, and overlays.
              </p>
              <p className="mt-3 text-sm">
                <span className="bg-zinc-100 text-zinc-600 rounded px-2 py-0.5 font-mono text-xs">Base URL:</span>{' '}
                <code className="text-zinc-800">https://zoneiq.com.au</code>
              </p>
            </div>

            {/* Authentication */}
            <section id="authentication">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Authentication</h2>
              <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                Pass your API key via the <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">X-Api-Key</code> header
                or the <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">api_key</code> query parameter.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Header (recommended)</div>
                  <pre className="rounded-lg bg-zinc-900 px-4 py-3 text-xs text-zinc-100 overflow-x-auto">X-Api-Key: ziq_live_your_key_here</pre>
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Query parameter</div>
                  <pre className="rounded-lg bg-zinc-900 px-4 py-3 text-xs text-zinc-100 overflow-x-auto">/api/lookup?address=...&api_key=ziq_live_...</pre>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Unauthenticated requests are supported for testing but are rate-limited. Get a{' '}
                <a href="/#get-key" className="underline hover:text-zinc-800">free API key</a> to increase your limits.
              </p>
            </section>

            {/* Endpoint */}
            <section id="endpoint">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Endpoint</h2>
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 mb-4">
                <span className="rounded bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5">GET</span>
                <code className="text-sm font-mono text-zinc-800">/api/lookup</code>
              </div>
              <p className="text-sm text-zinc-600">Look up planning zone and development rules for any SEQ address.</p>
            </section>

            {/* Parameters */}
            <section id="parameters">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Parameters</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-6">Parameter</th>
                      <th className="pb-3 pr-6">In</th>
                      <th className="pb-3 pr-6">Required</th>
                      <th className="pb-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-600">
                    <tr className="border-b border-zinc-100">
                      <td className="py-3 pr-6"><code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">address</code></td>
                      <td className="py-3 pr-6 text-zinc-400">query</td>
                      <td className="py-3 pr-6 text-emerald-600 font-medium">Yes</td>
                      <td className="py-3">Full address string. Include suburb and state for best results. e.g. <span className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded">1 George St Brisbane QLD 4000</span></td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-3 pr-6"><code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">X-Api-Key</code></td>
                      <td className="py-3 pr-6 text-zinc-400">header</td>
                      <td className="py-3 pr-6 text-zinc-400">No</td>
                      <td className="py-3">Your API key. Required for higher rate limits.</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-6"><code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">api_key</code></td>
                      <td className="py-3 pr-6 text-zinc-400">query</td>
                      <td className="py-3 pr-6 text-zinc-400">No</td>
                      <td className="py-3">Alternative to X-Api-Key header.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Response format */}
            <section id="response">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Response format</h2>
              <p className="text-sm text-zinc-600 mb-4">Successful response (HTTP 200):</p>
              <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto leading-relaxed">{`{
  "success": true,
  "query": {
    "address_input": "1 George St Brisbane QLD 4000",
    "address_resolved": "1 George Street, Brisbane City QLD 4000",
    "lat": -27.4697,
    "lng": 153.0238
  },
  "zone": {
    "code": "CR3",
    "name": "Centre",
    "category": "commercial",
    "council": "brisbane"
  },
  "rules": {
    "max_height_m": null,
    "max_storeys": null,
    "max_site_coverage_pct": 100,
    "min_permeability_pct": 0,
    "setbacks": {
      "front_m": 0,
      "side_m": 0,
      "rear_m": 0
    },
    "secondary_dwelling_permitted": "no",
    "short_term_accom_permitted": "yes",
    "home_business_permitted": "no",
    "subdivision_min_lot_size_m2": null
  },
  "key_rules": [
    "Height determined by applicable centre precinct",
    "Active street frontages required at ground level"
  ],
  "uses": {
    "permitted": ["Shop", "Office", "Food and drink outlet"],
    "requires_permit": ["Hospital", "Stadium"],
    "prohibited": ["Extractive industry", "Heavy industry"]
  },
  "overlays": {
    "flood": {
      "has_flood_overlay": false,
      "risk_level": "none"
    },
    "character": {
      "has_character_overlay": false
    },
    "schools": []
  },
  "meta": {
    "source": "Brisbane City Plan 2014",
    "source_url": "https://cityplan.brisbane.qld.gov.au",
    "last_verified": "2025-01-01",
    "disclaimer": "Indicative only. Always verify with council.",
    "response_ms": 312,
    "auth": {
      "authenticated": true,
      "plan": "starter"
    }
  }
}`}</pre>
            </section>

            {/* Error codes */}
            <section id="errors">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Error codes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-6">HTTP</th>
                      <th className="pb-3 pr-6">error field</th>
                      <th className="pb-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-600">
                    {[
                      ['400', 'MISSING_ADDRESS', 'No address query parameter provided'],
                      ['401', 'INVALID_KEY', 'API key is missing, invalid, inactive, or rate-limited'],
                      ['404', 'ADDRESS_NOT_FOUND', 'Geocoding failed — address could not be resolved'],
                      ['404', 'OUTSIDE_COVERAGE', 'Address is outside the covered council areas'],
                      ['404', 'ZONE_NOT_SEEDED', 'Zone polygon found but rules not yet in database'],
                    ].map(([status, code, desc]) => (
                      <tr key={code} className="border-b border-zinc-100">
                        <td className="py-3 pr-6 font-mono text-xs text-zinc-500">{status}</td>
                        <td className="py-3 pr-6"><code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">{code}</code></td>
                        <td className="py-3 text-zinc-500">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                All error responses follow the shape: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">{`{ "success": false, "error": "CODE", "message": "..." }`}</code>
              </p>
            </section>

            {/* Coverage */}
            <section id="coverage">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Coverage</h2>
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                {[
                  ['Brisbane City Council', 'Brisbane City Plan 2014', '26,358 polygons'],
                  ['Gold Coast City Council', 'Gold Coast City Plan 2016', '29,537 polygons'],
                  ['Moreton Bay Regional Council', 'MBRC Planning Scheme', '13,950 polygons'],
                ].map(([council, scheme, count]) => (
                  <div key={council} className="rounded-xl border border-zinc-200 p-4">
                    <div className="font-medium text-zinc-900 text-sm mb-1">{council}</div>
                    <div className="text-xs text-zinc-500">{scheme}</div>
                    <div className="text-xs text-zinc-400 mt-1">{count}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                Coming soon: Sunshine Coast (May 2026), Ipswich, Logan, Redland
              </div>
            </section>

            {/* Rate limits */}
            <section id="rate-limits">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Rate limits</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-6">Plan</th>
                      <th className="pb-3 pr-6">Requests/day</th>
                      <th className="pb-3">Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-600">
                    {[
                      ['Unauthenticated', 'Limited', 'Free — for testing only'],
                      ['Free', '100', '$0/month'],
                      ['Starter', '500', '$29 AUD/month'],
                      ['Pro', '5,000', '$99 AUD/month'],
                    ].map(([plan, limit, price]) => (
                      <tr key={plan} className="border-b border-zinc-100">
                        <td className="py-3 pr-6 font-medium">{plan}</td>
                        <td className="py-3 pr-6">{limit}</td>
                        <td className="py-3 text-zinc-500">{price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Rate limits reset at midnight UTC. When exceeded, the response will be HTTP 401 with error <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">INVALID_KEY</code> and a message indicating the limit.
              </p>
            </section>

            {/* Examples */}
            <section id="examples">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Examples</h2>
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-zinc-700 mb-2">curl</div>
                  <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto">{`curl -G https://zoneiq.com.au/api/lookup \\
  --data-urlencode "address=12 Windermere Rd Ascot QLD 4007" \\
  -H "X-Api-Key: ziq_live_your_key_here"`}</pre>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-700 mb-2">JavaScript (fetch)</div>
                  <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto">{`const response = await fetch(
  'https://zoneiq.com.au/api/lookup?address=' +
    encodeURIComponent('12 Windermere Rd Ascot QLD 4007'),
  {
    headers: { 'X-Api-Key': 'ziq_live_your_key_here' }
  }
)
const data = await response.json()

if (data.success) {
  console.log(data.zone.name)                        // "Low Density Residential"
  console.log(data.rules.max_height_m)               // 9.5
  console.log(data.overlays.flood.has_flood_overlay) // false
}`}</pre>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-700 mb-2">Python (httpx)</div>
                  <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto">{`import httpx

response = httpx.get(
    "https://zoneiq.com.au/api/lookup",
    params={"address": "12 Windermere Rd Ascot QLD 4007"},
    headers={"X-Api-Key": "ziq_live_your_key_here"},
)
data = response.json()

if data["success"]:
    print(data["zone"]["name"])                         # Low Density Residential
    print(data["rules"]["max_height_m"])                # 9.5
    print(data["overlays"]["flood"]["has_flood_overlay"]) # False`}</pre>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-6 py-6 mt-12">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 text-xs text-zinc-400 justify-between items-center">
          <span>ZoneIQ — SEQ Planning Zone API · Built by <a href="https://stevenpicton.ai" className="underline hover:text-zinc-600">stevenpicton.ai</a></span>
          <div className="flex gap-4">
            <a href="/" className="hover:text-zinc-700">Home</a>
            <a href="/#pricing" className="hover:text-zinc-700">Pricing</a>
            <a href="/#get-key" className="hover:text-zinc-700">Get API Key</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
