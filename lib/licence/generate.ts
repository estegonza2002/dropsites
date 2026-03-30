import { createHmac } from 'crypto'
import type { LicencePayload } from './types'

/**
 * Generate a licence key with HMAC-SHA256 signature.
 *
 * Format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256 signature)
 *
 * The signing key is read from the LICENCE_SIGNING_KEY env var.
 */
export function generateLicenceKey(options: {
  customer: string
  expiresAt: Date
  deploymentLimit: number
  features: string[]
}): string {
  const signingKey = process.env.LICENCE_SIGNING_KEY
  if (!signingKey) {
    throw new Error('LICENCE_SIGNING_KEY environment variable is required')
  }

  const payload: LicencePayload = {
    customer: options.customer,
    expiresAt: options.expiresAt.toISOString(),
    deploymentLimit: options.deploymentLimit,
    features: options.features,
    issuedAt: new Date().toISOString(),
  }

  const payloadJson = JSON.stringify(payload)
  const payloadB64 = toBase64Url(Buffer.from(payloadJson, 'utf-8'))

  const signature = createHmac('sha256', signingKey)
    .update(payloadB64)
    .digest()
  const signatureB64 = toBase64Url(signature)

  return `${payloadB64}.${signatureB64}`
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64url')
}
