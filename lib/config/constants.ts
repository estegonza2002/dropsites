export const RESERVED_SLUGS = [
  'api',
  'health',
  'admin',
  'dashboard',
  'login',
  'signup',
  'settings',
  'p',
  's',
  'invite',
  'changelog',
  'dmca',
  'terms',
  'privacy',
  'cookies',
  'pricing',
  'acceptable-use',
  'status',
  '_system',
] as const

export const MAX_SLUG_LENGTH = 64
export const MIN_SLUG_LENGTH = 3
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
