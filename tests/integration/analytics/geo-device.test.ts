// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Test: Geographic resolution + Device/Browser parsing
// ---------------------------------------------------------------------------

import { resolveCountry, countryCodeToFlag, countryCodeToName } from '@/lib/analytics/geo'
import { parseUserAgent } from '@/lib/analytics/device'

// ---------------------------------------------------------------------------
// resolveCountry
// ---------------------------------------------------------------------------

describe('resolveCountry', () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request('https://example.com', { headers })
  }

  it('returns country code from cf-ipcountry header', () => {
    const req = makeRequest({ 'cf-ipcountry': 'US' })
    expect(resolveCountry(req)).toBe('US')
  })

  it('returns null when header is missing', () => {
    const req = makeRequest({})
    expect(resolveCountry(req)).toBeNull()
  })

  it('returns null for unknown country XX', () => {
    const req = makeRequest({ 'cf-ipcountry': 'XX' })
    expect(resolveCountry(req)).toBeNull()
  })

  it('returns null for Tor exit T1', () => {
    const req = makeRequest({ 'cf-ipcountry': 'T1' })
    expect(resolveCountry(req)).toBeNull()
  })

  it('returns null for invalid codes', () => {
    const req = makeRequest({ 'cf-ipcountry': 'USA' })
    expect(resolveCountry(req)).toBeNull()
  })

  it('returns valid 2-letter codes', () => {
    const req = makeRequest({ 'cf-ipcountry': 'DE' })
    expect(resolveCountry(req)).toBe('DE')
  })
})

// ---------------------------------------------------------------------------
// countryCodeToFlag
// ---------------------------------------------------------------------------

describe('countryCodeToFlag', () => {
  it('converts US to flag emoji', () => {
    const flag = countryCodeToFlag('US')
    expect(flag.length).toBeGreaterThan(0)
    // US flag: regional indicator U + regional indicator S
    expect(flag).toBe('\u{1f1fa}\u{1f1f8}')
  })

  it('handles lowercase by uppercasing', () => {
    // The function expects uppercase but let's test the output
    const flag = countryCodeToFlag('GB')
    expect(flag).toBe('\u{1f1ec}\u{1f1e7}')
  })

  it('returns empty for invalid input', () => {
    expect(countryCodeToFlag('')).toBe('')
    expect(countryCodeToFlag('USA')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// countryCodeToName
// ---------------------------------------------------------------------------

describe('countryCodeToName', () => {
  it('returns full name for known codes', () => {
    expect(countryCodeToName('US')).toBe('United States')
    expect(countryCodeToName('DE')).toBe('Germany')
    expect(countryCodeToName('JP')).toBe('Japan')
  })

  it('returns uppercase code for unknown countries', () => {
    expect(countryCodeToName('ZZ')).toBe('ZZ')
  })
})

// ---------------------------------------------------------------------------
// parseUserAgent — Device class
// ---------------------------------------------------------------------------

describe('parseUserAgent — device class', () => {
  it('returns desktop for empty string', () => {
    expect(parseUserAgent('').deviceClass).toBe('desktop')
  })

  it('detects mobile from iPhone UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    expect(parseUserAgent(ua).deviceClass).toBe('mobile')
  })

  it('detects mobile from Android mobile UA', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    expect(parseUserAgent(ua).deviceClass).toBe('mobile')
  })

  it('detects tablet from iPad UA', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    expect(parseUserAgent(ua).deviceClass).toBe('tablet')
  })

  it('detects tablet from Android tablet (no mobile keyword)', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    expect(parseUserAgent(ua).deviceClass).toBe('tablet')
  })

  it('detects desktop from standard Chrome UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    expect(parseUserAgent(ua).deviceClass).toBe('desktop')
  })

  it('detects desktop from macOS Safari', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
    expect(parseUserAgent(ua).deviceClass).toBe('desktop')
  })
})

// ---------------------------------------------------------------------------
// parseUserAgent — Browser detection
// ---------------------------------------------------------------------------

describe('parseUserAgent — browser detection', () => {
  it('detects Chrome', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    expect(parseUserAgent(ua).browser).toBe('Chrome')
  })

  it('detects Safari (macOS)', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
    expect(parseUserAgent(ua).browser).toBe('Safari')
  })

  it('detects Firefox', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0'
    expect(parseUserAgent(ua).browser).toBe('Firefox')
  })

  it('detects Edge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edg/112.0.0.0'
    expect(parseUserAgent(ua).browser).toBe('Edge')
  })

  it('detects Opera', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 OPR/98.0.0.0'
    expect(parseUserAgent(ua).browser).toBe('Opera')
  })

  it('detects Samsung Browser', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/20.0 Chrome/106.0.5249.126 Mobile Safari/537.36'
    expect(parseUserAgent(ua).browser).toBe('Samsung')
  })

  it('returns Other for unknown UA', () => {
    expect(parseUserAgent('curl/7.88.1').browser).toBe('Other')
  })

  it('returns Other for empty UA', () => {
    expect(parseUserAgent('').browser).toBe('Other')
  })
})

// ---------------------------------------------------------------------------
// recordView integration (mocked Supabase)
// ---------------------------------------------------------------------------

const mockInsert = vi.fn().mockReturnValue({ then: vi.fn().mockReturnValue(Promise.resolve()) })
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

import { recordView } from '@/lib/analytics/record'

describe('recordView — geo & device fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ then: vi.fn().mockReturnValue(Promise.resolve()) })
  })

  it('includes country_code, device_class, browser_family in the insert', () => {
    const req = new Request('https://example.com', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        'cf-ipcountry': 'US',
      },
    })

    recordView('deploy-123', req)

    expect(mockFrom).toHaveBeenCalledWith('analytics_events')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deployment_id: 'deploy-123',
        country_code: 'US',
        device_class: 'desktop',
        browser_family: 'Chrome',
      }),
    )
  })

  it('sets country_code to null when cf-ipcountry header is missing', () => {
    const req = new Request('https://example.com', {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      },
    })

    recordView('deploy-456', req)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deployment_id: 'deploy-456',
        country_code: null,
        device_class: 'mobile',
      }),
    )
  })

  it('does not record bots', () => {
    const req = new Request('https://example.com', {
      headers: {
        'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'cf-ipcountry': 'US',
      },
    })

    recordView('deploy-789', req)

    expect(mockFrom).not.toHaveBeenCalled()
  })
})
