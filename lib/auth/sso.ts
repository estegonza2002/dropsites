/**
 * OIDC SSO utilities — discovery, authorization URL builder, token exchange.
 *
 * The full OIDC flow is implemented:
 *   - initiate: GET /api/auth/sso/initiate?workspaceId=<id>
 *   - callback: GET /api/auth/sso/callback?code=<code>&state=<state>
 *
 * Configuration is stored in workspaces.sso_config JSONB.
 */

export interface SSOConfig {
  enabled: boolean
  discovery_url: string
  client_id: string
  client_secret: string
  /** Scopes to request during authorization. Defaults to "openid email profile". */
  scopes?: string
}

export interface OIDCDiscoveryDocument {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  scopes_supported?: string[]
  response_types_supported?: string[]
}

/**
 * Fetch and validate the OIDC discovery document from the provider's
 * well-known endpoint.
 */
export async function discoverOIDC(discoveryUrl: string): Promise<OIDCDiscoveryDocument> {
  // Normalise: append /.well-known/openid-configuration if not present
  const url = discoveryUrl.endsWith('/.well-known/openid-configuration')
    ? discoveryUrl
    : `${discoveryUrl.replace(/\/+$/, '')}/.well-known/openid-configuration`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText}`)
  }

  const doc = (await res.json()) as OIDCDiscoveryDocument

  if (!doc.issuer || !doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error('Invalid OIDC discovery document: missing required fields')
  }

  return doc
}

/**
 * Build the authorization redirect URL for the configured OIDC provider.
 */
export function buildAuthorizationUrl(
  doc: OIDCDiscoveryDocument,
  config: SSOConfig,
  redirectUri: string,
  state: string,
  nonce: string,
): string {
  const scopes = config.scopes ?? 'openid email profile'

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.client_id,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    nonce,
  })

  return `${doc.authorization_endpoint}?${params.toString()}`
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(
  doc: OIDCDiscoveryDocument,
  config: SSOConfig,
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; id_token: string; token_type: string }> {
  const res = await fetch(doc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} — ${text}`)
  }

  return (await res.json()) as {
    access_token: string
    id_token: string
    token_type: string
  }
}

/**
 * Test connection: attempt OIDC discovery and report success/failure.
 */
export async function testConnection(
  discoveryUrl: string,
): Promise<{ ok: boolean; issuer?: string; error?: string }> {
  try {
    const doc = await discoverOIDC(discoveryUrl)
    return { ok: true, issuer: doc.issuer }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
