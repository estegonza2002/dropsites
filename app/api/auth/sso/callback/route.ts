import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverOIDC, exchangeCode, type SSOConfig } from '@/lib/auth/sso'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// GET /api/auth/sso/callback?code=<code>&state=<state>
// Handles the OIDC redirect back from the identity provider.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  if (errorParam) {
    const desc = url.searchParams.get('error_description') ?? errorParam
    return NextResponse.redirect(
      new URL(`/login?sso_error=${encodeURIComponent(desc)}`, APP_URL),
    )
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL('/login?sso_error=missing_params', APP_URL),
    )
  }

  // Decode state payload
  let statePayload: { workspaceId: string; nonce: string; csrf: string }
  try {
    statePayload = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/login?sso_error=invalid_state', APP_URL))
  }

  // Verify CSRF state cookie
  const storedState = req.cookies.get('sso_state')?.value
  if (!storedState || storedState !== statePayload.csrf) {
    return NextResponse.redirect(new URL('/login?sso_error=state_mismatch', APP_URL))
  }

  const { workspaceId } = statePayload
  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('sso_config')
    .eq('id', workspaceId)
    .single()

  const ssoConfig = workspace?.sso_config as SSOConfig | null
  if (!ssoConfig?.enabled) {
    return NextResponse.redirect(new URL('/login?sso_error=sso_not_configured', APP_URL))
  }

  let doc
  try {
    doc = await discoverOIDC(ssoConfig.discovery_url)
  } catch {
    return NextResponse.redirect(new URL('/login?sso_error=discovery_failed', APP_URL))
  }

  const redirectUri = `${APP_URL}/api/auth/sso/callback`

  let tokens
  try {
    tokens = await exchangeCode(doc, ssoConfig, code, redirectUri)
  } catch {
    return NextResponse.redirect(new URL('/login?sso_error=token_exchange_failed', APP_URL))
  }

  // Verify and decode the id_token using JWKS from the discovery document
  let claims: { email?: string; sub?: string; name?: string }
  try {
    const JWKS = createRemoteJWKSet(new URL(doc.jwks_uri))
    const { payload } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: doc.issuer,
      audience: ssoConfig.client_id,
    })
    claims = payload as { email?: string; sub?: string; name?: string }
  } catch {
    return NextResponse.redirect(new URL('/login?sso_error=invalid_id_token', APP_URL))
  }

  if (!claims.email || !claims.sub) {
    return NextResponse.redirect(new URL('/login?sso_error=missing_claims', APP_URL))
  }

  // Find or create the Supabase auth user
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users.find((u) => u.email === claims.email)

  let userId: string

  if (existing) {
    userId = existing.id
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: claims.email,
      email_confirm: true,
      user_metadata: {
        full_name: claims.name ?? claims.email,
        sso_sub: claims.sub,
        sso_workspace_id: workspaceId,
      },
    })

    if (createErr || !created.user) {
      return NextResponse.redirect(new URL('/login?sso_error=user_creation_failed', APP_URL))
    }

    userId = created.user.id
  }

  // Ensure the user is a member of the workspace
  await admin
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        email: claims.email,
        role: 'publisher',
        accepted_at: new Date().toISOString(),
        invited_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' },
    )

  await admin.from('audit_log').insert({
    action: 'auth.sso_login',
    actor_id: userId,
    target_id: workspaceId,
    target_type: 'workspace',
    details: { sub: claims.sub, email: claims.email },
  })

  // Generate a magic link so the user gets a proper Supabase session
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: claims.email,
    options: {
      redirectTo: `${APP_URL}/dashboard`,
    },
  })

  if (linkErr || !linkData.properties?.action_link) {
    return NextResponse.redirect(new URL('/login?sso_error=session_creation_failed', APP_URL))
  }

  // Clear the CSRF cookie and redirect through the magic link
  const response = NextResponse.redirect(linkData.properties.action_link)
  response.cookies.delete('sso_state')
  return response
}
