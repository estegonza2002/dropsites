import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const CONSENT_VERSION = '1.0'

// POST /api/v1/consent — record cookie consent decision in the DB
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { decision?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { decision } = body
  if (decision !== 'accepted' && decision !== 'declined') {
    return NextResponse.json({ error: 'decision must be "accepted" or "declined"' }, { status: 400 })
  }

  // Only record accepted consents — declined is not stored (no PII reason)
  if (decision !== 'accepted') {
    return NextResponse.json({ ok: true })
  }

  const ua = req.headers.get('user-agent') ?? null
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  // Hash the IP — no raw IP stored
  const ipHash = ip
    ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
    : null

  const admin = createAdminClient()
  await admin.from('cookie_consents').insert({
    user_agent: ua ? ua.slice(0, 512) : null,
    ip_hash: ipHash,
    consent_version: CONSENT_VERSION,
  })

  return NextResponse.json({ ok: true })
}
