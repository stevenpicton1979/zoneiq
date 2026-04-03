export interface GeocodedAddress {
  address_resolved: string
  lat: number
  lng: number
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const encoded = encodeURIComponent(address)
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=au`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null

  const result = data[0]
  return {
    address_resolved: result.display_name as string,
    lat: parseFloat(result.lat as string),
    lng: parseFloat(result.lon as string),
  }
}
