import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { testConnection, type SSOConfig } from '@/lib/auth/sso'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/workspaces/[id]/sso — read SSO config (secrets masked)
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can view SSO config' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('sso_config')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const config = workspace.sso_config as SSOConfig | null

  // Mask client_secret for display
  const masked = config
    ? {
        enabled: config.enabled ?? false,
        discovery_url: config.discovery_url ?? '',
        client_id: config.client_id ?? '',
        client_secret: config.client_secret ? '••••••••' : '',
        scopes: config.scopes ?? 'openid email profile',
      }
    : {
        enabled: false,
        discovery_url: '',
        client_id: '',
        client_secret: '',
        scopes: 'openid email profile',
      }

  return NextResponse.json({ sso: masked })
}

// PATCH /api/v1/workspaces/[id]/sso — update SSO config
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can update SSO config' }, { status: 403 })
  }

  // Check limit_profile allows SSO
  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('limit_profile, sso_config')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('limit_profiles')
    .select('workspace_sso_allowed')
    .eq('name', workspace.limit_profile)
    .single()

  if (!profile?.workspace_sso_allowed) {
    return NextResponse.json(
      { error: 'SSO is not available on your current plan' },
      { status: 403 },
    )
  }

  let body: Partial<SSOConfig> & { test_connection?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Handle test connection request
  if (body.test_connection) {
    const discoveryUrl = body.discovery_url
    if (!discoveryUrl) {
      return NextResponse.json({ error: 'Discovery URL is required' }, { status: 400 })
    }
    const result = await testConnection(discoveryUrl)
    return NextResponse.json({ test: result })
  }

  // Build the update
  const existingConfig = (workspace.sso_config as SSOConfig | null) ?? {
    enabled: false,
    discovery_url: '',
    client_id: '',
    client_secret: '',
    scopes: 'openid email profile',
  }

  const updatedConfig: SSOConfig = {
    enabled: body.enabled ?? existingConfig.enabled,
    discovery_url: body.discovery_url ?? existingConfig.discovery_url,
    client_id: body.client_id ?? existingConfig.client_id,
    // Only update secret if a non-masked value is sent
    client_secret:
      body.client_secret && body.client_secret !== '••••••••'
        ? body.client_secret
        : existingConfig.client_secret,
    scopes: body.scopes ?? existingConfig.scopes,
  }

  // Validate required fields when enabling
  if (updatedConfig.enabled) {
    if (!updatedConfig.discovery_url) {
      return NextResponse.json({ error: 'Discovery URL is required to enable SSO' }, { status: 400 })
    }
    if (!updatedConfig.client_id) {
      return NextResponse.json({ error: 'Client ID is required to enable SSO' }, { status: 400 })
    }
    if (!updatedConfig.client_secret) {
      return NextResponse.json({ error: 'Client Secret is required to enable SSO' }, { status: 400 })
    }
  }

  const { error } = await admin
    .from('workspaces')
    .update({
      sso_config: updatedConfig as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Update SSO config error:', error)
    return NextResponse.json({ error: 'Failed to update SSO config' }, { status: 500 })
  }

  return NextResponse.json({
    sso: {
      enabled: updatedConfig.enabled,
      discovery_url: updatedConfig.discovery_url,
      client_id: updatedConfig.client_id,
      client_secret: updatedConfig.client_secret ? '••••••••' : '',
      scopes: updatedConfig.scopes,
    },
  })
}
