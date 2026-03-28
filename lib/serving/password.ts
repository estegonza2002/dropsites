import bcrypt from 'bcryptjs'

const BCRYPT_COST = 12

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Cookie-based verification tokens ──────────────────────────────────

const TOKEN_SECRET =
  process.env.PASSWORD_TOKEN_SECRET ?? 'dropsites-pw-token-secret'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Create a signed verification token for a deployment.
 *
 * Format: `deploymentId:expiresAt:signature`
 * Uses HMAC-SHA256 via Web Crypto (Edge-compatible).
 */
export async function createVerificationToken(
  deploymentId: string,
): Promise<string> {
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const payload = `${deploymentId}:${expiresAt}`
  const signature = await sign(payload)
  return `${payload}:${signature}`
}

/**
 * Verify a signed token. Returns true if the token is valid and not expired.
 */
export async function verifyToken(
  token: string,
  deploymentId: string,
): Promise<boolean> {
  const parts = token.split(':')
  if (parts.length !== 3) return false

  const [tokenDeploymentId, expiresAtStr, signature] = parts
  if (tokenDeploymentId !== deploymentId) return false

  const expiresAt = Number(expiresAtStr)
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false

  const payload = `${tokenDeploymentId}:${expiresAtStr}`
  const expectedSignature = await sign(payload)
  return signature === expectedSignature
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
