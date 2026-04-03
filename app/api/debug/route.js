import fs from 'fs'
import path from 'path'

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'brisbane-zones.geojson')
  try {
    const stat = fs.statSync(filePath)
    return Response.json({ 
      exists: true, 
      size_mb: (stat.size / 1024 / 1024).toFixed(1),
      cwd: process.cwd()
    })
  } catch (e) {
    return Response.json({ 
      exists: false, 
      error: String(e),
      cwd: process.cwd()
    })
  }
}