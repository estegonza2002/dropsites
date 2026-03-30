import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { initiateDomainVerification, DomainError } from '@/lib/domains/verify'
import { getWorkspaceProfile } from '@/lib/limits/get-profile'

// POST /api/v1/domains — add custom domain to a deployment (Pro+ only)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { domain: string; deploymentId: string; workspaceId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.domain || !body.deploymentId || !body.workspaceId) {
    return NextResponse.json(
      { error: 'Missing required fields: domain, deploymentId, workspaceId' },
      { status: 400 },
    )
  }

  // Check workspace membership
  const role = await getUserRole(user.id, body.workspaceId)
  if (!role || !['owner', 'publisher'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check plan allows custom domains
  const profile = await getWorkspaceProfile(body.workspaceId)
  if (!profile.custom_domain_allowed) {
    return NextResponse.json(
      { error: 'Custom domains are not available on your current plan' },
      { status: 403 },
    )
  }

  // Verify deployment belongs to workspace
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id')
    .eq('id', body.deploymentId)
    .eq('workspace_id', body.workspaceId)
    .is('archived_at', null)
    .single()

  if (!deployment) {
    return NextResponse.json({ error: 'Deployment not found in workspace' }, { status: 404 })
  }

  try {
    const result = await initiateDomainVerification(
      body.domain,
      body.deploymentId,
      body.workspaceId,
    )
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Domain creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/v1/domains?workspaceId=... — list custom domains for a workspace
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing required query param: workspaceId' }, { status: 400 })
  }

  const role = await getUserRole(user.id, workspaceId)
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: domains, error } = await admin
    .from('custom_domains')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('List domains error:', error)
    return NextResponse.json({ error: 'Failed to list domains' }, { status: 500 })
  }

  return NextResponse.json(domains ?? [])
}
