/**
 * Google Safe Browsing Lookup API v4 integration.
 *
 * Checks URLs against Google's threat lists (malware, social engineering,
 * unwanted software, potentially harmful applications).
 *
 * Requires SAFE_BROWSING_API_KEY env var.
 */

export interface SafeBrowsingResult {
  url: string
  isThreat: boolean
  threatTypes: string[]
}

interface SafeBrowsingResponse {
  matches?: Array<{
    threatType: string
    platformType: string
    threat: { url: string }
    cacheDuration: string
    threatEntryType: string
  }>
}

const API_BASE = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

const THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'POTENTIALLY_HARMFUL_APPLICATION',
]

const PLATFORM_TYPES = ['ANY_PLATFORM']
const THREAT_ENTRY_TYPES = ['URL']

function getApiKey(): string {
  const key = process.env.SAFE_BROWSING_API_KEY
  if (!key) {
    throw new Error('SAFE_BROWSING_API_KEY environment variable is required')
  }
  return key
}

/**
 * Check a single URL against Google Safe Browsing.
 */
export async function checkUrl(url: string): Promise<SafeBrowsingResult> {
  const results = await checkUrls([url])
  return results[0]
}

/**
 * Batch-check multiple URLs against Google Safe Browsing.
 * The API supports up to 500 URLs per request.
 */
export async function checkUrls(urls: string[]): Promise<SafeBrowsingResult[]> {
  if (urls.length === 0) return []

  const apiKey = getApiKey()

  const body = {
    client: {
      clientId: 'dropsites',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: THREAT_TYPES,
      platformTypes: PLATFORM_TYPES,
      threatEntryTypes: THREAT_ENTRY_TYPES,
      threatEntries: urls.map((url) => ({ url })),
    },
  }

  const response = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      `Safe Browsing API error: ${response.status} ${response.statusText}`,
    )
  }

  const data: SafeBrowsingResponse = await response.json()

  // Build a map of url -> threat types from matches
  const threatMap = new Map<string, string[]>()
  if (data.matches) {
    for (const match of data.matches) {
      const existing = threatMap.get(match.threat.url) ?? []
      existing.push(match.threatType)
      threatMap.set(match.threat.url, existing)
    }
  }

  return urls.map((url) => {
    const threatTypes = threatMap.get(url) ?? []
    return {
      url,
      isThreat: threatTypes.length > 0,
      threatTypes,
    }
  })
}
