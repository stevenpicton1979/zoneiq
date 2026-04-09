import type { NextRequest } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'
import { createServiceClient } from '@/lib/supabase'
import {
  getZoneForPoint,
  getFloodForPoint,
  getCharacterForPoint,
  getSchoolsForPoint,
  getBushfireForPoint,
  getHeritageForPoint,
  getNoiseForPoint,
} from '@/lib/zone-lookup'
import { validateApiKey } from '@/lib/auth'
import type { ApiKeyRecord } from '@/lib/auth'

// GET handlers are dynamic by default in Next.js 16
export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const startMs = Date.now()

  const { searchParams } = request.nextUrl
  const addressInput = searchParams.get('address')?.trim()

  if (!addressInput) {
    return Response.json(
      { success: false, error: 'MISSING_ADDRESS', message: 'Query param ?address= is required.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // Optional API key auth — unauthenticated requests still work (test UI, free tier)
  // RapidAPI requests carry X-RapidAPI-Proxy-Secret; direct requests use X-Api-Key.
  const apiKey = request.headers.get('x-api-key') || searchParams.get('api_key')
  const rapidApiProxySecret = request.headers.get('x-rapidapi-proxy-secret')
  const rapidApiSubscriptionPlan = request.headers.get('x-rapidapi-subscription-plan')

  let keyData: ApiKeyRecord | null = null

  if (apiKey || rapidApiProxySecret) {
    const authResult = await validateApiKey(apiKey, {
      proxySecret: rapidApiProxySecret,
      subscriptionPlan: rapidApiSubscriptionPlan,
    })
    if (!authResult.valid) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_KEY',
          message: authResult.error,
          ...(authResult.upgrade_url && { upgrade_url: authResult.upgrade_url }),
        },
        { status: 401, headers: CORS_HEADERS }
      )
    }
    keyData = authResult.keyData
  }

  // Geocode
  const geocoded = await geocodeAddress(addressInput)

  if (!geocoded) {
    return Response.json(
      {
        success: false,
        error: 'ADDRESS_NOT_FOUND',
        message: 'Could not geocode address. Try including suburb and state.',
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { lat, lng, address_resolved } = geocoded

  // Run all spatial lookups in parallel
  const [zoneResult, floodData, characterData, schoolsData, bushfireData, heritageData, noiseData] = await Promise.all([
    getZoneForPoint(lat, lng),
    getFloodForPoint(lat, lng),
    getCharacterForPoint(lat, lng),
    getSchoolsForPoint(lat, lng),
    getBushfireForPoint(lat, lng),
    getHeritageForPoint(lat, lng),
    getNoiseForPoint(lat, lng),
  ])

  if (!zoneResult) {
    logRequest({ addressInput, lat, lng, zoneCode: null, keyId: keyData?.id ?? null, source: keyData?.source ?? 'direct', request })
    return Response.json(
      {
        success: false,
        error: 'OUTSIDE_COVERAGE',
        message:
          'Address is outside coverage area. Coverage is currently Brisbane City Council, Gold Coast City Council, Moreton Bay Regional Council, and Sunshine Coast Regional Council.',
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { zone_code: zoneCode, council } = zoneResult

  // Zone rules from DB
  const db = createServiceClient()
  const { data: rules, error: dbError } = await db
    .from('zone_rules')
    .select('*')
    .eq('zone_code', zoneCode)
    .eq('council', council)
    .single()

  logRequest({ addressInput, lat, lng, zoneCode, keyId: keyData?.id ?? null, source: keyData?.source ?? 'direct', request })

  if (dbError || !rules) {
    return Response.json(
      {
        success: true,
        query: {
          address_input: addressInput,
          address_resolved,
          lat,
          lng,
        },
        zone: { code: zoneCode, name: null, category: null, council },
        rules: null,
        overlays: {
          flood: floodData,
          character: characterData,
          schools: schoolsData,
          bushfire: bushfireData,
          heritage: heritageData,
          noise: noiseData,
        },
        meta: {
          partial: true,
          reason: 'zone_not_seeded',
          disclaimer:
            'Zone rules not yet available for this zone. Overlay data (flood, noise, bushfire, heritage etc.) is returned where available.',
          response_ms: Date.now() - startMs,
          auth: {
            authenticated: keyData !== null,
            plan: keyData?.plan ?? 'unauthenticated',
            ...(keyData === null && {
              note: 'Unauthenticated requests are rate limited. Get a free API key at zoneiq.com.au',
            }),
          },
        },
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }

  const responseMs = Date.now() - startMs

  return Response.json(
    {
      success: true,
      query: {
        address_input: addressInput,
        address_resolved,
        lat,
        lng,
      },
      zone: {
        code: rules.zone_code,
        name: rules.zone_name,
        category: rules.zone_category,
        council,
      },
      rules: {
        max_height_m: rules.max_height_m,
        max_storeys: rules.max_storeys,
        max_site_coverage_pct: rules.max_site_coverage_pct,
        min_permeability_pct: rules.min_permeability_pct,
        setbacks: {
          front_m: rules.front_setback_m,
          side_m: rules.side_setback_m,
          rear_m: rules.rear_setback_m,
        },
        secondary_dwelling_permitted: rules.secondary_dwelling_permitted,
        short_term_accom_permitted: rules.short_term_accom_permitted,
        home_business_permitted: rules.home_business_permitted,
        subdivision_min_lot_size_m2: rules.subdivision_min_lot_size_m2,
      },
      key_rules: rules.key_rules,
      uses: {
        permitted: rules.permitted_uses,
        requires_permit: rules.requires_permit_uses,
        prohibited: rules.prohibited_uses,
      },
      overlays: {
        flood: floodData,
        character: characterData,
        schools: schoolsData,
        bushfire: bushfireData,
        heritage: heritageData,
        noise: noiseData,
      },
      meta: {
        source: council === 'goldcoast' ? 'Gold Coast City Plan 2016'
          : council === 'moretonbay' ? 'Moreton Bay Regional Council Planning Scheme'
          : council === 'sunshinecoast' ? 'Sunshine Coast Planning Scheme 2014'
          : 'Brisbane City Plan 2014',
        source_url: rules.source_url,
        last_verified: rules.last_verified,
        disclaimer:
          'Indicative only. Rules may be affected by overlays, neighbourhood plans, or recent amendments not reflected here. Always verify with the relevant council before making development decisions.',
        response_ms: responseMs,
        auth: {
          authenticated: keyData !== null,
          plan: keyData?.plan ?? 'unauthenticated',
          ...(keyData === null && {
            note: 'Unauthenticated requests are rate limited. Get a free API key at zoneiq.com.au',
          }),
        },
      },
    },
    { status: 200, headers: CORS_HEADERS }
  )
}

// Fire-and-forget — must not throw or await in the request path
function logRequest(opts: {
  addressInput: string
  lat: number | null
  lng: number | null
  zoneCode: string | null
  keyId: string | null
  source: string
  request: NextRequest
}) {
  const db = createServiceClient()
  void db
    .from('lookup_log')
    .insert({
      address_input: opts.addressInput,
      lat: opts.lat,
      lng: opts.lng,
      zone_code: opts.zoneCode,
      source: opts.source,
      user_agent: opts.request.headers.get('user-agent'),
      origin: opts.request.headers.get('origin'),
    })
    .then(() => {})
}
