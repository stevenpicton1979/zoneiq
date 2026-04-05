async function main() {
  const url = 'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/cp14-airport-environs-overlay-australian-noise-exposure-forecast-anef/records?limit=3'
  const res = await fetch(url)
  const data = await res.json()
  const rec = data.results?.[0]
  if (rec) {
    console.log('Record keys:', Object.keys(rec))
    console.log('Full record:', JSON.stringify(rec, null, 2).slice(0, 2000))
  }
}
main().catch(console.error)
