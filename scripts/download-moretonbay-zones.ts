/**
 * Downloads Moreton Bay Regional Council planning zone boundaries.
 *
 * Run with: npm run download-moretonbay-zones
 *
 * Saves to: data/moretonbay-zones.geojson
 * (this file is gitignored — large dataset)
 *
 * Logs first feature's complete properties and first coordinate pair so
 * coordinate system (EPSG:3857 vs 4326) can be confirmed before import.
 *
 * Sources:
 *   Primary:  MBRC Datahub bulk GeoJSON download
 *   Fallback: ArcGIS FeatureServer paginated (1,000 per page, ~14 pages)
 */

import fs from 'fs'
import path from 'path'

const OUT_FILE = path.join(process.cwd(), 'data', 'moretonbay-zones.geojson')
const PAGE_SIZE = 1000

const ARCGIS_URL = (offset: number) =>
  `https://services-ap1.arcgis.com/152ojN3Ts9H3cdtl/arcgis/rest/services/ZM_Zones_Dissolved_WebMercator_OpenData/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}`

const DATAHUB_URL =
  'https://datahub.moretonbay.qld.gov.au/api/download/v1/items/9e142c14e15a43cfac2cc5bae953ea62/geojson?layers=0'

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

  console.log('Trying paginated ArcGIS FeatureServer...')
  while (true) {
    console.log(`  Page offset=${offset}...`)
    const page = await fetchPage(ARCGIS_URL(offset))
    if (!page?.features?.length) break

    if (offset === 0) {
      console.log(`\n=== FIRST FEATURE PROPERTIES (ArcGIS) ===`)
      console.log(JSON.stringify(page.features[0]?.properties, null, 2))
      console.log(`Geometry type: ${page.features[0]?.geometry?.type}`)
      const geom = page.features[0]?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null
      const firstCoord = geom?.type === 'Polygon'
        ? (geom as GeoJSON.Polygon).coordinates[0]?.[0]
        : (geom as GeoJSON.MultiPolygon)?.coordinates[0]?.[0]?.[0]
      console.log(`First coordinate: ${JSON.stringify(firstCoord)} (>180 = Web Mercator metres)`)
      console.log(`==========================================\n`)
    }

    all.push(...page.features)
    console.log(`  Got ${page.features.length} features (total: ${all.length})`)
    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return all.length > 0 ? all : null
}

async function downloadBulk(): Promise<GeoJSON.Feature[] | null> {
  console.log('Trying MBRC Datahub bulk GeoJSON...')
  const page = await fetchPage(DATAHUB_URL)
  if (!page?.features?.length) return null

  console.log(`\n=== FIRST FEATURE PROPERTIES (Datahub) ===`)
  console.log(JSON.stringify(page.features[0]?.properties, null, 2))
  console.log(`Geometry type: ${page.features[0]?.geometry?.type}`)
  const geom = page.features[0]?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null
  const firstCoord = geom?.type === 'Polygon'
    ? (geom as GeoJSON.Polygon).coordinates[0]?.[0]
    : (geom as GeoJSON.MultiPolygon)?.coordinates[0]?.[0]?.[0]
  console.log(`First coordinate: ${JSON.stringify(firstCoord)} (>180 = Web Mercator metres)`)
  console.log(`===========================================\n`)
  console.log(`  Got ${page.features.length} features`)
  return page.features
}

async function main() {
  console.log('=== ZoneIQ: Download Moreton Bay Zones ===')

  let features = await downloadPaginated()

  if (!features) {
    features = await downloadBulk()
  }
  if (!features) {
    console.error('All download attempts failed.')
    process.exit(1)
  }

  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(geojson), 'utf-8')

  const sizeMb = (JSON.stringify(geojson).length / 1024 / 1024).toFixed(1)
  console.log(`\nSaved ${features.length} features to data/moretonbay-zones.geojson (${sizeMb} MB)`)

  // Unique zone values
  const zoneCodes = new Set<string>()
  for (const f of features) {
    const val = f.properties?.['LVL1_ZONE']
    if (val) zoneCodes.add(String(val))
  }
  console.log(`\nUnique LVL1_ZONE values (${zoneCodes.size}):`)
  console.log([...zoneCodes].sort().join('\n'))
}

main().catch(err => { console.error(err); process.exit(1) })
