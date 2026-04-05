import type { NextRequest } from 'next/server'

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
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return Response.json(
      { success: false, error: 'MISSING_PARAMS', message: 'Query params ?lat= and ?lng= are required.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  return Response.json(
    {
      checked: false,
      reason: 'no_free_api',
      message:
        'Queensland EMR/CLR contaminated land data is not available via a free public API. A paid lot-on-plan search is required.',
      search_url: 'https://environment.qld.gov.au/apps/property-searches-about',
      guidance:
        'Search the QLD Government Environmental Management Register and Contaminated Land Register using the lot/plan number for this property.',
    },
    { status: 200, headers: CORS_HEADERS }
  )
}
