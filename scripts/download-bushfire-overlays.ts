/**
 * Downloads Queensland Bushfire Prone Area (BPA) data for SEQ from QFES via ArcGIS Online.
 *
 * Run with: npm run download-bushfire-overlays
 *
 * Saves to: data/bushfire-overlays.geojson
 * (this file is gitignored — large dataset)
 *
 * Source: QFES Bushfire Prone Area (BPA) Dynamic Limited
 * https://utility.arcgis.com/usrsvcs/servers/8ac1ba8eccee472fbd0e7a57bf3ad320/rest/services/Hosted/BPA/FeatureServer/0
 *
 * No authentication required. Creative Commons Attribution 4.0.
 *
 * CRS: WGS84 (EPSG:4326) — ArcGIS auto-converts via outSR=4326&f=geojson.
 * No ST_Transform needed in import.
 *
 * Field: class — intensity category strings, e.g. "Very High Potential Bushfire Intensity"
 * Field: lga   — LGA name (non-standard, e.g. "GoldCoast", "SunshineC", "ScenicRim_E")
 *
 * LGAs included: all 13 SEQ LGAs (~134,338 features, ~68 pages at 2,000/page)
 *
 * Note: Uses streaming GeoJSON write to avoid V8 string length limits on large datasets.
 */

import fs from 'fs'
import path from 'path'

const OUT_FILE = path.join(process.cwd(), 'data', 'bushfire-overlays.geojson')
const PAGE_SIZE = 2000
const MAX_RETRIES = 3

const SEQ_LGAS = [
  'Brisbane', 'GoldCoast', 'Ipswich', 'Lockyer', 'Logan',
  'Moreton', 'Noosa', 'Redland', 'ScenicRim_E', 'ScenicRim_W',
  'Somerset_N', 'Somerset_S', 'SunshineC',
]
const WHERE = `lga IN (${SEQ_LGAS.map(l => `'${l}'`).join(',')})`
const BASE = 'https://utility.arcgis.com/usrsvcs/servers/8ac1ba8eccee472fbd0e7a57bf3ad320/rest/services/Hosted/BPA/FeatureServer/0/query'

const ARCGIS_URL = (offset: number) =>
  `${BASE}?where=${encodeURIComponent(WHERE)}&outFields=class,lga&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`

async function fetchPageWithRetry(url: string): Promise<GeoJSON.FeatureCollection | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZoneIQ/0.1 (zoneiq.com.au)' },
      })
      if (res.status === 504 || res.status === 503 || res.status === 502) {
        console.log(`  HTTP ${res.status} — attempt ${attempt}/${MAX_RETRIES}, retrying in 5s...`)
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      if (!res.ok) {
        console.log(`  HTTP ${res.status} — giving up on this page`)
        return null
      }
      return await res.json() as GeoJSON.FeatureCollection
    } catch (err) {
      console.log(`  Network error (attempt ${attempt}): ${err}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 3000))
    }
  }
  return null
}

async function main() {
  console.log('=== ZoneIQ: Download Bushfire Prone Area (SEQ) ===')
  console.log(`WHERE: ${WHERE}`)

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })

  // Stream-write GeoJSON to avoid V8 string length limits on large datasets
  const writeStream = fs.createWriteStream(OUT_FILE, { encoding: 'utf-8' })
  writeStream.write('{"type":"FeatureCollection","features":[')

  let totalFeatures = 0
  let firstFeature = true
  let offset = 0

  // Track unique values for logging
  const classes = new Set<string>()
  const lgas = new Set<string>()

  while (true) {
    console.log(`  Page offset=${offset}...`)
    const page = await fetchPageWithRetry(ARCGIS_URL(offset))

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
      console.log(`First coordinate: ${JSON.stringify(firstCoord)} (should be ~[153, -27] for SEQ WGS84)`)
      console.log(`================================\n`)
    }

    for (const feature of page.features) {
      if (!firstFeature) writeStream.write(',')
      writeStream.write(JSON.stringify(feature))
      firstFeature = false

      const c = feature.properties?.['class']
      const l = feature.properties?.['lga']
      if (c) classes.add(String(c))
      if (l) lgas.add(String(l))
    }

    totalFeatures += page.features.length
    console.log(`  Got ${page.features.length} features (total: ${totalFeatures})`)

    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  writeStream.write(']}')
  await new Promise<void>((resolve, reject) => {
    writeStream.end((err?: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })

  if (!totalFeatures) {
    console.error('No features downloaded.')
    process.exit(1)
  }

  const stat = fs.statSync(OUT_FILE)
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1)
  console.log(`\nSaved ${totalFeatures} features to data/bushfire-overlays.geojson (${sizeMb} MB)`)

  console.log(`\nUnique class values (${classes.size}):`)
  console.log([...classes].sort().join('\n'))
  console.log(`\nUnique LGA values (${lgas.size}):`)
  console.log([...lgas].sort().join('\n'))
}

main().catch(err => { console.error(err); process.exit(1) })
