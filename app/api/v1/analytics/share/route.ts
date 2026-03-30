import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

// POST /api/v1/analytics/share — generate a shareable analytics token
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { deployment_id?: string; expires_in_days?: number | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { deployment_id, expires_in_days } = body

  if (!deployment_id || typeof deployment_id !== 'string') {
    return NextResponse.json({ error: 'deployment_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify deployment exists and user has access
  const { data: deployment } = await admin
    .from('deployments')
    .select('workspace_id')
    .eq('id', deployment_id)
    .single()

  if (!deployment) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  // Only owner and publisher can create share tokens
  if (role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Generate a URL-safe token
  const token = randomBytes(24).toString('base64url')

  // Calculate expiry
  let expiresAt: string | null = null
  if (expires_in_days && expires_in_days > 0) {
    const d = new Date()
    d.setDate(d.getDate() + expires_in_days)
    expiresAt = d.toISOString()
  }

  const { error: insertError } = await admin
    .from('analytics_share_tokens')
    .insert({
      deployment_id,
      token,
      created_by: user.id,
      expires_at: expiresAt,
    })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 })
  }

  return NextResponse.json({ token, expires_at: expiresAt })
}
