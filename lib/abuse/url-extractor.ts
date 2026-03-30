/**
 * URL extraction utilities for abuse scanning.
 *
 * Extracts URLs from HTML content (href/src attributes) and JavaScript source.
 * Used as part of the deployment scanning pipeline to check extracted URLs
 * against threat intelligence services.
 */

/**
 * Extract all href and src URLs from HTML content.
 * Filters out data: URIs, fragment-only links, and relative paths.
 */
export function extractUrls(html: string): string[] {
  const urls = new Set<string>()

  // Match href="..." and src="..." attributes (single or double quotes, or unquoted)
  const attrPattern = /(?:href|src|action|formaction|data-url)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|([^\s>]+))/gi

  let match: RegExpExecArray | null
  while ((match = attrPattern.exec(html)) !== null) {
    const url = match[1] ?? match[2] ?? match[3]
    if (url) {
      addIfAbsolute(url, urls)
    }
  }

  // Match <meta http-equiv="refresh" content="...;url=...">
  const metaRefreshPattern = /content\s*=\s*["'][^"']*?url\s*=\s*([^"'\s;]+)/gi
  while ((match = metaRefreshPattern.exec(html)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  // Match window.location assignments in inline scripts
  const locationPattern = /(?:window\.)?location\s*(?:\.href)?\s*=\s*["']([^"']+)["']/gi
  while ((match = locationPattern.exec(html)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  return Array.from(urls)
}

/**
 * Extract URLs from JavaScript source code.
 * Looks for string literals that appear to be absolute URLs.
 */
export function extractUrlsFromJs(js: string): string[] {
  const urls = new Set<string>()

  // Match string literals containing URLs (double-quoted)
  const doubleQuotePattern = /"(https?:\/\/[^"\\]+)"/g
  let match: RegExpExecArray | null
  while ((match = doubleQuotePattern.exec(js)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  // Match string literals containing URLs (single-quoted)
  const singleQuotePattern = /'(https?:\/\/[^'\\]+)'/g
  while ((match = singleQuotePattern.exec(js)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  // Match template literals containing URLs
  const templatePattern = /`(https?:\/\/[^`\\]+)`/g
  while ((match = templatePattern.exec(js)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  // Match fetch/XMLHttpRequest calls
  const fetchPattern = /(?:fetch|open)\s*\(\s*["'`](https?:\/\/[^"'`\\]+)["'`]/g
  while ((match = fetchPattern.exec(js)) !== null) {
    if (match[1]) {
      addIfAbsolute(match[1], urls)
    }
  }

  return Array.from(urls)
}

/**
 * Add a URL to the set if it's an absolute HTTP(S) URL.
 */
function addIfAbsolute(url: string, set: Set<string>): void {
  const trimmed = url.trim()

  // Only keep absolute HTTP/HTTPS URLs
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return
  }

  // Skip data: URIs that might have been mismatched
  if (trimmed.startsWith('data:')) return

  // Skip obviously invalid URLs
  try {
    new URL(trimmed)
    set.add(trimmed)
  } catch {
    // Invalid URL, skip
  }
}
