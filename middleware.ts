import { NextRequest, NextResponse } from 'next/server'
import { resolveDeployment, resolveFile } from '@/lib/serving/resolve'
import { getServingHeaders, getDashboardSecurityHeaders } from '@/lib/serving/headers'
import { verifyToken } from '@/lib/serving/password'
import { resolveSlugRedirect } from '@/lib/serving/redirect'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import {
  detectMultiPageDeployment,
  extractPageList,
  getDeploymentHtmlFiles,
  loadDropsitesConfig,
  buildNavScriptTag,
  type DropsitesRedirectRule,
} from '@/lib/serving/auto-nav'
import { recordView } from '@/lib/analytics/record'

// Paths handled by the App Router — pass straight through
const PLATFORM_PREFIXES = new Set([
  'dashboard',
  'api',
  'login',
  'signup',
  'auth',
  'settings',
  'admin',
  'invite',
  '_system',
  'p',
  's',
  'pricing',
  'dmca',
  'terms',
  'privacy',
  'cookies',
  'acceptable-use',
  'changelog',
  '_serve',
])

// Paths that get strict dashboard CSP
const DASHBOARD_CSP_PREFIXES = new Set([
  'dashboard',
  'login',
  'signup',
  'settings',
  'admin',
  'invite',
])

// Secret verified by /_serve to confirm the request came from middleware
const INTERNAL_SERVE_SECRET =
  process.env.INTERNAL_SERVE_SECRET ?? 'dropsites-internal'

/**
 * Detect path traversal attempts.
 * Returns true if the path is safe, false if it contains traversal.
 */
function isPathSafe(path: string): boolean {
  // Decode percent-encoded sequences to catch %2e%2e etc.
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // Malformed encoding — reject
    return false
  }

  // Check for .. in any segment
  const segments = decoded.split('/')
  for (const segment of segments) {
    if (segment === '..' || segment === '..%00' || segment.includes('\\..')) {
      return false
    }
  }

  // Also reject backslash traversal (Windows-style)
  if (decoded.includes('\\')) return false

  // Reject null bytes
  if (decoded.includes('\0')) return false

  return true
}

/**
 * Match a requested path against dropsites.json redirect rules.
 */
function matchRedirectRule(
  rules: DropsitesRedirectRule[],
  requestPath: string,
): DropsitesRedirectRule | null {
  for (const rule of rules) {
    if (rule.from === requestPath) {
      return rule
    }
  }
  return null
}

/**
 * Generate a synthetic robots.txt based on the deployment's allow_indexing flag.
 */
