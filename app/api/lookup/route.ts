import type { NextRequest } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'
import { createServiceClient } from '@/lib/supabase'
import {
  getZoneForPoint,
  getFloodForPoint,
  getCharacterForPoint,
  getSchoolsForPoint,
} from '@/lib/zone-lookup'

// GET handlers are dynamic by default in Next.js 16
export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
  const [zoneResult, floodData, characterData, schoolsData] = await Promise.all([
    getZoneForPoint(lat, lng),
    getFloodForPoint(lat, lng),
    getCharacterForPoint(lat, lng),
    getSchoolsForPoint(lat, lng),
  ])

  if (!zoneResult) {
    logRequest({ addressInput, lat, lng, zoneCode: null, request })
    return Response.json(
      {
        success: false,
        error: 'OUTSIDE_COVERAGE',
        message:
          'Address is outside coverage area. Coverage is currently Brisbane City Council, Gold Coast City Council, and Moreton Bay Regional Council.',
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

  logRequest({ addressInput, lat, lng, zoneCode, request })

  if (dbError || !rules) {
    return Response.json(
      {
        success: false,
        error: 'ZONE_NOT_SEEDED',
        message: 'Zone found but rules not yet available.',
        zone_code: zoneCode,
        council,
      },
      { status: 404, headers: CORS_HEADERS }
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
      },
      meta: {
        source: council === 'goldcoast' ? 'Gold Coast City Plan 2016'
          : council === 'moretonbay' ? 'Moreton Bay Regional Council Planning Scheme'
          : 'Brisbane City Plan 2014',
        source_url: rules.source_url,
        last_verified: rules.last_verified,
        disclaimer:
          'Indicative only. Rules may be affected by overlays, neighbourhood plans, or recent amendments not reflected here. Always verify with the relevant council before making development decisions.',
        response_ms: responseMs,
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
      user_agent: opts.request.headers.get('user-agent'),
      origin: opts.request.headers.get('origin'),
    })
    .then(() => {})
}
