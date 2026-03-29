/**
 * Bot filtering — classifies User-Agent strings as browser, bot, or unknown.
 *
 * Uses an in-memory cache with 5-minute TTL to avoid repeated regex evaluation
 * on the same UA string.
 */

/** Known bot patterns — covers major crawlers and social preview bots. */
const BOT_PATTERNS: RegExp[] = [
  // Search engine crawlers
  /googlebot/i,
  /bingbot/i,
  /slurp/i,            // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /ia_archiver/i,      // Alexa

  // Social / preview bots
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /pinterestbot/i,
  /redditbot/i,

  // Generic bot indicators
  /bot\b/i,
  /crawl/i,
  /spider/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /selenium/i,

  // Feed readers / aggregators
  /feedfetcher/i,
  /feedly/i,

  // Monitoring / uptime
  /uptimerobot/i,
  /pingdom/i,
  /site24x7/i,
  /statuscake/i,

  // AI / LLM crawlers
  /gptbot/i,
  /claudebot/i,
  /anthropic/i,
  /ccbot/i,
  /bytespider/i,
  /petalbot/i,

  // Misc
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /applebot/i,
]

/** Known browser indicators — if present and no bot pattern matches, it is a browser. */
const BROWSER_PATTERNS: RegExp[] = [
  /mozilla\/\d/i,
  /chrome\/\d/i,
  /safari\/\d/i,
  /firefox\/\d/i,
  /edge\/\d/i,
  /opera\/\d/i,
  /opr\/\d/i,
  /vivaldi\/\d/i,
  /brave/i,
  /samsungbrowser/i,
]

export type UaClassification = 'browser' | 'bot' | 'unknown'

/** Cache entry with value and expiry timestamp. */
interface CacheEntry {
  value: UaClassification
  expiresAt: number
}

/** 5-minute TTL in milliseconds. */
const CACHE_TTL_MS = 5 * 60 * 1000

/** In-memory LRU-ish cache — capped at 10 000 entries. */
const cache = new Map<string, CacheEntry>()
const MAX_CACHE_SIZE = 10_000

/**
 * Classify a User-Agent string.
 *
 * Returns 'bot' for known crawlers, 'browser' for real browsers,
 * and 'unknown' when the UA is empty or unrecognisable.
 */
export function classifyUserAgent(ua: string | null | undefined): UaClassification {
  if (!ua || ua.trim().length === 0) return 'unknown'

  // Check cache
  const cached = cache.get(ua)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const result = classify(ua)

  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) {
      cache.delete(firstKey)
    }
  }

  cache.set(ua, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}

function classify(ua: string): UaClassification {
  // Bot check first — some bots include "Mozilla" in their UA
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return 'bot'
  }

  // Browser check
  for (const pattern of BROWSER_PATTERNS) {
    if (pattern.test(ua)) return 'browser'
  }

  return 'unknown'
}

/**
 * Clear the UA classification cache. Useful in tests.
 */
export function clearUaCache(): void {
  cache.clear()
}
