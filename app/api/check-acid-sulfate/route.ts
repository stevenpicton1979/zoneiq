import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
}

const BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/GeoscientificInformation/SoilsAndLandResource/MapServer'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

async function queryLayer(layerId: number, bbox: string, outFields: string): Promise<Record<string, string | null> | null> {
  const url =
    `${BASE}/${layerId}/query` +
    `?geometry=${encodeURIComponent(bbox)}` +
    `&geometryType=esriGeometryEnvelope` +
    `&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=${encodeURIComponent(outFields)}` +
    `&returnGeometry=false` +
    `&f=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { features?: Array<{ attributes: Record<string, string | null> }> }
  return data.features?.[0]?.attributes ?? null
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return Response.json(
      { success: false, error: 'MISSING_PARAMS', message: 'Query params ?lat= and ?lng= are required.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { success: false, error: 'INVALID_PARAMS', message: 'lat and lng must be valid numbers.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const d = 0.001
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`

  // Layer 1952: 1:50,000 scale (finer, SEQ-focused)
  const fine = await queryLayer(
    1952,
    bbox,
    'project_code,map_code,map_code_meaning,dominant_entity_meaning,spc_generic_group'
  )

  if (fine) {
    return Response.json(
      {
        has_acid_sulfate_soil: true,
        scale: '1:50000',
        map_code: fine.map_code ?? null,
        probability_class: fine.map_code_meaning ?? fine.dominant_entity_meaning ?? null,
        description: fine.dominant_entity_meaning ?? null,
        source_layer: 'Project polygons acid sulfate soils - 1:50 000 scale',
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }

  // Layer 2052: national scale fallback
  const national = await queryLayer(
    2052,
    bbox,
    'probclass,probclass_def,mapscale,mapclass,confidence_class'
  )

  if (national) {
    return Response.json(
      {
        has_acid_sulfate_soil: true,
        scale: national.mapscale ?? 'national',
        map_code: national.mapclass ?? null,
        probability_class: national.probclass ?? null,
        description: national.probclass_def ?? null,
        source_layer: 'Project polygons acid sulfate soils - National scale',
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }

  return Response.json(
    {
      has_acid_sulfate_soil: false,
      scale: null,
      map_code: null,
      probability_class: null,
      description: null,
      source_layer: null,
    },
    { status: 200, headers: CORS_HEADERS }
  )
}
