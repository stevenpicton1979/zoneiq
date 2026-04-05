async function main() {
  const url = 'https://data.gov.au/geoserver/ipswich-plnning-scheme-zones/wfs?request=GetFeature&typeName=ckan_ef6392c6_0649_4b65_b0f1_efcfe75737cb&outputFormat=json&maxFeatures=200'
  const res = await fetch(url)
  const data = await res.json()
  const seen = {}
  for (const f of data.features) {
    const k = f.properties.CODE
    if (!seen[k]) seen[k] = f.properties.NAME
  }
  console.log('Unique zone codes:')
  for (const [code, name] of Object.entries(seen).sort()) {
    console.log(`  ${code}: ${name}`)
  }
  console.log('\nTotal features:', data.features.length)
}
main().catch(console.error)
