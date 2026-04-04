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
