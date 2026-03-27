import type { Deployment, DeploymentFile } from './resolve'

const HTML_EXTS = new Set(['.html', '.htm'])

function isHtmlFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  const lastDot = lower.lastIndexOf('.')
  return lastDot !== -1 && HTML_EXTS.has(lower.slice(lastDot))
}

export function getServingHeaders(
  deployment: Deployment,
  file: DeploymentFile,
): Record<string, string> {
  const headers: Record<string, string> = {}

  headers['Content-Type'] = file.mime_type

  // HTML: no-cache (re-publish should be visible immediately)
  // Other assets: long-lived cache (content-addressed via SHA-256)
  if (isHtmlFile(file.file_path)) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  } else {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  }

  headers['X-Content-Type-Options'] = 'nosniff'
  headers['X-Robots-Tag'] = deployment.allow_indexing ? 'index, follow' : 'noindex, nofollow'
  headers['ETag'] = `"${file.sha256_hash}"`

  return headers
}
