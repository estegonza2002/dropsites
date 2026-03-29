import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Parse UA class from User-Agent string.
 */
function parseUaClass(ua: string | null): string {
  if (!ua) return 'unknown'
  const lower = ua.toLowerCase()
  if (/bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot/i.test(lower)) return 'bot'
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
export function recordView(deploymentId: string, request: Request): void {
  const ua = request.headers.get('user-agent')
  const uaClass = parseUaClass(ua)

  // Skip bots
  if (uaClass === 'bot') return

  const referrerDomain = parseReferrerDomain(request.headers.get('referer'))

  const admin = createAdminClient()
  void admin
    .from('analytics_events')
    .insert({
      deployment_id: deploymentId,
      referrer_domain: referrerDomain,
      ua_class: uaClass,
    })
    .then(() => {})
}
