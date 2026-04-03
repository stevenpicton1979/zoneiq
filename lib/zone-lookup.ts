import { createServiceClient } from '@/lib/supabase'

export async function getZoneForPoint(lat: number, lng: number): Promise<string | null> {
  const db = createServiceClient()

  const { data, error } = await db.rpc('get_zone_for_point', { lat, lng })

  if (error || data == null) return null
  return data as string
}
