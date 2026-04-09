'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type LookupResult = {
  success: boolean
  query?: { address_input: string; address_resolved: string; lat: number; lng: number }
  zone?: { code: string; name: string; category: string; council: string }
  rules?: {
    max_height_m: number | null
    max_storeys: number | null
    max_site_coverage_pct: number | null
    min_permeability_pct: number | null
    setbacks: { front_m: number | null; side_m: number | null; rear_m: number | null }
    secondary_dwelling_permitted: string
    short_term_accom_permitted: string
    home_business_permitted: string
    subdivision_min_lot_size_m2: number | null
  }
  key_rules?: string[]
  uses?: { permitted: string[]; requires_permit: string[]; prohibited: string[] }
  overlays?: {
    flood: { has_flood_overlay: boolean; flood_category?: string; risk_level?: string }
    character: { has_character_overlay: boolean; character_type?: string }
    schools: Array<{ school_name: string; school_type: string; school_level: string | null; suburb: string | null }>
  }
  meta?: { source: string; source_url: string; last_verified: string; disclaimer: string; response_ms: number }
  error?: string
  message?: string
  zone_code?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_ADDRESSES = [
  '18 Montague Road, West End QLD 4101',
  '1 Surfers Paradise Blvd, Surfers Paradise QLD 4217',
  '45 Homebush Bay Drive, Homebush NSW 2140',
  '12 Martin Place, Sydney NSW 2000',
  '22 Church Street, Richmond VIC 3121',
  '200 Swanston Street, Melbourne VIC 3000',
]

const CATEGORY_STYLES: Record<string, { badge: string; border: string }> = {
  residential: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', border: 'border-emerald-300' },
  commercial:  { badge: 'bg-blue-100 text-blue-800 border-blue-200',          border: 'border-blue-300' },
  industrial:  { badge: 'bg-amber-100 text-amber-800 border-amber-200',       border: 'border-amber-300' },
  mixed:       { badge: 'bg-purple-100 text-purple-800 border-purple-200',    border: 'border-purple-300' },
  other:       { badge: 'bg-zinc-100 text-zinc-700 border-zinc-200',          border: 'border-zinc-300' },
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES['residential']
}

