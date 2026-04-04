/**
 * Downloads Sunshine Coast Regional Council planning zone boundaries.
 *
 * Run with: npm run download-sunshinecoast-zones
 *
 * Saves to: data/sunshinecoast-zones.geojson
 * (this file is gitignored — large dataset, ~106K features)
 *
 * Source: SCC ArcGIS FeatureServer — Layer 5 (Zones)
 * https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/PlanningScheme_Zoning_SCC/FeatureServer/5
 *
 * CRS: WGS84 (EPSG:4326) — ArcGIS auto-converts when outSR=4326&f=geojson is requested.
 * No ST_Transform needed in import.
 *
 * Zone code field: LABEL (full strings, e.g. "Low Density Residential Zone")
 */

import fs from 'fs'
import path from 'path'

const OUT_FILE = path.join(process.cwd(), 'data', 'sunshinecoast-zones.geojson')
const PAGE_SIZE = 2000

const ARCGIS_URL = (offset: number) =>
  `https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/PlanningScheme_Zoning_SCC/FeatureServer/5/query?where=1%3D1&outFields=LABEL,HEADING,DESCRIPT&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}`

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

async function main() {
  console.log('=== ZoneIQ: Download Sunshine Coast Zones ===')

  const all: GeoJSON.Feature[] = []
  let offset = 0

  while (true) {
    console.log(`  Page offset=${offset}...`)
    const page = await fetchPage(ARCGIS_URL(offset))
    if (!page?.features?.length) {
      console.log('  No more features.')
      break
    }

    if (offset === 0) {
      console.log(`\n=== FIRST FEATURE PROPERTIES ===`)
      console.log(JSON.stringify(page.features[0]?.properties, null, 2))
      const geom = page.features[0]?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null
      const firstCoord = geom?.type === 'Polygon'
        ? (geom as GeoJSON.Polygon).coordinates[0]?.[0]
        : (geom as GeoJSON.MultiPolygon)?.coordinates[0]?.[0]?.[0]
      console.log(`Geometry type: ${geom?.type}`)
      console.log(`First coordinate: ${JSON.stringify(firstCoord)} (should be ~[153, -26] for WGS84)`)
      console.log(`================================\n`)
    }

    all.push(...page.features)
    console.log(`  Got ${page.features.length} features (total: ${all.length})`)
    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (!all.length) {
    console.error('No features downloaded.')
    process.exit(1)
  }

  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: all }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(geojson), 'utf-8')

  const sizeMb = (JSON.stringify(geojson).length / 1024 / 1024).toFixed(1)
  console.log(`\nSaved ${all.length} features to data/sunshinecoast-zones.geojson (${sizeMb} MB)`)

  // Unique LABEL values
  const labels = new Set<string>()
  for (const f of all) {
    const val = f.properties?.['LABEL']
    if (val) labels.add(String(val))
  }
  console.log(`\nUnique LABEL values (${labels.size}):`)
  console.log([...labels].sort().join('\n'))
}

main().catch(err => { console.error(err); process.exit(1) })
