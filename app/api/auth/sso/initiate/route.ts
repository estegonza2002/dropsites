import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverOIDC, buildAuthorizationUrl, type SSOConfig } from '@/lib/auth/sso'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// GET /api/auth/sso/initiate?workspaceId=<id>
// Redirects the user to the workspace's OIDC identity provider.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('sso_config')
    .eq('id', workspaceId)
    .single()

  const ssoConfig = workspace?.sso_config as SSOConfig | null

  if (!ssoConfig?.enabled || !ssoConfig.discovery_url || !ssoConfig.client_id) {
    return NextResponse.json({ error: 'SSO is not configured for this workspace' }, { status: 400 })
  }

  let doc
  try {
    doc = await discoverOIDC(ssoConfig.discovery_url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OIDC discovery failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Generate state and nonce for CSRF protection
  const state = crypto.randomBytes(16).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')

  // Encode workspace_id in state so the callback can find the right config
  const statePayload = Buffer.from(JSON.stringify({ workspaceId, nonce, csrf: state })).toString('base64url')
  const redirectUri = `${APP_URL}/api/auth/sso/callback`

  const authUrl = buildAuthorizationUrl(doc, ssoConfig, redirectUri, statePayload, nonce)

  const response = NextResponse.redirect(authUrl)

  // Store state in a short-lived cookie for CSRF verification
  response.cookies.set('sso_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