function councilLabel(council: string) {
  const labels: Record<string, string> = {
    goldcoast: 'Gold Coast City Council',
    moretonbay: 'Moreton Bay Regional Council',
    sunshinecoast: 'Sunshine Coast Regional Council',
    ipswich: 'Ipswich City Council',
    logan: 'Logan City Council',
    redland: 'Redland City Council',
    sydney: 'City of Sydney',
    melbourne: 'City of Melbourne',
    yarra: 'City of Yarra',
    port_phillip: 'City of Port Phillip',
    stonnington: 'City of Stonnington',
  }
  return labels[council] ?? council.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Small components ─────────────────────────────────────────────────────────

function PermitBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    yes: 'bg-emerald-100 text-emerald-700',
    permit_required: 'bg-amber-100 text-amber-700',
    no: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    yes: 'Permitted',
    permit_required: 'Permit required',
    no: 'Not permitted',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[value] ?? value}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  // Lookup state
  const [address, setAddress]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<LookupResult | null>(null)
  const [showJSON, setShowJSON]   = useState(false)

  // Signup state
  const [signupName, setSignupName]   = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPlan, setSignupPlan]   = useState('free')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupKey, setSignupKey]     = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  async function lookup(addr: string) {
    if (!addr.trim()) return
    setLoading(true)
    setResult(null)
    setShowJSON(false)
    try {
      const res = await fetch(`/api/lookup?address=${encodeURIComponent(addr)}`)
      setResult(await res.json())
    } catch {
      setResult({ success: false, error: 'NETWORK_ERROR', message: 'Could not reach the API.' })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); lookup(address) }
  function handleChip(addr: string) { setAddress(addr); lookup(addr) }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSignupLoading(true)
    setSignupKey(null)
    setSignupError(null)
    try {
      const res = await fetch('/api/register-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, email: signupEmail, plan: signupPlan }),
      })
      const data = await res.json()
      if (!res.ok) { setSignupError(data.error ?? 'Something went wrong.'); return }
      setSignupKey(data.key)
    } catch {
      setSignupError('Network error. Please try again.')
    } finally {
      setSignupLoading(false)
    }
  }

  async function copyKey() {
    if (!signupKey) return
    await navigator.clipboard.writeText(signupKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const style = result?.zone ? getCategoryStyle(result.zone.category) : null

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="border-b border-zinc-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-tight">ZoneIQ</span>
            <span className="text-xs text-zinc-400 hidden sm:inline">Australia&rsquo;s Planning Zone API</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="/docs" className="hover:text-zinc-900 transition-colors">Docs</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#get-key" className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              Get API Key
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero + Live demo ──────────────────────────────────────────────── */}
      <section className="bg-zinc-50 border-b border-zinc-100 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-4">
              Australia&rsquo;s planning zone API
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed">
              Instant zone, rules, and overlay data for any Australian address.
              One API call. Clean JSON. No scraping.
            </p>
          </div>

          {/* Live demo */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-4">Live demo</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter any Australian address…"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Looking up…' : 'Lookup'}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_ADDRESSES.map((addr) => (
                <button
                  key={addr}
                  onClick={() => handleChip(addr)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
                >
                  {addr}
                </button>
              ))}
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 space-y-4">
                {result.success && result.zone && result.rules && result.meta ? (
                  <>
                    <div className={`rounded-xl border-2 bg-white p-5 ${style?.border}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style?.badge}`}>
                              {result.zone.category}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">{result.zone.code}</span>
                          </div>
                          <h2 className="text-xl font-bold text-zinc-900">{result.zone.name}</h2>
                          <p className="mt-0.5 text-sm text-zinc-500">
                            {result.query?.address_resolved} — {councilLabel(result.zone.council)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-zinc-400">
                          <div>{result.meta.response_ms}ms</div>
                          <div>{result.query?.lat.toFixed(4)}, {result.query?.lng.toFixed(4)}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-4">
                        <div>
                          <span className="text-zinc-400 text-xs">Max height</span>
                          <div className="font-medium">
                            {result.rules.max_height_m != null ? `${result.rules.max_height_m}m` : '—'}
                            {result.rules.max_storeys != null ? ` / ${result.rules.max_storeys} st` : ''}
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-xs">Site coverage</span>
                          <div className="font-medium">{result.rules.max_site_coverage_pct != null ? `${result.rules.max_site_coverage_pct}%` : '—'}</div>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-xs">Permeability</span>
                          <div className="font-medium">{result.rules.min_permeability_pct != null ? `${result.rules.min_permeability_pct}% min` : '—'}</div>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-xs">Min lot (subdivision)</span>
                          <div className="font-medium">{result.rules.subdivision_min_lot_size_m2 != null ? `${result.rules.subdivision_min_lot_size_m2}m²` : '—'}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-x-6 text-sm">
                        {(['front', 'side', 'rear'] as const).map((side) => (
                          <div key={side}>
                            <span className="text-zinc-400 text-xs capitalize">{side} setback</span>
                            <div className="font-medium">{result.rules!.setbacks[`${side}_m`] != null ? `${result.rules!.setbacks[`${side}_m`]}m` : '—'}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-3">
                        {[
                          ['Secondary dwelling', result.rules.secondary_dwelling_permitted],
                          ['Short-term accom', result.rules.short_term_accom_permitted],
                          ['Home business', result.rules.home_business_permitted],
                        ].map(([label, val]) => (
                          <div key={label} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-zinc-500">{label}</span>
                            <PermitBadge value={val} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {result.key_rules && result.key_rules.length > 0 && (
                      <div className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Key Rules</h3>
                        <ul className="space-y-1.5">
                          {result.key_rules.map((rule, i) => (
                            <li key={i} className="flex gap-2 text-sm text-zinc-700">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.uses && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Permitted</h3>
                          <ul className="space-y-1">{result.uses.permitted.map((u, i) => <li key={i} className="text-sm text-emerald-900">{u}</li>)}</ul>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Requires Permit</h3>
                          <ul className="space-y-1">{result.uses.requires_permit.map((u, i) => <li key={i} className="text-sm text-amber-900">{u}</li>)}</ul>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Prohibited</h3>
                          <ul className="space-y-1">{result.uses.prohibited.map((u, i) => <li key={i} className="text-sm text-red-900">{u}</li>)}</ul>
                        </div>
                      </div>
                    )}

                    {result.overlays && (
                      <div className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Overlays</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            <span className="text-sm text-zinc-500 w-24 shrink-0">Flood</span>
                            <div className="flex-1">
                              {result.overlays.flood.has_flood_overlay ? (
                                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${result.overlays.flood.risk_level === 'high' || result.overlays.flood.risk_level === 'medium' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {result.overlays.flood.risk_level === 'high' ? '⚠ High Risk' : result.overlays.flood.risk_level === 'medium' ? '⚠ Medium Risk' : 'Low Risk'} Flood Overlay
                                </span>
                              ) : (
                                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">No Flood Overlay</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <span className="text-sm text-zinc-500 w-24 shrink-0">Character</span>
                            <div className="flex-1">
                              {result.overlays.character.has_character_overlay ? (
                                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Character Overlay</span>
                              ) : (
                                <span className="text-xs text-zinc-400">None</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <span className="text-sm text-zinc-500 w-24 shrink-0">Schools</span>
                            <div className="flex-1">
                              {result.overlays.schools.length > 0 ? (
                                <ul className="space-y-1">
                                  {result.overlays.schools.map((s, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.school_type === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                                        {s.school_type === 'primary' ? 'Primary' : 'Secondary'}
                                      </span>
                                      <span className="text-zinc-700">{s.school_name}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-xs text-zinc-400">No state school catchment found</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <button onClick={() => setShowJSON(v => !v)} className="text-xs text-zinc-400 underline hover:text-zinc-600">
                        {showJSON ? 'Hide' : 'Show'} raw API response
                      </button>
                      {showJSON && (
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-xs text-zinc-100">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="font-semibold text-red-700">{result.error}</p>
                    <p className="mt-1 text-sm text-red-600">{result.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">What you get</h2>
          <p className="text-zinc-500 mb-10">Everything a property developer, valuer, or proptech team needs. Structured JSON, no HTML parsing.</p>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="text-2xl mb-3">🏘️</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Zone + Rules</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Zone code and name, height limits, site coverage, setbacks, permitted uses — all structured as clean JSON.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="text-2xl mb-3">🌊</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Overlays</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Flood risk, bushfire hazard, heritage listings, school catchments, aircraft noise (ANEF), character overlays — all in a single call.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="text-2xl mb-3">📍</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Coverage</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                84 councils across QLD, NSW and VIC. Brisbane, Sydney, Melbourne and surrounds.{' '}
                <span className="text-zinc-400">More states coming soon.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-6 py-16 border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Pricing</h2>
          <p className="text-zinc-500 mb-10">Start free. Upgrade when you scale.</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Free */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Free</div>
              <div className="text-3xl font-bold text-zinc-900 mb-1">$0<span className="text-base font-normal text-zinc-400">/month</span></div>
              <div className="text-sm text-zinc-500 mb-6">No credit card required</div>
              <ul className="space-y-2 text-sm text-zinc-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 100 requests/day</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full JSON API</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All councils</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All overlays</li>
              </ul>
              <a href="#get-key" className="block text-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                Get free key
              </a>
            </div>

            {/* Starter */}
            <div className="rounded-xl border-2 border-zinc-900 bg-white p-6 relative">
              <div className="absolute -top-3 left-6 bg-zinc-900 text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</div>
              <div className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Starter</div>
              <div className="text-3xl font-bold text-zinc-900 mb-1">$29<span className="text-base font-normal text-zinc-400"> AUD/month</span></div>
              <div className="text-sm text-zinc-500 mb-6">Billed monthly</div>
              <ul className="space-y-2 text-sm text-zinc-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 500 requests/day</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full JSON API</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All councils</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All overlays</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Email support</li>
              </ul>
              <a href="#get-key" onClick={() => setSignupPlan('starter')} className="block text-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
                Get Starter key
              </a>
            </div>

            {/* Pro */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Pro</div>
              <div className="text-3xl font-bold text-zinc-900 mb-1">$99<span className="text-base font-normal text-zinc-400"> AUD/month</span></div>
              <div className="text-sm text-zinc-500 mb-6">Billed monthly</div>
              <ul className="space-y-2 text-sm text-zinc-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 5,000 requests/day</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full JSON API</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All councils</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> All overlays</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Priority support</li>
              </ul>
              <a href="#get-key" onClick={() => setSignupPlan('pro')} className="block text-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                Get Pro key
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick start ───────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Quick start</h2>
          <p className="text-zinc-500 mb-8">One API call. Clean JSON.</p>
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">curl</div>
              <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto leading-relaxed">{`curl -G https://zoneiq.com.au/api/lookup \\
  --data-urlencode \\
  "address=1 George St Brisbane QLD" \\
  -H "X-Api-Key: YOUR_KEY"`}</pre>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">JavaScript</div>
              <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto leading-relaxed">{`const res = await fetch(
  '/api/lookup?address=' +
  encodeURIComponent(address),
  { headers: {
    'X-Api-Key': 'YOUR_KEY'
  }}
)
const data = await res.json()
console.log(data.zone.name)
// "Centre"
console.log(data.rules.max_height_m)
// null (height overlay applies)`}</pre>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Python</div>
              <pre className="rounded-xl bg-zinc-900 p-5 text-xs text-zinc-100 overflow-x-auto leading-relaxed">{`import httpx

r = httpx.get(
  "https://zoneiq.com.au/api/lookup",
  params={"address": "1 George St Brisbane QLD"},
  headers={"X-Api-Key": "YOUR_KEY"}
)
data = r.json()
print(data["zone"]["name"])
# "Centre"
print(data["rules"]["max_storeys"])
# None`}</pre>
            </div>
          </div>
          <div className="mt-6">
            <a href="/docs" className="text-sm text-zinc-500 underline hover:text-zinc-900">
              View full API documentation →
            </a>
          </div>
        </div>
      </section>

      {/* ── Get API Key ───────────────────────────────────────────────────── */}
      <section id="get-key" className="px-6 py-16 border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Get your API key</h2>
            <p className="text-zinc-500 mb-8">Free tier is 100 requests/day. No credit card required.</p>

            {signupKey ? (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <p className="font-semibold text-emerald-800 mb-1">Your API key</p>
                <p className="text-xs text-emerald-600 mb-4">Save this key securely — it will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white border border-emerald-200 px-4 py-3 text-sm font-mono text-zinc-800 break-all">
                    {signupKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {signupPlan !== 'free' && (
                  <p className="mt-4 text-sm text-emerald-700">
                    You&rsquo;ll receive an invoice at {signupEmail} shortly. Your key is active immediately.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Your name or company"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Plan</label>
                  <select
                    value={signupPlan}
                    onChange={(e) => setSignupPlan(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  >
                    <option value="free">Free — 100 req/day ($0)</option>
                    <option value="starter">Starter — 500 req/day ($29 AUD/month)</option>
                    <option value="pro">Pro — 5,000 req/day ($99 AUD/month)</option>
                  </select>
                </div>
                {signupError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{signupError}</p>
                )}
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {signupLoading ? 'Generating key…' : 'Get API Key'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 bg-white px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="font-bold text-zinc-900 mb-1">ZoneIQ</div>
              <p className="text-xs text-zinc-400">Australia&rsquo;s planning zone API</p>
              <p className="text-xs text-zinc-400 mt-1">Coverage: QLD · NSW · VIC — 84 councils</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
              <a href="/docs" className="hover:text-zinc-700">API Docs</a>
              <a href="#pricing" className="hover:text-zinc-700">Pricing</a>
              <span className="text-zinc-300">|</span>
              <a href="https://cityplan.brisbane.qld.gov.au" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700">Brisbane City Plan 2014</a>
              <a href="https://cityplan.goldcoast.qld.gov.au" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700">Gold Coast City Plan 2016</a>
              <a href="https://www.planningportal.nsw.gov.au" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700">NSW Planning Portal</a>
              <a href="https://www.planning.vic.gov.au" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700">Vic Planning</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-100 text-xs text-zinc-400">
            <p>Indicative only. Always verify with the relevant council before making development decisions. Rules may be affected by overlays, neighbourhood plans, or recent amendments.</p>
            <p className="mt-1">Built by <a href="https://stevenpicton.ai" className="underline hover:text-zinc-600">stevenpicton.ai</a></p>
          </div>
        </div>
      </footer>
    </div>
  )
}
