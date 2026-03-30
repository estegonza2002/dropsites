/**
 * Licence system types.
 *
 * Shared across generate, validate, and checker modules.
 */

export interface LicencePayload {
  /** Customer name or organisation */
  customer: string
  /** ISO 8601 expiry timestamp */
  expiresAt: string
  /** Maximum number of deployments allowed */
  deploymentLimit: number
  /** Enabled feature flags */
  features: string[]
  /** Timestamp when the licence was issued */
  issuedAt: string
}

export interface LicenceResult {
  valid: boolean
  customer: string
  expiresAt: Date
  features: string[]
  deploymentLimit: number
  expired: boolean
}

export type LicenceStatus = 'valid' | 'expired' | 'invalid' | 'missing'

export interface LicenceState {
  status: LicenceStatus
  customer: string | null
  expiresAt: Date | null
  features: string[]
  deploymentLimit: number | null
  lastChecked: Date | null
}
