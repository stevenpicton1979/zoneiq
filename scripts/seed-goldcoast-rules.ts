/**
 * One-time script: seeds Gold Coast zone rules into Supabase from goldcoast-zone-rules-seed.json.
 *
 * Run with: npm run seed-goldcoast-rules
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (loaded from .env.local automatically)
 *
 * Uses onConflict 'zone_code,council' — composite PK after goldcoast-schema.sql migration.
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local if present
try {
  const dotenvPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(dotenvPath)) {
    const lines = fs.readFileSync(dotenvPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
} catch {
  // ignore
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface ZoneRule {
  zone_code: string
  zone_name: string
  [key: string]: unknown
}

async function main() {
  console.log('=== ZoneIQ: Seed Gold Coast Zone Rules ===')

  const seedPath = path.join(process.cwd(), 'data', 'goldcoast-zone-rules-seed.json')
  const rules: ZoneRule[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

  // Add council = 'goldcoast' to each rule
  const gcRules = rules.map(r => ({ ...r, council: 'goldcoast' }))

  console.log(`Seeding ${gcRules.length} Gold Coast zones...`)

  let successCount = 0
  let failCount = 0

  for (const rule of gcRules) {
    const { error } = await db.from('zone_rules').upsert(rule, { onConflict: 'zone_code,council' })
    if (error) {
      console.error(`  FAIL  ${rule.zone_code}: ${error.message}`)
      failCount++
    } else {
      console.log(`  OK    ${rule.zone_code}`)
      successCount++
    }
  }

  console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`)
  if (failCount > 0) process.exit(1)
}

main()
