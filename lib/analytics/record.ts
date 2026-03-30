import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCountry } from '@/lib/analytics/geo'
import { parseUserAgent } from '@/lib/analytics/device'

// Module-level cache for bot filter patterns from the DB.
// Populated once per cold start to avoid per-request DB overhead.
let cachedBotPatterns: RegExp[] | null = null
let botPatternsFetchedAt = 0
const BOT_PATTERNS_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getBotPatterns(): Promise<RegExp[]> {
  const now = Date.now()
  if (cachedBotPatterns && now - botPatternsFetchedAt < BOT_PATTERNS_TTL_MS) {
    return cachedBotPatterns
  }

  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('bot_filters')
      .select('pattern')
      .eq('active', true)

    if (data && data.length > 0) {
      cachedBotPatterns = data.map((r) => new RegExp(r.pattern, 'i'))
      botPatternsFetchedAt = now
    }
  } catch {
    // Non-fatal — fall back to inline patterns
  }

  return cachedBotPatterns ?? []
}

/** Built-in fallback bot patterns for cold starts and DB errors. */
const FALLBACK_BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot/i

/**
 * Parse UA class from User-Agent string.
 * Uses cached DB patterns with regex fallback.
 */
async function parseUaClassAsync(ua: string | null): Promise<string> {
  if (!ua) return 'unknown'
  const lower = ua.toLowerCase()

  // Check DB patterns first (cached)
  const dbPatterns = await getBotPatterns()
  const isBot =
    dbPatterns.some((re) => re.test(lower)) || FALLBACK_BOT_RE.test(lower)

  if (isBot) return 'bot'
  if (/mobile|android|iphone|ipod/i.test(lower)) return 'mobile'
  if (/tablet|ipad/i.test(lower)) return 'tablet'
  return 'desktop'
}

/**
 * Extract referrer domain from Referer header.
 */
function parseReferrerDomain(referer: string | null): string | null {
  if (!referer) return null
  try {
    return new URL(referer).hostname
  } catch {
    return null
  }
}

/**
 * Record a page view for analytics. Fire-and-forget — errors are swallowed
 * so serving is never delayed.
 */
export function recordView(
  deploymentId: string,
  request: Request,
  tokenId?: string | null,
): void {
  const ua = request.headers.get('user-agent')
  const referrerDomain = parseReferrerDomain(request.headers.get('referer'))
  const countryCode = resolveCountry(request)
  const { deviceClass, browser } = parseUserAgent(ua ?? '')

  void (async () => {
    try {
      const uaClass = await parseUaClassAsync(ua)

      // Skip bots — do not record their views
      if (uaClass === 'bot') return

      const admin = createAdminClient()
      await admin.from('analytics_events').insert({
        deployment_id: deploymentId,
        referrer_domain: referrerDomain,
        ua_class: uaClass,
        token_id: tokenId ?? null,
        country_code: countryCode,
        device_class: deviceClass,
        browser_family: browser,
      })
    } catch {
      // Swallow — analytics must never break serving
    }
  })()
}
