import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ──────────────────────────────────────────────────────────────

export type CorsMode = 'none' | 'wildcard' | 'custom'

export interface CorsConfig {
  mode: CorsMode
  /** Allowed origins — only used when mode === 'custom' */
  origins: string[]
  /** Allowed HTTP methods — only used when mode === 'custom' */
  methods: string[]
  /** Allowed request headers — only used when mode === 'custom' */
  headers: string[]
  /** Max-Age for preflight caching (seconds). Default 86400 (24h). */
  maxAge: number
}

/** Default CORS config — no CORS headers sent. */
export const DEFAULT_CORS_CONFIG: CorsConfig = {
  mode: 'none',
  origins: [],
  methods: ['GET', 'HEAD', 'OPTIONS'],
  headers: [],
  maxAge: 86400,
}

// ── Persistence ────────────────────────────────────────────────────────

/**
 * Fetch the CORS configuration for a deployment from its
 * `dropsites_config` JSONB column.
 *
 * Returns `null` when CORS is not configured (equivalent to mode: 'none').
 */
export async function getCorsConfig(
  deploymentId: string,
): Promise<CorsConfig | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployments')
    .select('dropsites_config')
    .eq('id', deploymentId)
    .single()

  if (error || !data) return null

  const raw = data.dropsites_config as Record<string, unknown> | null
  if (!raw || !raw.cors) return null

  return parseCorsConfig(raw.cors)
}

/**
 * Parse and validate a raw CORS config value from the database.
 */
export function parseCorsConfig(raw: unknown): CorsConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const obj = raw as Record<string, unknown>
  const mode = obj.mode as string | undefined

  if (mode === 'none' || !mode) {
    return { ...DEFAULT_CORS_CONFIG, mode: 'none' }
  }

  if (mode === 'wildcard') {
    return {
      ...DEFAULT_CORS_CONFIG,
      mode: 'wildcard',
    }
  }

  if (mode === 'custom') {
    return {
      mode: 'custom',
      origins: Array.isArray(obj.origins)
        ? (obj.origins as string[]).filter((o) => typeof o === 'string' && o.length > 0)
        : [],
      methods: Array.isArray(obj.methods)
        ? (obj.methods as string[]).filter((m) => typeof m === 'string' && m.length > 0)
        : DEFAULT_CORS_CONFIG.methods,
      headers: Array.isArray(obj.headers)
        ? (obj.headers as string[]).filter((h) => typeof h === 'string' && h.length > 0)
        : [],
      maxAge:
        typeof obj.maxAge === 'number' && obj.maxAge > 0
          ? obj.maxAge
          : DEFAULT_CORS_CONFIG.maxAge,
    }
  }

  return null
}

// ── Header Building ────────────────────────────────────────────────────

/**
 * Build CORS response headers based on the deployment configuration
 * and the incoming `Origin` header.
 *
 * Returns an empty object when CORS is disabled (mode: 'none').
 */
export function buildCorsHeaders(
  config: CorsConfig,
  origin: string,
): Record<string, string> {
  if (config.mode === 'none') {
    return {}
  }

  const headers: Record<string, string> = {}

  if (config.mode === 'wildcard') {
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
    headers['Access-Control-Max-Age'] = String(config.maxAge)
    return headers
  }

  // mode === 'custom'
  if (!origin) return {}

  const allowed = config.origins.some(
    (o) => o === origin || o === '*',
  )

  if (!allowed) return {}

  headers['Access-Control-Allow-Origin'] = origin
  headers['Vary'] = 'Origin'

  if (config.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = config.methods.join(', ')
  }

  if (config.headers.length > 0) {
    headers['Access-Control-Allow-Headers'] = config.headers.join(', ')
  }

  headers['Access-Control-Max-Age'] = String(config.maxAge)

  return headers
}

/**
 * Build response headers for a CORS preflight (OPTIONS) request.
 * Returns null if the deployment has no CORS configuration.
 */
export function buildPreflightResponse(
  config: CorsConfig,
  origin: string,
): Record<string, string> | null {
  if (config.mode === 'none') return null

  const headers = buildCorsHeaders(config, origin)
  if (Object.keys(headers).length === 0) return null

  // Preflight responses must include Content-Length: 0
  headers['Content-Length'] = '0'

  return headers
}
