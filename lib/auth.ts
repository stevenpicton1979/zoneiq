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
  id?: string           // absent for RapidAPI synthetic records
  key_prefix: string
  name: string
  email: string
  plan: string
  requests_today: number
  requests_total: number
  rate_limit_per_day: number
  is_active: boolean
  source?: string       // 'direct' | 'rapidapi'
}

interface RapidApiHeaders {
  proxySecret?: string | null
  subscriptionPlan?: string | null
}

// RapidAPI subscription plan → internal plan name
const RAPIDAPI_PLAN_MAP: Record<string, string> = {
  basic: 'free',
  pro: 'starter',
  ultra: 'pro',
  mega: 'enterprise',
}

const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 100,
  starter: 500,
  pro: 5000,
  enterprise: 50000,
}

export async function validateApiKey(
  key: string | null,
  rapidApi?: RapidApiHeaders
): Promise<AuthResult> {

  // ── RapidAPI path ──────────────────────────────────────────────────────────
  // RapidAPI injects X-RapidAPI-Proxy-Secret on every proxied request.
  // If present and valid, bypass our api_keys table entirely.
  if (rapidApi?.proxySecret) {
    const expectedSecret = process.env.RAPIDAPI_PROXY_SECRET
    if (!expectedSecret || rapidApi.proxySecret !== expectedSecret) {
      return { valid: false, error: 'Invalid RapidAPI proxy secret.' }
    }

    const rawPlan = (rapidApi.subscriptionPlan ?? 'basic').toLowerCase()
    const plan = RAPIDAPI_PLAN_MAP[rawPlan] ?? 'free'

    return {
      valid: true,
      keyData: {
        key_prefix: 'rapidapi',
        name: 'RapidAPI Subscriber',
        email: '',
        plan,
        requests_today: 0,
        requests_total: 0,
        rate_limit_per_day: PLAN_RATE_LIMITS[plan] ?? 100,
        is_active: true,
        source: 'rapidapi',
      },
    }
  }

  // ── Direct key path ────────────────────────────────────────────────────────
  if (!key) {
    return { valid: false, error: 'API key required. Pass as X-Api-Key header or ?api_key= parameter.' }
  }

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

  return { valid: true, keyData: { ...data, source: 'direct' } as ApiKeyRecord }
}
