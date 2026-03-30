/**
 * Lightweight User-Agent parsing using regex.
 * No external dependencies — intentionally simple.
 */

export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

export interface DeviceInfo {
  deviceClass: DeviceClass
  browser: string
}

/**
 * Parse a User-Agent string into device class and browser family.
 * Returns sensible defaults for empty or unrecognized UA strings.
 */
export function parseUserAgent(ua: string): DeviceInfo {
  if (!ua) {
    return { deviceClass: 'desktop', browser: 'Other' }
  }

  const deviceClass = detectDeviceClass(ua)
  const browser = detectBrowser(ua)

  return { deviceClass, browser }
}

function detectDeviceClass(ua: string): DeviceClass {
  const lower = ua.toLowerCase()

  // Tablets first — iPad, Android tablet (no "mobile" keyword), Kindle
  if (/ipad|tablet|kindle|silk|playbook/i.test(lower)) return 'tablet'
  // Android without "mobile" is typically tablet
  if (/android/i.test(lower) && !/mobile/i.test(lower)) return 'tablet'

  // Mobile
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(lower)) {
    return 'mobile'
  }

  return 'desktop'
}

function detectBrowser(ua: string): string {
  // Order matters — check more specific patterns first

  // Edge (Chromium-based Edge contains "Edg/")
  if (/Edg\//i.test(ua)) return 'Edge'

  // Opera / Opera GX
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera'

  // Samsung Browser
  if (/SamsungBrowser/i.test(ua)) return 'Samsung'

  // UC Browser
  if (/UCBrowser/i.test(ua)) return 'UC Browser'

  // Brave (identifies as Chrome but has Brave in UA sometimes)
  if (/Brave/i.test(ua)) return 'Brave'

  // Firefox
  if (/Firefox/i.test(ua) && !/Seamonkey/i.test(ua)) return 'Firefox'

  // Chrome (must be after Edge, Opera, Samsung, Brave checks)
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome'

  // Chromium
  if (/Chromium/i.test(ua)) return 'Chromium'

  // Safari (must be after Chrome check — Chrome UA contains "Safari")
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari'

  // IE
  if (/MSIE|Trident/i.test(ua)) return 'IE'

  return 'Other'
}
