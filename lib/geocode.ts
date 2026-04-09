export interface GeocodedAddress {
  address_resolved: string
  lat: number
  lng: number
}

// SEQ bounding box guard — reject results outside QLD
// SEQ bounds: lat -30 to -24, lng 150 to 155
// TODO: widen to national bounds (lat -44 to -10, lng 112 to 154) when national expansion launches
function isWithinSEQ(lat: number, lng: number): boolean {
  return lat >= -30 && lat <= -24 && lng >= 150 && lng <= 155
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_GEOCODING_API_KEY not set')
    return null
  }

  // Appending ", Queensland Australia" improves disambiguation for suburb-level addresses
  const query = `${address}, Queensland Australia`
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null
    }

    const location = data.results[0].geometry.location
    const lat: number = location.lat
    const lng: number = location.lng
    const address_resolved: string = data.results[0].formatted_address

    // SEQ bounding box guard — reject results outside QLD
    if (!isWithinSEQ(lat, lng)) {
      return null // Reject — not in SEQ
    }

    return { address_resolved, lat, lng }
  } catch {
    return null
  }
}
