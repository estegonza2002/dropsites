import { createHmac, timingSafeEqual } from 'crypto'
import type { LicencePayload, LicenceResult } from './types'

/**
 * Validate a licence key offline.
 *
 * Verifies the HMAC-SHA256 signature, decodes the payload, and checks expiry.
 * On expiry the result includes `expired: true` but `valid` remains true
 * (graceful degradation -- callers should warn but not break).
 */
export function validateLicenceKey(key: string): LicenceResult {
  const signingKey = process.env.LICENCE_SIGNING_KEY
  if (!signingKey) {
    return invalidResult('LICENCE_SIGNING_KEY not configured')
  }

  const parts = key.split('.')
  if (parts.length !== 2) {
    return invalidResult('Malformed licence key')
  }

  const [payloadB64, signatureB64] = parts

  // Verify signature
  const expectedSig = createHmac('sha256', signingKey)
    .update(payloadB64)
    .digest()

  let providedSig: Buffer
  try {
    providedSig = Buffer.from(signatureB64, 'base64url')
  } catch {
    return invalidResult('Invalid signature encoding')
  }

  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    return invalidResult('Signature verification failed')
  }

  // Decode payload
  let payload: LicencePayload
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8')
    payload = JSON.parse(json) as LicencePayload
  } catch {
    return invalidResult('Invalid payload')
  }

  const expiresAt = new Date(payload.expiresAt)
  const expired = expiresAt.getTime() < Date.now()

  return {
    valid: true,
    customer: payload.customer,
    expiresAt,
    features: payload.features,
    deploymentLimit: payload.deploymentLimit,
    expired,
  }
}

function invalidResult(_reason: string): LicenceResult {
  return {
    valid: false,
    customer: '',
    expiresAt: new Date(0),
    features: [],
    deploymentLimit: 0,
    expired: false,
  }
}
