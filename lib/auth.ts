import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type AuthResult =
  | { valid: true; keyData: ApiKeyRecord }
  | { valid: false; error: string; upgrade_url?: string }

export interface ApiKeyRecord {
  id: string
  key_prefix: string
  name: string
  email: string
  plan: string
  requests_today: number
  requests_total: number
  rate_limit_per_day: number
  is_active: boolean
}

export async function validateApiKey(key: string): Promise<AuthResult> {
  if (!key.startsWith('ziq_live_')) {
    return { valid: false, error: 'Invalid API key format.' }
  }

  const db = getServiceClient()
  const hash = hashKey(key)

  const { data, error } = await db
    .from('api_keys')
    .select('*')
    .eq('key_hash', hash)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return { valid: false, error: 'Invalid or inactive API key.' }
  }

  if (data.requests_today >= data.rate_limit_per_day) {
    return {
      valid: false,
      error: `Daily rate limit of ${data.rate_limit_per_day} requests exceeded. Resets at midnight UTC.`,
      upgrade_url: 'https://zoneiq.com.au/pricing',
    }
  }

  // Update usage counters — fire and forget
  void db
    .from('api_keys')
    .update({
      requests_today: data.requests_today + 1,
      requests_total: data.requests_total + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {})

  return { valid: true, keyData: data as ApiKeyRecord }
}
