// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { classifyUserAgent, clearUaCache } from '@/lib/serving/bot-filter'

beforeEach(() => {
  clearUaCache()
})

// ── Bot classification ──────────────────────────────────────────────

describe('classifyUserAgent — bots', () => {
  const botUAs = [
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    ['Slurp (Yahoo)', 'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)'],
    ['DuckDuckBot', 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)'],
    ['Baiduspider', 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'],
    ['YandexBot', 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'],
    ['facebookexternalhit', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
    ['Twitterbot', 'Twitterbot/1.0'],
    ['LinkedInBot', 'LinkedInBot/1.0 (compatible; Mozilla/5.0)'],
    ['Slackbot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'],
    ['Discordbot', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'],
    ['GPTBot', 'GPTBot/1.0 (+https://openai.com/gptbot)'],
    ['ClaudeBot', 'ClaudeBot/1.0'],
    ['CCBot', 'CCBot/2.0 (https://commoncrawl.org/faq/)'],
    ['AhrefsBot', 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'],
    ['SemrushBot', 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)'],
    ['UptimeRobot', 'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)'],
    ['HeadlessChrome', 'Mozilla/5.0 HeadlessChrome/90.0.4430.212'],
    ['Puppeteer', 'Mozilla/5.0 (compatible; Puppeteer)'],
    ['PetalBot', 'Mozilla/5.0 (compatible; PetalBot; +https://webmaster.petalsearch.com/)'],
    ['WhatsApp', 'WhatsApp/2.21.12.21 A'],
    ['TelegramBot', 'TelegramBot (like TwitterBot)'],
    ['Applebot', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Applebot/0.1)'],
  ] as const

  for (const [name, ua] of botUAs) {
    it(`classifies ${name} as bot`, () => {
      expect(classifyUserAgent(ua)).toBe('bot')
    })
  }
})

// ── Browser classification ──────────────────────────────────────────

describe('classifyUserAgent — browsers', () => {
  const browserUAs = [
    ['Chrome desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    ['Firefox desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'],
    ['Safari desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'],
    ['Edge desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edge/120.0.0.0'],
    ['Chrome mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'],
    ['Safari mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'],
  ] as const

  for (const [name, ua] of browserUAs) {
    it(`classifies ${name} as browser`, () => {
      expect(classifyUserAgent(ua)).toBe('browser')
    })
  }
})

// ── Unknown classification ──────────────────────────────────────────

describe('classifyUserAgent — unknown', () => {
  it('returns unknown for null', () => {
    expect(classifyUserAgent(null)).toBe('unknown')
  })

  it('returns unknown for undefined', () => {
    expect(classifyUserAgent(undefined)).toBe('unknown')
  })

  it('returns unknown for empty string', () => {
    expect(classifyUserAgent('')).toBe('unknown')
  })

  it('returns unknown for whitespace-only string', () => {
    expect(classifyUserAgent('   ')).toBe('unknown')
  })

  it('returns unknown for unrecognisable UA', () => {
    expect(classifyUserAgent('curl/7.68.0')).toBe('unknown')
  })
})

// ── Caching ─────────────────────────────────────────────────────────

describe('classifyUserAgent — cache', () => {
  it('returns same result on repeated calls (cache hit)', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    const first = classifyUserAgent(ua)
    const second = classifyUserAgent(ua)
    expect(first).toBe('browser')
    expect(second).toBe('browser')
  })

  it('clearUaCache resets the cache', () => {
    const ua = 'Googlebot/2.1'
    classifyUserAgent(ua)
    clearUaCache()
    // Should still return the correct value after cache clear
    expect(classifyUserAgent(ua)).toBe('bot')
  })
})
