import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const TOTP_PERIOD = 30 // seconds
const TOTP_DIGITS = 6
const TOTP_ALGORITHM = 'sha1'
const BACKUP_CODE_COUNT = 10
const BACKUP_CODE_LENGTH = 8

// ---------------------------------------------------------------------------
// TOTP core (RFC 6238 / RFC 4226)
// ---------------------------------------------------------------------------

/**
 * Generates a HMAC-based one-time password from a secret and counter.
 * Implements RFC 4226 (HOTP).
 */
function generateHotp(secret: Buffer, counter: bigint): string {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(counter)

  const hmac = crypto.createHmac(TOTP_ALGORITHM, secret)
  hmac.update(counterBuffer)
  const digest = hmac.digest()

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0')
}

/**
 * Generates a TOTP code for the current time window.
 */
function generateTotpCode(secret: Buffer, timeOffset = 0): string {
  const counter = BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeOffset)
  return generateHotp(secret, counter)
}

/**
 * Encodes a buffer as base32 (RFC 4648).
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }

  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0')
    result += alphabet[parseInt(chunk, 2)]
  }

  return result
}

/**
 * Decodes a base32 string to a Buffer.
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of encoded.toUpperCase()) {
    const index = alphabet.indexOf(char)
    if (index === -1) continue // skip padding/whitespace
    bits += index.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }

  return Buffer.from(bytes)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a new TOTP secret, QR code URL, and backup codes for a user.
 */
export function generateTotpSecret(userId: string): {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
} {
  // 20 bytes = 160 bits, standard for TOTP
  const secretBuffer = crypto.randomBytes(20)
  const secret = base32Encode(secretBuffer)

  // otpauth:// URI for QR code scanning
  const issuer = 'DropSites'
  const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`

  // Generate backup codes
  const backupCodes: string[] = []
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex')
    backupCodes.push(code)
  }

  return { secret, qrCodeUrl, backupCodes }
}

/**
 * Verifies a TOTP code against a stored secret.
 * Allows +/- 1 time window for clock skew.
 */
export function verifyTotp(secret: string, code: string): boolean {
  if (!code || code.length !== TOTP_DIGITS) return false

  const secretBuffer = base32Decode(secret)

  // Check current window and +/- 1 for clock skew
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotpCode(secretBuffer, offset)
    if (timingSafeEqual(code, expected)) {
      return true
    }
  }

  return false
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Verifies a backup code and marks it as used in the database.
 * Each backup code can only be used once.
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Fetch stored backup codes for the user
  const { data, error } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single()

  if (error || !data) return false

  const prefs = data.notification_prefs as Record<string, unknown>
  const storedCodes = (prefs?.backup_codes ?? []) as string[]

  // Hash the provided code for comparison
  const codeHash = crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex')

  const index = storedCodes.indexOf(codeHash)
  if (index === -1) return false

  // Remove the used code
  const updatedCodes = [...storedCodes]
  updatedCodes.splice(index, 1)

  await supabase
    .from('users')
    .update({
      notification_prefs: {
        ...prefs,
        backup_codes: updatedCodes,
      },
    })
    .eq('id', userId)

  return true
}

/**
 * Hashes backup codes for secure storage.
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) =>
    crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex'),
  )
}

export { base32Encode, base32Decode, generateTotpCode }
