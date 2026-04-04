/**
 * Downloads Brisbane flood overlay GeoJSON files from BCC Open Data.
 *
 * Run with: npx tsx scripts/download-flood.ts
 *
 * Saves:
 *   data/brisbane-flood-river.geojson   — Brisbane River flood planning areas
 *   data/brisbane-flood-overland.geojson — Overland flow flood awareness
 */

import fs from 'fs'
import path from 'path'

const DATASETS = [
  {
    name: 'Brisbane River flood planning areas',
    url: 'https://data.brisbane.qld.gov.au/explore/dataset/cp14-flood-overlay-brisbane-river-flood-planning-area/download/?format=geojson',
    fallbackUrl: 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Flood_Overlay/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson',
    outFile: 'data/brisbane-flood-river.geojson',
  },
  {
    name: 'Overland flow flood awareness',
    url: 'https://data.brisbane.qld.gov.au/explore/dataset/flood-awareness-overland-flow/download/?format=geojson',
    fallbackUrl: 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Flood_Awareness_Overland_Flow/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson',
    outFile: 'data/brisbane-flood-overland.geojson',
  },
]

async function downloadDataset(dataset: typeof DATASETS[0]) {
  console.log(`\nDownloading: ${dataset.name}`)
  const outPath = path.join(process.cwd(), dataset.outFile)

  for (const url of [dataset.url, dataset.fallbackUrl]) {
    console.log(`  Trying: ${url}`)
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
      })
      if (!res.ok) {
        console.log(`  HTTP ${res.status} — trying fallback`)
        continue
      }
      const data = await res.json()
      if (!data?.features || data.features.length === 0) {
        console.log(`  Zero features returned — trying fallback`)
        continue
      }
      console.log(`  Downloaded ${data.features.length} features`)
      console.log(`  First feature properties:`, JSON.stringify(data.features[0]?.properties))
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(data), 'utf-8')
      console.log(`  Saved to ${dataset.outFile}`)
      return true
    } catch (err) {
      console.log(`  Error: ${err}`)
    }
  }
  console.error(`  FAILED: could not download ${dataset.name}`)
  return false
}

async function main() {
  console.log('=== ZoneIQ: Download Flood Overlays ===')
  let allOk = true
  for (const ds of DATASETS) {
    const ok = await downloadDataset(ds)
    if (!ok) allOk = false
  }
  if (!allOk) process.exit(1)
}

main()
