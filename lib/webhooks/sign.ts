import { createHmac, timingSafeEqual, randomBytes } from 'crypto'

/**
 * Generate an HMAC-SHA256 signature for a webhook payload.
 */
export function signPayload(payload: object, secret: string): string {
  const body = JSON.stringify(payload)
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Verify an HMAC-SHA256 signature against the given payload and secret.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  if (expected.length !== signature.length) return false

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}

/**
 * Generate a random signing secret for a new webhook endpoint.
 */
export function generateSigningSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`
}
