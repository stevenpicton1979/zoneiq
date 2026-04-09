import { createServiceClient } from '@/lib/supabase'

export async function getZoneForPoint(lat: number, lng: number): Promise<{ zone_code: string; council: string } | null> {
  const db = createServiceClient()
  const { data, error } = await db.rpc('get_zone_for_point', { lat, lng })
  if (error || data == null) return null
  return data as { zone_code: string; council: string }
}

export async function getFloodForPoint(lat: number, lng: number): Promise<object> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_flood_for_point', { lat, lng })
  return (data as object) ?? { has_flood_overlay: false, risk_level: 'none' }
}

export async function getCharacterForPoint(lat: number, lng: number): Promise<object> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_character_for_point', { lat, lng })
  return (data as object) ?? { has_character_overlay: false }
}

export async function getSchoolsForPoint(lat: number, lng: number): Promise<object[]> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_schools_for_point', { lat, lng })
  return (data as object[]) ?? []
}

export async function getBushfireForPoint(lat: number, lng: number): Promise<object> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_bushfire_for_point', { lat, lng })
  return (data as object) ?? { has_bushfire_overlay: false, intensity_class: null, lga: null }
}

export async function getHeritageForPoint(lat: number, lng: number): Promise<object> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_heritage_for_point', { lat, lng })
  return (data as object) ?? { is_heritage: false, heritage_type: null, heritage_name: null, place_id: null }
}

export async function getNoiseForPoint(lat: number, lng: number): Promise<object> {
  const db = createServiceClient()
  const { data } = await db.rpc('get_noise_for_point', { lat, lng })
  return (data as object) ?? { has_noise_overlay: false, anef_contour: null, airport: null }
}

// Sprint 16 — QFAO live fallback for QLD addresses outside local flood overlay coverage
// Only called when getFloodForPoint returns no overlay AND council is QLD
// Source: Queensland Floodplain Assessment Overlay (QFAO) — ArcGIS FeatureServer
// DO NOT call for NSW or VIC addresses — they have local flood data
//
// NOTE: The original backlog URL (services8.arcgis.com/g9mppFwSsmIw9E0Z) returns "Invalid URL"
// and no working public FeatureServer exists (only a VectorTileServer which is not queryable).
// This function is wired and ready — update QFAO_URL when QRA publishes a queryable endpoint.
export async function getQFAOForPoint(lat: number, lng: number): Promise<object | null> {
  const QFAO_URL = 'https://services8.arcgis.com/g9mppFwSsmIw9E0Z/arcgis/rest/services/Queensland_floodplain_assessment_overlay/FeatureServer/0/query'
  const point = `{"x":${lng},"y":${lat},"spatialReference":{"wkid":4326}}`
  const url = `${QFAO_URL}?geometry=${encodeURIComponent(point)}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outFields=SUB_NAME,SUB_NUMBER,QRA_SUPPLY&f=json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ZoneIQ/1.0 (zoneiq.com.au)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error || !data.features || data.features.length === 0) return null

    const attrs = data.features[0].attributes
    return {
      has_flood_overlay: true,
      flood_category: 'FLOOD_RISK_POSSIBLE',
      overlay_type: 'QFAO_statewide',
      risk_level: attrs.SUB_NAME || attrs.QRA_SUPPLY || 'Floodplain Assessment Overlay',
      qra_supply: attrs.QRA_SUPPLY || null,
      disclaimer: 'This flood assessment is based on the Queensland state-level floodplain overlay and is not property-specific. Contact your local council for detailed flood mapping.',
    }
  } catch {
    return null
  }
}
