/**
 * Downloads Brisbane Dwelling House Character Overlay GeoJSON from BCC Open Data.
 *
 * Run with: npx tsx scripts/download-character.ts
 *
 * Saves: data/brisbane-character-overlay.geojson
 */

import fs from 'fs'
import path from 'path'

const URL_PRIMARY = 'https://data.brisbane.qld.gov.au/explore/dataset/cp14-dwelling-house-character-overlay/download/?format=geojson'
const URL_FALLBACK = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/City_Plan_2014_Dwelling_House_Character_Overlay/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson'
const OUT_FILE = 'data/brisbane-character-overlay.geojson'

async function main() {
  console.log('=== ZoneIQ: Download Character Overlay ===')

  const outPath = path.join(process.cwd(), OUT_FILE)

  for (const url of [URL_PRIMARY, URL_FALLBACK]) {
    console.log(`Trying: ${url}`)
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
      })
      if (!res.ok) { console.log(`HTTP ${res.status}`); continue }
      const data = await res.json()
      if (!data?.features || data.features.length === 0) { console.log('Zero features'); continue }

      console.log(`Downloaded ${data.features.length} features`)
      console.log('First feature properties:', JSON.stringify(data.features[0]?.properties))

      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(data), 'utf-8')
      console.log(`Saved to ${OUT_FILE}`)
      return
    } catch (err) {
      console.log(`Error: ${err}`)
    }
  }

  console.error('FAILED: could not download character overlay')
  process.exit(1)
}

main()
