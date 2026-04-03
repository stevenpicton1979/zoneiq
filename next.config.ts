import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure the data directory (including brisbane-zones.geojson) is
  // available to serverless functions at runtime on Vercel.
  // Next.js includes files referenced by fs.readFileSync when they are
  // within the project root and the function's outputFileTracingIncludes
  // pattern matches them.
  outputFileTracingIncludes: {
    '/api/lookup': ['./data/**'],
  },
}

export default nextConfig
