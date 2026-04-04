import { randomBytes, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  starter: 500,
  pro: 5000,
}

function generateKey(): string {
  const random = randomBytes(24).toString('hex')
  return `ziq_live_${random}`
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; plan?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { name, email, plan = 'free' } = body

  if (!name?.trim() || !email?.trim()) {
    return Response.json(
      { error: 'name and email are required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!['free', 'starter', 'pro'].includes(plan)) {
    return Response.json(
      { error: 'plan must be free, starter, or pro' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: 'Invalid email address' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const key = generateKey()
  const hash = hashKey(key)
  const prefix = key.substring(0, 12) // "ziq_live_a1b"
  const rateLimit = PLAN_LIMITS[plan] ?? 100

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await db.from('api_keys').insert({
    key_hash: hash,
    key_prefix: prefix,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    plan,
    rate_limit_per_day: rateLimit,
  })

  if (error) {
    console.error('register-key insert error:', error.message)
    return Response.json(
      { error: 'Failed to create API key. Please try again.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return Response.json(
    {
      key,
      prefix,
      plan,
      rate_limit: rateLimit,
      message: 'Store this key securely — it will not be shown again.',
      ...(plan !== 'free' && {
        billing_note: "You'll receive an invoice via email. Key is active immediately.",
      }),
    },
    { status: 201, headers: CORS_HEADERS }
  )
}
