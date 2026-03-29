import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type DeploymentFileRow = Database['public']['Tables']['deployment_files']['Row']

// ── Types ──────────────────────────────────────────────────────────────

export interface NavPage {
  path: string
  label: string
}

export interface DropsitesRedirectRule {
  from: string
  to: string
  status?: 301 | 302
}

export interface DropsitesNavConfig {
  navigation?: {
    pages?: Array<{ path: string; label: string }>
    order?: 'custom' | 'alpha' | 'auto'
  }
  redirects?: DropsitesRedirectRule[]
}

// ── Detection ──────────────────────────────────────────────────────────

const HTML_EXTS = /\.(html|htm)$/i

/**
 * Returns true if the file list contains more than one HTML file.
 */
export function detectMultiPageDeployment(
  files: Pick<DeploymentFileRow, 'file_path'>[],
): boolean {
  let htmlCount = 0
  for (const f of files) {
    if (HTML_EXTS.test(f.file_path)) {
      htmlCount++
      if (htmlCount > 1) return true
    }
  }
  return false
}

// ── Page list extraction ───────────────────────────────────────────────

/**
 * Build a list of navigable pages from the deployment file list.
 *
 * If a `dropsites.json` config with a custom navigation order is provided,
 * that takes priority. Otherwise pages are derived from the HTML files
 * and sorted alphabetically (with index.html first).
 */
export function extractPageList(
  files: Pick<DeploymentFileRow, 'file_path'>[],
  config?: DropsitesNavConfig | null,
): NavPage[] {
  // Custom order from dropsites.json
  if (
    config?.navigation?.order === 'custom' &&
    config.navigation.pages?.length
  ) {
    return config.navigation.pages.map((p) => ({
      path: normalisePath(p.path),
      label: p.label,
    }))
  }

  const htmlFiles = files
    .filter((f) => HTML_EXTS.test(f.file_path))
    .map((f) => f.file_path)

  // Sort alphabetically, but keep index.html (or root index) first
  htmlFiles.sort((a, b) => {
    const aIsIndex = isIndexFile(a)
    const bIsIndex = isIndexFile(b)
    if (aIsIndex && !bIsIndex) return -1
    if (!aIsIndex && bIsIndex) return 1
    return a.localeCompare(b)
  })

  return htmlFiles.map((filePath) => ({
    path: normalisePath(filePath),
    label: labelFromPath(filePath),
  }))
}

function isIndexFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return lower === 'index.html' || lower === 'index.htm'
}

function normalisePath(filePath: string): string {
  // Strip leading slash if present
  return filePath.replace(/^\/+/, '')
}

function labelFromPath(filePath: string): string {
  const basename = filePath.split('/').pop() ?? filePath
  // Remove extension, replace hyphens/underscores with spaces, title-case
  const name = basename
    .replace(/\.(html|htm)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()

  if (!name || name.toLowerCase() === 'index') return 'Home'

  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// ── Title inference ────────────────────────────────────────────────────

/**
 * Extract a page title from HTML content.
 * Priority: <title> tag > first <h1> > filename fallback.
 */
export function inferPageTitle(
  html: string,
  fallbackFilename?: string,
): string {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(/\s+/g, ' ').trim()
    if (title) return title
  }

  // Try first <h1> tag
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match?.[1]) {
    // Strip inner HTML tags from h1 content
    const text = h1Match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (text) return text
  }

  // Fallback to filename
  if (fallbackFilename) {
    return labelFromPath(fallbackFilename)
  }

  return 'Untitled'
}

// ── Widget HTML builder ────────────────────────────────────────────────

/**
 * Build the `<script>` tag to inject before `</body>` in served HTML.
 * The page list is passed as a base64-encoded JSON data attribute.
 */
export function buildNavScriptTag(
  pages: NavPage[],
  currentPath: string,
  slug: string,
): string {
  const pagesJson = JSON.stringify(pages)
  // Use base64 encoding to avoid HTML attribute escaping issues
  const pagesB64 = Buffer.from(pagesJson).toString('base64')

  return (
    `<script async src="/auto-nav-widget.js"` +
    ` data-pages="${pagesB64}"` +
    ` data-current="${escapeAttr(currentPath)}"` +
    ` data-slug="${escapeAttr(slug)}"` +
    `></script>`
  )
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── DB helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the list of HTML files for a deployment version from the database.
 */
export async function getDeploymentHtmlFiles(
  deploymentId: string,
  versionId: string,
): Promise<Pick<DeploymentFileRow, 'file_path'>[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployment_files')
    .select('file_path')
    .eq('deployment_id', deploymentId)
    .eq('version_id', versionId)
    .or('file_path.ilike.%.html,file_path.ilike.%.htm')

  if (error || !data) return []
  return data
}

/**
 * Try to load and parse dropsites.json from the deployment.
 */
export async function loadDropsitesConfig(
  deploymentId: string,
  versionId: string,
): Promise<DropsitesNavConfig | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('deployment_files')
    .select('storage_key')
    .eq('deployment_id', deploymentId)
    .eq('version_id', versionId)
    .eq('file_path', 'dropsites.json')
    .single()

  if (!data) return null

  try {
    // Import storage dynamically to avoid circular deps at module level
    const { storage } = await import('@/lib/storage')
    const bucket = process.env.R2_BUCKET_NAME ?? 'dropsites'
    const { body } = await storage.get(bucket, data.storage_key)

    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk))
    }
    const json = Buffer.concat(chunks).toString('utf-8')
    return JSON.parse(json) as DropsitesNavConfig
  } catch {
    return null
  }
}
