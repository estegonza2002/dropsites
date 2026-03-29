import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { abuseReportLimit } from '@/lib/auth/rate-limit'
import { ABUSE_REASONS } from '@/lib/abuse/types'

// POST /api/v1/abuse/report — submit an abuse report (no auth required, rate limited)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rateResult = abuseReportLimit(ip)
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Too many reports. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.resetAt.getTime() - Date.now()) / 1000)),
        },
      },
    )
  }

  let body: {
    deployment_url?: string
    reporter_email?: string
    reason?: string
    description?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { deployment_url, reporter_email, reason, description } = body

  // Validate required fields
  if (!deployment_url || typeof deployment_url !== 'string' || deployment_url.trim().length === 0) {
    return NextResponse.json({ error: 'deployment_url is required' }, { status: 422 })
  }
  if (!reporter_email || typeof reporter_email !== 'string' || !reporter_email.includes('@')) {
    return NextResponse.json({ error: 'A valid reporter_email is required' }, { status: 422 })
  }
  if (!reason || !ABUSE_REASONS.includes(reason as (typeof ABUSE_REASONS)[number])) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 422 })
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json(
      { error: 'Description must be at least 10 characters' },
      { status: 422 },
    )
  }

  // Try to extract slug from URL
  const slugMatch = deployment_url.trim().match(/\/p\/([a-z0-9-]+)/i)
  const deployment_slug = slugMatch ? slugMatch[1] : deployment_url.trim()

  const admin = createAdminClient()
  const { error: insertError } = await admin.from('abuse_reports').insert({
    deployment_url: deployment_url.trim(),
    deployment_slug,
    reporter_email: reporter_email.trim(),
    reason,
    description: description.trim(),
    status: 'pending',
  })

  if (insertError) {
    console.error('Abuse report insert error:', insertError)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Report submitted successfully' })
}
