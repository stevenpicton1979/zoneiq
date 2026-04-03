/**
 * One-time script: downloads Brisbane City Plan 2014 Zoning GeoJSON from BCC.
 *
 * Run with: npx tsx scripts/download-zones.ts
 *
 * Saves to: data/brisbane-zones.geojson
 *
 * Strategy:
 * 1. Try BCC ArcGIS REST endpoint with pagination (1000 features per page)
 * 2. If that fails, fall back to BCC Open Data Portal direct download
 */

import fs from 'fs'
import path from 'path'

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'brisbane-zones.geojson')

const ARCGIS_BASE =
  'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Zoning/FeatureServer/0/query'
const FALLBACK_URL =
  'https://data.brisbane.qld.gov.au/explore/dataset/cp14-zoning-overlay/download/?format=geojson'
const PAGE_SIZE = 1000

async function fetchArcGISPage(offset: number): Promise<GeoJSON.FeatureCollection | null> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    f: 'geojson',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  })
  const url = `${ARCGIS_BASE}?${params}`
  console.log(`  Fetching ArcGIS page offset=${offset} ...`)

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
  })
  if (!res.ok) {
    console.error(`  ArcGIS HTTP ${res.status}`)
    return null
  }
  return res.json() as Promise<GeoJSON.FeatureCollection>
}

async function downloadFromArcGIS(): Promise<GeoJSON.FeatureCollection | null> {
  const allFeatures: GeoJSON.Feature[] = []
  let offset = 0

  while (true) {
    const page = await fetchArcGISPage(offset)
    if (!page || !page.features || page.features.length === 0) break

    // Log first feature's property keys so we know the zone code field name
    if (offset === 0 && page.features.length > 0) {
      console.log('  First feature property keys:', Object.keys(page.features[0].properties ?? {}))
    }

    allFeatures.push(...page.features)
    console.log(`  Got ${page.features.length} features (total so far: ${allFeatures.length})`)

    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (allFeatures.length === 0) return null

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  }
}

async function downloadFromFallback(): Promise<GeoJSON.FeatureCollection | null> {
  console.log('Trying fallback URL:', FALLBACK_URL)
  const res = await fetch(FALLBACK_URL, {
    headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
  })
  if (!res.ok) {
    console.error(`Fallback HTTP ${res.status}`)
    return null
  }
  const data = (await res.json()) as GeoJSON.FeatureCollection
  if (data.features && data.features.length > 0) {
    console.log('First feature property keys:', Object.keys(data.features[0].properties ?? {}))
  }
  return data
}

async function main() {
  console.log('=== ZoneIQ: Download Brisbane Zones ===')

  let geojson: GeoJSON.FeatureCollection | null = null

  console.log('Attempting ArcGIS endpoint...')
  geojson = await downloadFromArcGIS()

  if (!geojson) {
    console.log('ArcGIS failed. Trying fallback...')
    geojson = await downloadFromFallback()
  }

  if (!geojson) {
    console.error('Both sources failed. Check network connectivity and URLs.')
    process.exit(1)
  }

  const featureCount = geojson.features.length
  console.log(`\nDownloaded ${featureCount} zone features.`)

  if (featureCount === 0) {
    console.warn('Warning: zero features downloaded. Check the data source.')
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson), 'utf-8')
  console.log(`Saved to ${OUTPUT_PATH}`)
  console.log('\nIMPORTANT: Check the "First feature property keys" output above.')
  console.log('Update zone-lookup.ts ZONE_CODE_KEYS if the correct key is not in the list.')
}

main()
