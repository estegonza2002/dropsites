import crypto from 'crypto'

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_COST = 16384 // N = 2^14
const SCRYPT_BLOCK_SIZE = 8 // r
const SCRYPT_PARALLELISM = 1 // p
const SALT_LENGTH = 32

// ---------------------------------------------------------------------------
// Password hashing (crypto.scrypt — no external deps)
// ---------------------------------------------------------------------------

/**
 * Hashes a password using scrypt with a random salt.
 * Returns a string in the format: `scrypt:N:r:p:salt:hash` (all hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH)

  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey)
      },
    )
  })

  return `scrypt:${SCRYPT_COST}:${SCRYPT_BLOCK_SIZE}:${SCRYPT_PARALLELISM}:${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verifies a password against a stored hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false
  }

  const N = parseInt(parts[1], 10)
  const r = parseInt(parts[2], 10)
  const p = parseInt(parts[3], 10)
  const salt = Buffer.from(parts[4], 'hex')
  const expectedHash = Buffer.from(parts[5], 'hex')

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, expectedHash.length, { N, r, p }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })

  return crypto.timingSafeEqual(derivedKey, expectedHash)
}

// ---------------------------------------------------------------------------
// Password strength checking
// ---------------------------------------------------------------------------

export type PasswordStrength = {
  /** Score from 0 (very weak) to 4 (very strong) */
  score: 0 | 1 | 2 | 3 | 4
  /** Human-readable feedback messages */
  feedback: string[]
}

/**
 * Evaluates password strength and returns a score with feedback.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  // Length checks
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters')
  } else if (password.length >= 12) {
    score += 1
  }
  if (password.length >= 16) {
    score += 1
  }

  // Character variety
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length

  if (varietyCount >= 3) {
    score += 1
  } else if (varietyCount < 2) {
    feedback.push('Add uppercase letters, numbers, or special characters')
  }

  if (varietyCount === 4) {
    score += 1
  }

  // Common patterns
  const commonPatterns = [
    /^(password|123456|qwerty|abc123|letmein|admin|welcome)/i,
    /(.)\1{3,}/, // 4+ repeated characters
    /^(0123|1234|2345|3456|4567|5678|6789)/, // sequential digits
    /^(abcd|bcde|cdef|defg)/i, // sequential letters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1) as 0 | 1 | 2 | 3 | 4
      feedback.push('Avoid common patterns and repeated characters')
      break
    }
  }

  // Clamp score
  const clampedScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4

  if (feedback.length === 0) {
    if (clampedScore <= 1) {
      feedback.push('Consider making your password longer')
    } else if (clampedScore === 2) {
      feedback.push('Good password, could be stronger')
    }
  }

  return { score: clampedScore, feedback }
}

// ---------------------------------------------------------------------------
// HaveIBeenPwned check (k-anonymity API)
// ---------------------------------------------------------------------------

/**
 * Checks if a password has been exposed in known data breaches
 * using the HaveIBeenPwned k-anonymity API.
 *
 * Only the first 5 characters of the SHA-1 hash are sent to the API.
 * Returns true if the password has been pwned.
 */
export async function checkPwnedPassword(password: string): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'DropSites-Security-Check',
      },
    })

    if (!response.ok) {
      // If the API is unavailable, fail open (don't block the user)
      return false
    }

    const text = await response.text()
    const lines = text.split('\n')

    for (const line of lines) {
      const [hashSuffix] = line.split(':')
      if (hashSuffix.trim() === suffix) {
        return true
      }
    }

    return false
  } catch {
    // Network error — fail open
    return false
  }
}
