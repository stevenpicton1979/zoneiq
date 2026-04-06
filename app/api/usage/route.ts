import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return Response.json(
      { success: false, error: 'MISSING_KEY', message: 'X-Api-Key header required.' },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  if (!apiKey.startsWith('ziq_live_')) {
    return Response.json(
      { success: false, error: 'INVALID_KEY', message: 'Invalid API key format.' },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  const hash = createHash('sha256').update(apiKey).digest('hex')
  const db = createServiceClient()

  const { data: keyData, error } = await db
    .from('api_keys')
    .select('id, key_prefix, plan, requests_today, requests_total, rate_limit_per_day')
    .eq('key_hash', hash)
    .eq('is_active', true)
    .single()

  if (error || !keyData) {
    return Response.json(
      { success: false, error: 'INVALID_KEY', message: 'Invalid or inactive API key.' },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  // Count calls this month from api_usage
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const { count: callsThisMonth } = await db
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('key_id', keyData.id)
    .gte('created_at', startOfMonth.toISOString())

  const remaining = Math.max(0, keyData.rate_limit_per_day - keyData.requests_today)

  return Response.json(
    {
      success: true,
      key_id: keyData.id,
      key_prefix: keyData.key_prefix,
      plan: keyData.plan,
      total_calls: keyData.requests_total,
      calls_this_month: callsThisMonth ?? 0,
      calls_today: keyData.requests_today,
      limit: keyData.rate_limit_per_day,
      remaining,
    },
    { status: 200, headers: CORS_HEADERS }
  )
}
