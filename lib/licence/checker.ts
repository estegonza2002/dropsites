import { validateLicenceKey } from './validate'
import type { LicenceState, LicenceStatus } from './types'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

let currentState: LicenceState = {
  status: 'missing',
  customer: null,
  expiresAt: null,
  features: [],
  deploymentLimit: null,
  lastChecked: null,
}

let intervalHandle: ReturnType<typeof setInterval> | null = null

/**
 * Perform a single licence check. Reads the licence key from
 * DROPSITES_LICENCE_KEY and validates it offline.
 */
export function checkLicence(): LicenceState {
  const key = process.env.DROPSITES_LICENCE_KEY

  if (!key) {
    currentState = {
      status: 'missing',
      customer: null,
      expiresAt: null,
      features: [],
      deploymentLimit: null,
      lastChecked: new Date(),
    }
    console.warn('[licence] No licence key found (DROPSITES_LICENCE_KEY not set)')
    return currentState
  }

  const result = validateLicenceKey(key)
  const now = new Date()

  let status: LicenceStatus
  if (!result.valid) {
    status = 'invalid'
    console.warn('[licence] Licence key is invalid')
  } else if (result.expired) {
    status = 'expired'
    console.warn(
      `[licence] Licence for "${result.customer}" has expired (${result.expiresAt.toISOString()})`,
    )
  } else {
    status = 'valid'
  }

  currentState = {
    status,
    customer: result.valid ? result.customer : null,
    expiresAt: result.valid ? result.expiresAt : null,
    features: result.features,
    deploymentLimit: result.valid ? result.deploymentLimit : null,
    lastChecked: now,
  }

  return currentState
}

/**
 * Start the licence checker. Validates immediately on startup,
 * then re-validates every 24 hours.
 */
export function startLicenceChecker(): void {
  // Initial check
  checkLicence()

  // Periodic re-check
  if (intervalHandle) {
    clearInterval(intervalHandle)
  }
  intervalHandle = setInterval(checkLicence, CHECK_INTERVAL_MS)
}

/**
 * Stop the periodic licence checker.
 */
export function stopLicenceChecker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

/**
 * Get the current licence state without triggering a new check.
 */
export function getLicenceState(): LicenceState {
  return { ...currentState }
}
