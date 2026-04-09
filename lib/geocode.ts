export interface GeocodedAddress {
  address_resolved: string
  lat: number
  lng: number
}

// Detect which state (if any) is mentioned in the address string
function detectState(address: string): 'QLD' | 'NSW' | 'VIC' | null {
  const u = address.toUpperCase()
  if (/\bNSW\b/.test(u) || /\bNEW SOUTH WALES\b/.test(u)) return 'NSW'
  if (/\bVIC\b/.test(u) || /\bVICTORIA\b/.test(u)) return 'VIC'
  if (/\bQLD\b/.test(u) || /\bQUEENSLAND\b/.test(u)) return 'QLD'
  return null
}

// State suffix to append to geocoding queries
function buildQuery(address: string, state: 'QLD' | 'NSW' | 'VIC' | null): string {
  if (state === 'NSW') return `${address}, New South Wales Australia`
  if (state === 'VIC') return `${address}, Victoria Australia`
  if (state === 'QLD') return `${address}, Queensland Australia`
  return `${address}, Australia`
}

// Bounding box guards — accept SEQ, NSW or VIC coordinates
// SEQ: lat -30 to -24, lng 150 to 155
// NSW: lat -38 to -28, lng 140 to 154
// VIC: lat -39.5 to -33.5, lng 140.5 to 150.5 (added Sprint 22)
function isWithinCoverage(lat: number, lng: number): boolean {
  const inSEQ = lat >= -30 && lat <= -24 && lng >= 150 && lng <= 155
  const inNSW = lat >= -38 && lat <= -28 && lng >= 140 && lng <= 154
  return inSEQ || inNSW
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_GEOCODING_API_KEY not set')
    return null
  }

  const state = detectState(address)
  const query = buildQuery(address, state)
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

    // Bounding box guard — reject results outside coverage areas
    if (!isWithinCoverage(lat, lng)) {
      return null
    }

    return { address_resolved, lat, lng }
  } catch {
    return null
  }
}
