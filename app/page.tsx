'use client'

import { useState } from 'react'

const EXAMPLE_ADDRESSES = [
  '12 Windermere Rd, Ascot QLD 4007',
  '100 Melbourne St, South Brisbane QLD 4101',
  '5 James St, Fortitude Valley QLD 4006',
  '18 Surfers Paradise Blvd, Surfers Paradise QLD 4217',
  '10 Elkhorn Ave, Surfers Paradise QLD 4217',
]

const CATEGORY_STYLES: Record<string, { badge: string; border: string }> = {
  residential: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-emerald-300',
  },
  commercial: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    border: 'border-blue-300',
  },
  industrial: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-300',
  },
  mixed: {
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    border: 'border-purple-300',
  },
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES['residential']
}

type LookupResult = {
  success: boolean
  query?: {
    address_input: string
    address_resolved: string
    lat: number
    lng: number
  }
  zone?: {
    code: string
    name: string
    category: string
    council: string
  }
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
  uses?: {
    permitted: string[]
    requires_permit: string[]
    prohibited: string[]
  }
  overlays?: {
    flood: {
      has_flood_overlay: boolean
      overlay_type?: string
      flood_category?: string
      risk_level?: string
    }
    character: {
      has_character_overlay: boolean
      character_type?: string
    }
    schools: Array<{
      school_name: string
      school_type: string
      school_level: string | null
      suburb: string | null
    }>
  }
  meta?: {
    source: string
    source_url: string
    last_verified: string
    disclaimer: string
    response_ms: number
  }
  error?: string
  message?: string
  zone_code?: string
}

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

