/**
 * Downloads QLD state school catchment KML files and converts to GeoJSON.
 *
 * Run with: npx tsx scripts/download-schools.ts
 *
 * Saves:
 *   data/qld-school-catchments-primary.geojson
 *   data/qld-school-catchments-secondary.geojson
 *
 * Source: QLD Government Open Data — Queensland State Schools Geographic Information (2026)
 * KML only — converted via @tmcw/togeojson + @xmldom/xmldom
 */

import fs from 'fs'
import path from 'path'
import { DOMParser } from '@xmldom/xmldom'
import { kml } from '@tmcw/togeojson'

const DATASETS = [
  {
    name: 'Primary school catchments',
    url: 'https://www.data.qld.gov.au/dataset/b01b50fc-b8ab-4c88-bc4a-34d42930fea8/resource/a35846d9-e320-46fc-aea1-b477001ca485/download/primary_catchments_2026.kml',
    outFile: 'data/qld-school-catchments-primary.geojson',
  },
  {
    name: 'Junior secondary school catchments',
    url: 'https://www.data.qld.gov.au/dataset/b01b50fc-b8ab-4c88-bc4a-34d42930fea8/resource/2557305a-5339-4945-819f-551bd917fe39/download/junior_secondary_catchments_2026.kml',
    outFile: 'data/qld-school-catchments-secondary.geojson',
  },
]

// Brisbane bounding box for filtering (state-wide data is large)
const BRISBANE_BOUNDS = { latMin: -28.0, latMax: -27.0, lngMin: 152.6, lngMax: 153.6 }

function isInBrisbane(feature: GeoJSON.Feature): boolean {
  const geom = feature.geometry
  if (!geom) return false
  // Use the first coordinate to check bounds — good enough for catchment centres
  let lng: number, lat: number
  if (geom.type === 'Polygon') {
    const coords = (geom as GeoJSON.Polygon).coordinates[0]?.[0]
    if (!coords) return false
    ;[lng, lat] = coords
  } else if (geom.type === 'MultiPolygon') {
    const coords = (geom as GeoJSON.MultiPolygon).coordinates[0]?.[0]?.[0]
    if (!coords) return false
    ;[lng, lat] = coords
  } else {
    return false
  }
  return (
    lat >= BRISBANE_BOUNDS.latMin && lat <= BRISBANE_BOUNDS.latMax &&
    lng >= BRISBANE_BOUNDS.lngMin && lng <= BRISBANE_BOUNDS.lngMax
  )
}

async function downloadAndConvert(dataset: typeof DATASETS[0]) {
  console.log(`\nDownloading: ${dataset.name}`)
  console.log(`  URL: ${dataset.url}`)

  const res = await fetch(dataset.url, {
    headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const kmlText = await res.text()
  console.log(`  Downloaded ${(kmlText.length / 1024).toFixed(0)} KB of KML`)

  const parser = new DOMParser()
  const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
  const geojson = kml(kmlDoc)

  const totalFeatures = geojson.features.length
  console.log(`  Parsed ${totalFeatures} features from KML`)

  // Log first feature properties
  if (geojson.features[0]) {
    console.log(`  First feature properties:`, JSON.stringify(geojson.features[0].properties))
  }

  // Filter to Brisbane
  const brisFeatures = geojson.features.filter(isInBrisbane)
  console.log(`  Brisbane features: ${brisFeatures.length} of ${totalFeatures}`)

  const output = { type: 'FeatureCollection', features: brisFeatures }
  const outPath = path.join(process.cwd(), dataset.outFile)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output), 'utf-8')
  console.log(`  Saved to ${dataset.outFile}`)
}

async function main() {
  console.log('=== ZoneIQ: Download School Catchments (KML → GeoJSON) ===')
  for (const ds of DATASETS) {
    await downloadAndConvert(ds)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
