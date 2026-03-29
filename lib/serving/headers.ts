import type { Deployment, DeploymentFile } from './resolve'

const HTML_EXTS = new Set(['.html', '.htm'])

function isHtmlFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  const lastDot = lower.lastIndexOf('.')
  return lastDot !== -1 && HTML_EXTS.has(lower.slice(lastDot))
}

/**
 * Content Security Policy for served deployment content.
 *
 * Permissive — user-uploaded sites may include inline scripts, styles,
 * and third-party resources. We restrict only the most dangerous vectors.
 */
const SERVED_CONTENT_CSP = [
  "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
  "frame-ancestors *",
  "base-uri 'self'",
  "form-action *",
].join('; ')

/**
 * Strict CSP for the dashboard / platform pages.
 * Applied by getDashboardSecurityHeaders().
 */
const DASHBOARD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

/**
 * Returns HTTP headers for a served deployment file.
 */
export function getServingHeaders(
  deployment: Deployment,
  file: DeploymentFile,
): Record<string, string> {
  const headers: Record<string, string> = {}

  headers['Content-Type'] = file.mime_type

  // HTML: no-cache (re-publish should be visible immediately)
  // Other assets: long-lived cache (content-addressed via SHA-256)
  if (isHtmlFile(file.file_path)) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  } else {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  }

  // Security headers
  headers['X-Content-Type-Options'] = 'nosniff'
  headers['X-Frame-Options'] = 'SAMEORIGIN'
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

  // CSP for served content (permissive — user sites need freedom)
  headers['Content-Security-Policy'] = SERVED_CONTENT_CSP

  headers['X-Robots-Tag'] = deployment.allow_indexing ? 'index, follow' : 'noindex, nofollow'
  headers['ETag'] = `"${file.sha256_hash}"`

  return headers
}

/**
 * Returns security headers for dashboard / platform pages.
 * Called from middleware for /dashboard, /login, /settings, etc.
 */
export function getDashboardSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': DASHBOARD_CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}