export default function Home() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [showJSON, setShowJSON] = useState(false)

  async function lookup(addr: string) {
    if (!addr.trim()) return
    setLoading(true)
    setResult(null)
    setShowJSON(false)
    try {
      const res = await fetch(`/api/lookup?address=${encodeURIComponent(addr)}`)
      const data: LookupResult = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, error: 'NETWORK_ERROR', message: 'Could not reach the API.' })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    lookup(address)
  }

  function handleChip(addr: string) {
    setAddress(addr)
    lookup(addr)
  }

  const style = result?.zone ? getCategoryStyle(result.zone.category) : null

  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-baseline gap-3">
          <span className="text-xl font-bold tracking-tight text-zinc-900">ZoneIQ</span>
          <span className="text-sm text-zinc-400">SEQ Planning Zone API</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Search */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter a Brisbane or Gold Coast address…"
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

          {/* Example chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_ADDRESSES.map((addr) => (
              <button
                key={addr}
                onClick={() => handleChip(addr)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
              >
                {addr}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {result.success && result.zone && result.rules && result.meta ? (
              <>
                {/* Zone header */}
                <div className={`rounded-xl border-2 bg-white p-6 ${style?.border}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${style?.badge}`}
                        >
                          {result.zone.category}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">{result.zone.code}</span>
                      </div>
                      <h1 className="text-2xl font-bold text-zinc-900">{result.zone.name}</h1>
                      <p className="mt-1 text-sm text-zinc-500">
                        {result.query?.address_resolved}
                        {' — '}
                        <span className="capitalize">
                          {result.zone.council === 'goldcoast' ? 'Gold Coast City Council' : 'Brisbane City Council'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-400">
                      <div>{result.meta.response_ms}ms</div>
                      <div>
                        {result.query?.lat.toFixed(4)}, {result.query?.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {/* Dev metrics row */}
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
                      <div className="font-medium">
                        {result.rules.max_site_coverage_pct != null
                          ? `${result.rules.max_site_coverage_pct}%`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-xs">Permeability</span>
                      <div className="font-medium">
                        {result.rules.min_permeability_pct != null
                          ? `${result.rules.min_permeability_pct}% min`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-xs">Min lot (subdivision)</span>
                      <div className="font-medium">
                        {result.rules.subdivision_min_lot_size_m2 != null
                          ? `${result.rules.subdivision_min_lot_size_m2}m²`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Setbacks */}
                  <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    {(['front', 'side', 'rear'] as const).map((side) => {
                      const val = result.rules!.setbacks[`${side}_m`]
                      return (
                        <div key={side}>
                          <span className="text-zinc-400 text-xs capitalize">{side} setback</span>
                          <div className="font-medium">{val != null ? `${val}m` : '—'}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Special permissions */}
                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-500">Secondary dwelling</span>
                      <PermitBadge value={result.rules.secondary_dwelling_permitted} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-500">Short-term accom</span>
                      <PermitBadge value={result.rules.short_term_accom_permitted} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-500">Home business</span>
                      <PermitBadge value={result.rules.home_business_permitted} />
                    </div>
                  </div>
                </div>

                {/* Key rules */}
                {result.key_rules && result.key_rules.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                      Key Rules
                    </h2>
                    <ul className="space-y-2">
                      {result.key_rules.map((rule, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-700">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uses */}
                {result.uses && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Permitted Uses
                      </h2>
                      <ul className="space-y-1">
                        {result.uses.permitted.map((u, i) => (
                          <li key={i} className="text-sm text-emerald-900">
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Requires Permit
                      </h2>
                      <ul className="space-y-1">
                        {result.uses.requires_permit.map((u, i) => (
                          <li key={i} className="text-sm text-amber-900">
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                        Prohibited
                      </h2>
                      <ul className="space-y-1">
                        {result.uses.prohibited.map((u, i) => (
                          <li key={i} className="text-sm text-red-900">
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Overlays */}
                {result.overlays && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                      Overlays
                    </h2>
                    <div className="space-y-4">
                      {/* Flood */}
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-zinc-500 w-28 shrink-0">Flood</span>
                        <div className="flex-1">
                          {result.overlays.flood.has_flood_overlay ? (
                            <>
                              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                                result.overlays.flood.risk_level === 'high' || result.overlays.flood.risk_level === 'medium'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {result.overlays.flood.risk_level === 'high' ? '⚠ Flood Overlay — High Risk'
                                  : result.overlays.flood.risk_level === 'medium' ? '⚠ Flood Overlay — Medium Risk'
                                  : 'Flood Overlay — Low Risk'}
                              </span>
                              {result.overlays.flood.flood_category && (
                                <p className="mt-1 text-xs text-zinc-400">{result.overlays.flood.flood_category}</p>
                              )}
                            </>
                          ) : (
                            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              No Flood Overlay
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Character */}
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-zinc-500 w-28 shrink-0">Character</span>
                        <div className="flex-1">
                          {result.overlays.character.has_character_overlay ? (
                            <>
                              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                                Character Overlay
                              </span>
                              <p className="mt-1 text-xs text-zinc-400">
                                Pre-1947 dwelling character controls may apply
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400">No character overlay</span>
                          )}
                        </div>
                      </div>
                      {/* Schools */}
                      <div className="flex items-start gap-4">
                        <span className="text-sm text-zinc-500 w-28 shrink-0">Schools</span>
                        <div className="flex-1">
                          {result.overlays.schools.length > 0 ? (
                            <ul className="space-y-1.5">
                              {result.overlays.schools.map((s, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                    s.school_type === 'primary'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-violet-100 text-violet-700'
                                  }`}>
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

                {/* Raw JSON toggle */}
                <div>
                  <button
                    onClick={() => setShowJSON((v) => !v)}
                    className="text-xs text-zinc-400 underline hover:text-zinc-600"
                  >
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
              /* Error state */
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <p className="font-semibold text-red-700">{result.error}</p>
                <p className="mt-1 text-sm text-red-600">{result.message}</p>
                {result.zone_code && (
                  <p className="mt-1 text-xs text-red-400">Zone code: {result.zone_code}</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-6 py-6 mt-12">
        <div className="max-w-4xl mx-auto text-xs text-zinc-400 space-y-1">
          <p>
            Data sources:{' '}
            <a
              href="https://cityplan.brisbane.qld.gov.au"
              className="underline hover:text-zinc-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brisbane City Plan 2014
            </a>
            {' · '}
            <a
              href="https://cityplan.goldcoast.qld.gov.au"
              className="underline hover:text-zinc-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gold Coast City Plan 2016
            </a>
            . Indicative only — always verify with the relevant council before making development
            decisions.
          </p>
          <p>Rules may be affected by overlays, neighbourhood plans, or recent amendments.</p>
        </div>
      </footer>
    </div>
  )
}
