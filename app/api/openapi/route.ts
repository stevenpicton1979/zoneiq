import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-static'

export async function GET() {
  const spec = readFileSync(join(process.cwd(), 'public', 'rapidapi-openapi.json'), 'utf8')
  return new Response(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
