import fs from 'fs'
import path from 'path'
import * as turf from '@turf/turf'

// Property names to try for zone code, in order of preference
// BCC ArcGIS uses uppercase; Open Data Portal uses lowercase
const ZONE_CODE_KEYS = ['zone_code', 'ZONE_CODE', 'ZoneCode', 'zone', 'Zone', 'ZONE']

const BRISBANE_BOUNDS = {
  latMin: -28.0,
  latMax: -27.0,
  lngMin: 152.6,
  lngMax: 153.6,
}

interface ZonesData {
  type: string
  features: GeoJSON.Feature[]
}

// Module-level cache — loaded once per process lifetime
let zonesCache: ZonesData | null = null

function loadZones(): ZonesData | null {
  if (zonesCache) return zonesCache

  const filePath = path.join(process.cwd(), 'data', 'brisbane-zones.geojson')
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content) as ZonesData
    zonesCache = data
    return data
  } catch {
    console.error('zone-lookup: could not read brisbane-zones.geojson — run scripts/download-zones.ts')
    return null
  }
}

function extractZoneCode(properties: Record<string, unknown> | null): string | null {
  if (!properties) return null
  for (const key of ZONE_CODE_KEYS) {
    if (properties[key] != null) return String(properties[key])
  }
  return null
}

export function isWithinBrisbaneBounds(lat: number, lng: number): boolean {
  return (
    lat >= BRISBANE_BOUNDS.latMin &&
    lat <= BRISBANE_BOUNDS.latMax &&
    lng >= BRISBANE_BOUNDS.lngMin &&
    lng <= BRISBANE_BOUNDS.lngMax
  )
}

export function getZoneForPoint(lat: number, lng: number): string | null {
  const zones = loadZones()
  if (!zones || zones.features.length === 0) return null

  const point = turf.point([lng, lat])

  for (const feature of zones.features) {
    if (!feature.geometry) continue
    try {
      if (turf.booleanPointInPolygon(point, feature as turf.Feature<turf.Polygon | turf.MultiPolygon>)) {
        return extractZoneCode(feature.properties as Record<string, unknown>)
      }
    } catch {
      // skip malformed geometry
    }
  }

  return null
}
