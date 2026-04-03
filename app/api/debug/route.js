import fs from 'fs'
import path from 'path'

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'brisbane-zones.geojson')
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    const first = data.features[0]
    return Response.json({ 
      exists: true, 
      size_mb: (content.length / 1024 / 1024).toFixed(1),
      feature_count: data.features.length,
      first_feature_properties: first?.properties,
      first_feature_geometry_type: first?.geometry?.type,
    })
  } catch (e) {
    return Response.json({ 
      exists: false, 
      error: String(e),
    })
  }
}