function generateRobotsTxt(allowIndexing: boolean): string {
  if (allowIndexing) {
    return 'User-agent: *\nAllow: /\n'
  }
  return 'User-agent: *\nDisallow: /\n'
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Root path — pass through
  if (pathname === '/') return NextResponse.next()

  // ── Path traversal prevention ─────────────────────────────────────
  if (!isPathSafe(pathname)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // ── Auth guard ────────────────────────────────────────────────────
  // Must refresh the session on every request so cookies stay valid.
  if (pathname.startsWith('/dashboard')) {
    const response = NextResponse.next()
    const supabase = createMiddlewareClient(request, response)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Signal to the dashboard layout whether the user's email is unverified
    if (!session.user.email_confirmed_at) {
      response.headers.set('x-email-unverified', '1')
    }
    // Apply dashboard security headers
    const secHeaders = getDashboardSecurityHeaders()
    for (const [key, value] of Object.entries(secHeaders)) {
      response.headers.set(key, value)
    }
    return response
  }

  // Redirect authenticated users away from login/signup
  if (pathname === '/login' || pathname === '/signup') {
    const response = NextResponse.next()
    const supabase = createMiddlewareClient(request, response)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Apply dashboard security headers to login/signup
    const secHeaders = getDashboardSecurityHeaders()
    for (const [key, value] of Object.entries(secHeaders)) {
      response.headers.set(key, value)
    }
    return response
  }

  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  // Pass through platform paths, Next.js internals, and dot-files
  if (
    !firstSegment ||
    PLATFORM_PREFIXES.has(firstSegment) ||
    firstSegment.startsWith('_') ||
    firstSegment.startsWith('.')
  ) {
    // Apply dashboard CSP to platform pages that render UI
    if (firstSegment && DASHBOARD_CSP_PREFIXES.has(firstSegment)) {
      const response = NextResponse.next()
      const secHeaders = getDashboardSecurityHeaders()
      for (const [key, value] of Object.entries(secHeaders)) {
        response.headers.set(key, value)
      }
      return response
    }
    return NextResponse.next()
  }

  const slug = firstSegment
  // Remaining segments form the file path within the deployment
  const requestedPath = segments.slice(1).join('/')

  // ── Path traversal in sub-path ────────────────────────────────────
  if (requestedPath && !isPathSafe(requestedPath)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // ── Resolve deployment ────────────────────────────────────────────
  const deployment = await resolveDeployment(slug)

  if (!deployment) {
    // Check for slug redirect before returning 404
    const redirect = await resolveSlugRedirect(slug)
    if (redirect) {
      const newPath = requestedPath
        ? `/${redirect.newSlug}/${requestedPath}`
        : `/${redirect.newSlug}`
      return NextResponse.redirect(new URL(newPath, request.url), 301)
    }
    return new NextResponse('Not Found', { status: 404 })
  }

  // ── Security checks ───────────────────────────────────────────────
  if (deployment.is_disabled || deployment.is_admin_disabled) {
    return NextResponse.redirect(new URL('/_system/unavailable', request.url))
  }

  if (deployment.expires_at && new Date(deployment.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/_system/expired', request.url))
  }

  // ── Robots.txt serving (S39) ───────────────────────────────────────
  if (requestedPath === 'robots.txt' && deployment.current_version_id) {
    // Check if the deployment has a custom robots.txt
    const customRobots = await resolveFile(
      deployment.id,
      deployment.current_version_id,
      'robots.txt',
    )
    if (customRobots) {
      return serveFile(request, deployment, customRobots, 200)
    }
    // Generate synthetic robots.txt based on allow_indexing
    const body = generateRobotsTxt(deployment.allow_indexing)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  if (deployment.password_hash) {
    const sessionCookie = request.cookies.get(`ds-auth-${deployment.id}`)
    const tokenValue = sessionCookie?.value
    const isValid =
      tokenValue != null &&
      (await verifyToken(tokenValue, deployment.id))

    if (!isValid) {
      return NextResponse.redirect(new URL(`/p/${slug}`, request.url))
    }
  }

  // ── Resolve file ──────────────────────────────────────────────────
  if (!deployment.current_version_id) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Default to entry_path when requesting the deployment root
  let effectivePath = requestedPath || deployment.entry_path

  // Normalise trailing slash — try appending index.html
  if (effectivePath.endsWith('/')) {
    effectivePath += 'index.html'
  }

  let file = await resolveFile(
    deployment.id,
    deployment.current_version_id,
    effectivePath,
  )

  // If a directory-like path was requested, retry with /index.html
  if (!file && !requestedPath.includes('.')) {
    const indexPath = requestedPath
      ? `${requestedPath}/index.html`
      : 'index.html'
    file = await resolveFile(
      deployment.id,
      deployment.current_version_id,
      indexPath,
    )
    if (file) effectivePath = indexPath
  }

  if (!file) {
    // ── dropsites.json redirect rules (S38) ─────────────────────────
    try {
      const config = await loadDropsitesConfig(
        deployment.id,
        deployment.current_version_id,
      )
      if (config?.redirects?.length) {
        const match = matchRedirectRule(
          config.redirects,
          requestedPath ? `/${requestedPath}` : '/',
        )
        if (match) {
          const target = match.to.startsWith('/')
            ? `/${slug}${match.to}`
            : match.to
          return NextResponse.redirect(
            new URL(target, request.url),
            match.status ?? 301,
          )
        }
      }
    } catch {
      // Non-fatal — skip redirect check
    }

    // Try deployment-level custom 404.html
    const custom404 = await resolveFile(
      deployment.id,
      deployment.current_version_id,
      '404.html',
    )
    if (custom404) {
      return serveFile(request, deployment, custom404, 404)
    }
    return new NextResponse('Not Found', { status: 404 })
  }

  // ── Conditional GET ───────────────────────────────────────────────
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch === `"${file.sha256_hash}"`) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: `"${file.sha256_hash}"` },
    })
  }

  // ── Auto-navigation injection ──────────────────────────────────────
  let autoNavScript: string | null = null
  const isHtml = /\.(html|htm)$/i.test(effectivePath)

  if (isHtml && deployment.auto_nav_enabled && deployment.current_version_id) {
    try {
      const [htmlFiles, dropsitesConfig] = await Promise.all([
        getDeploymentHtmlFiles(
          deployment.id,
          deployment.current_version_id,
        ),
        loadDropsitesConfig(
          deployment.id,
          deployment.current_version_id,
        ),
      ])

      if (detectMultiPageDeployment(htmlFiles)) {
        const pages = extractPageList(htmlFiles, dropsitesConfig)
        if (pages.length > 1) {
          autoNavScript = buildNavScriptTag(pages, effectivePath, slug)
        }
      }
    } catch {
      // Non-fatal — skip auto-nav if detection fails
    }
  }

  // Record view (fire-and-forget — never delays serving)
  recordView(deployment.id, request)

  return serveFile(request, deployment, file, 200, autoNavScript)
}

function serveFile(
  request: NextRequest,
  deployment: Parameters<typeof getServingHeaders>[0],
  file: Parameters<typeof getServingHeaders>[1],
  status: number,
  autoNavScript?: string | null,
): NextResponse {
  const servingHeaders = getServingHeaders(deployment, file)

  // Pass storage key + metadata to the /_serve route via request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-storage-key', file.storage_key)
  requestHeaders.set('x-content-type', file.mime_type)
  requestHeaders.set('x-etag', file.sha256_hash)
  requestHeaders.set('x-serve-secret', INTERNAL_SERVE_SECRET)
  requestHeaders.set('x-response-status', String(status))

  if (autoNavScript) {
    requestHeaders.set('x-auto-nav-inject', autoNavScript)
  }

  const serveUrl = new URL('/_serve', request.url)
  const response = NextResponse.rewrite(serveUrl, {
    request: { headers: requestHeaders },
  })

  // Attach serving headers to the final response
  for (const [key, value] of Object.entries(servingHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals, /_serve (rewrite target),
    // and common static asset patterns
    '/((?!_next/static|_next/image|_serve|favicon\\.ico|robots\\.txt).*)',
  ],
}
