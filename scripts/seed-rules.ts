/**
 * One-time script: seeds zone rules into Supabase from zone-rules-seed.json.
 *
 * Run with: npx tsx scripts/seed-rules.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (load from .env.local automatically via dotenv if available)
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local if present (for local script execution)
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
  console.log('=== ZoneIQ: Seed Zone Rules ===')

  const seedPath = path.join(process.cwd(), 'data', 'zone-rules-seed.json')
  const rules: ZoneRule[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

  console.log(`Seeding ${rules.length} zones...`)

  let successCount = 0
  let failCount = 0

  for (const rule of rules) {
    const { error } = await db.from('zone_rules').upsert(rule, { onConflict: 'zone_code' })
    if (error) {
      console.error(`  FAIL  ${rule.zone_code} (${rule.zone_name}): ${error.message}`)
      failCount++
    } else {
      console.log(`  OK    ${rule.zone_code} — ${rule.zone_name}`)
      successCount++
    }
  }

  console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`)
  if (failCount > 0) process.exit(1)
}

main()
