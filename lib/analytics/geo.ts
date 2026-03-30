/**
 * Geographic resolution from request headers.
 * Uses Cloudflare cf-ipcountry header — never stores IP addresses.
 */

/**
 * Resolve the visitor's country from Cloudflare edge headers.
 * Returns an ISO 3166-1 alpha-2 country code, or null if unavailable.
 * Never stores or logs IP addresses — only the country code.
 */
export function resolveCountry(request: Request): string | null {
  // Cloudflare sets this header at the edge
  const country = request.headers.get('cf-ipcountry')

  if (!country) return null

  // Cloudflare uses "XX" for unknown and "T1" for Tor
  if (country === 'XX' || country === 'T1') return null

  // Validate it looks like a 2-letter country code
  if (!/^[A-Z]{2}$/.test(country)) return null

  return country
}

/**
 * Map of ISO 3166-1 alpha-2 codes to flag emoji.
 * Uses regional indicator symbols: each letter maps to a Unicode regional indicator.
 */
export function countryCodeToFlag(code: string): string {
  if (code.length !== 2) return ''
  const upper = code.toUpperCase()
  const first = 0x1f1e6 + (upper.charCodeAt(0) - 65)
  const second = 0x1f1e6 + (upper.charCodeAt(1) - 65)
  return String.fromCodePoint(first) + String.fromCodePoint(second)
}

/**
 * Common country code to name mapping for display.
 */
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  IN: 'India',
  CN: 'China',
  KR: 'South Korea',
  NL: 'Netherlands',
  SE: 'Sweden',
  IT: 'Italy',
  ES: 'Spain',
  MX: 'Mexico',
  RU: 'Russia',
  PL: 'Poland',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  NZ: 'New Zealand',
  SG: 'Singapore',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  IL: 'Israel',
  ZA: 'South Africa',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PT: 'Portugal',
  CZ: 'Czech Republic',
  RO: 'Romania',
  UA: 'Ukraine',
  TH: 'Thailand',
  PH: 'Philippines',
  ID: 'Indonesia',
  MY: 'Malaysia',
  VN: 'Vietnam',
  TR: 'Turkey',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
  PK: 'Pakistan',
}

export function countryCodeToName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()
}
