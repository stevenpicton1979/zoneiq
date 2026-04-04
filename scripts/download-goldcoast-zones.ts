/**
 * Downloads Gold Coast City Plan zone boundaries from ArcGIS open data.
 *
 * Run with: npm run download-goldcoast-zones
 *
 * Saves to: data/goldcoast-zones.geojson
 * (this file is gitignored — large dataset)
 *
 * Logs first feature's complete properties so zone code field name can be confirmed.
 */

import fs from 'fs'
import path from 'path'

const OUT_FILE = path.join(process.cwd(), 'data', 'goldcoast-zones.geojson')
const PAGE_SIZE = 2000

const URLS = [
  // Primary: ArcGIS FeatureServer with pagination support
  (offset: number) =>
    `https://services5.arcgis.com/vUMpDaRKrXuuNNKl/arcgis/rest/services/City_Plan_Zones/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}`,
  // Fallback 1: Open Data portal
  () => `https://data-goldcoast.opendata.arcgis.com/datasets/f76678578a3945f994196b99e2e89fbb_0.geojson`,
  // Fallback 2: OpenData direct
  () => `https://opendata.arcgis.com/datasets/f76678578a3945f994196b99e2e89fbb_0.geojson`,
]

async function fetchPage(url: string): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
    })
    if (!res.ok) {
      console.log(`  HTTP ${res.status} from ${url.slice(0, 80)}...`)
      return null
    }
    return await res.json() as GeoJSON.FeatureCollection
  } catch (err) {
    console.log(`  Error: ${err}`)
    return null
  }
}

async function downloadPaginated(): Promise<GeoJSON.Feature[] | null> {
  const all: GeoJSON.Feature[] = []
  let offset = 0

  console.log('Trying paginated ArcGIS endpoint...')
  while (true) {
    const url = URLS[0](offset)
    console.log(`  Page offset=${offset}...`)
    const page = await fetchPage(url)
    if (!page?.features?.length) break

    if (offset === 0) {
      console.log(`\n=== FIRST FEATURE PROPERTIES (ArcGIS) ===`)
      console.log(JSON.stringify(page.features[0]?.properties, null, 2))
      console.log(`Geometry type: ${page.features[0]?.geometry?.type}`)
      console.log(`==========================================\n`)
    }

    all.push(...page.features)
    console.log(`  Got ${page.features.length} features (total: ${all.length})`)
    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return all.length > 0 ? all : null
}

async function downloadFallback(urlFn: () => string, label: string): Promise<GeoJSON.Feature[] | null> {
  console.log(`Trying ${label}...`)
  const page = await fetchPage(urlFn())
  if (!page?.features?.length) return null

  console.log(`\n=== FIRST FEATURE PROPERTIES (${label}) ===`)
  console.log(JSON.stringify(page.features[0]?.properties, null, 2))
  console.log(`Geometry type: ${page.features[0]?.geometry?.type}`)
  console.log(`===========================================\n`)
  console.log(`  Got ${page.features.length} features`)
  return page.features
}

async function main() {
  console.log('=== ZoneIQ: Download Gold Coast Zones ===')

  let features = await downloadPaginated()

  if (!features) {
    features = await downloadFallback(URLS[1] as () => string, 'Open Data portal')
  }
  if (!features) {
    features = await downloadFallback(URLS[2] as () => string, 'OpenData direct')
  }
  if (!features) {
    console.error('All download attempts failed.')
    process.exit(1)
  }

  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(geojson), 'utf-8')

  const sizeMb = (JSON.stringify(geojson).length / 1024 / 1024).toFixed(1)
  console.log(`\nSaved ${features.length} features to data/goldcoast-zones.geojson (${sizeMb} MB)`)

  // Summary of unique zone code values found
  const zoneCodes = new Set<string>()
  const ZONE_KEY_CANDIDATES = ['zone_code', 'ZONE_CODE', 'ZoneCode', 'zone', 'ZONE', 'ZoneClass',
    'ZoneType', 'type', 'TYPE', 'Type', 'ZN_CODE', 'zn_code', 'ZONING', 'zoning']
  let detectedKey: string | null = null

  for (const key of ZONE_KEY_CANDIDATES) {
    const sample = features[0]?.properties?.[key]
    if (sample != null) {
      detectedKey = key
      break
    }
  }

  if (detectedKey) {
    for (const f of features) {
      const val = f.properties?.[detectedKey]
      if (val) zoneCodes.add(String(val))
    }
    console.log(`\nDetected zone code field: "${detectedKey}"`)
    console.log(`Unique zone code values (${zoneCodes.size}):`)
    console.log([...zoneCodes].sort().join(', '))
  } else {
    console.log('\nCould not auto-detect zone code field — check properties above.')
    console.log('All property keys:', Object.keys(features[0]?.properties ?? {}))
  }
}

main().catch(err => { console.error(err); process.exit(1) })
