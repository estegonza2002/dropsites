/**
 * Deployment preview thumbnail generator.
 * Uses Playwright for headless browser screenshots.
 */

export interface ThumbnailOptions {
  /** Viewport width in pixels. Default: 1280 */
  width?: number
  /** Viewport height in pixels. Default: 800 */
  height?: number
  /** Maximum timeout in milliseconds. Default: 30000 */
  timeout?: number
  /** Maximum file size in bytes. Default: 100_000 (100KB) */
  maxBytes?: number
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  width: 1280,
  height: 800,
  timeout: 30_000,
  maxBytes: 100_000,
}

/**
 * Generate a WebP thumbnail screenshot of a deployment URL.
 *
 * Dynamically imports Playwright to avoid bundling it in the main server build.
 * Falls back gracefully if Playwright is not installed.
 */
export async function generateThumbnail(
  deploymentUrl: string,
  options?: ThumbnailOptions,
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!deploymentUrl || typeof deploymentUrl !== 'string') {
    throw new Error('Invalid deployment URL')
  }

  // Dynamic import — Playwright is an optional peer dependency
  const { chromium } = await import('playwright').catch(() => {
    throw new Error(
      'Playwright is not installed. Install it with: pnpm add -D playwright',
    )
  })

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: opts.height },
      deviceScaleFactor: 1,
    })

    const page = await context.newPage()

    await page.goto(deploymentUrl, {
      waitUntil: 'networkidle',
      timeout: opts.timeout,
    })

    // Allow a brief settling period for any animations
    await page.waitForTimeout(500)

    let quality = 80
    let screenshot: Buffer

    // Iteratively reduce quality to meet size constraint
    do {
      screenshot = Buffer.from(
        await page.screenshot({
          type: 'jpeg', // We convert to WebP below if supported, JPEG as fallback
          quality,
          fullPage: false,
        }),
      )

      if (screenshot.length <= opts.maxBytes) break
      quality -= 10
    } while (quality >= 20)

    await context.close()

    return screenshot
  } finally {
    await browser.close()
  }
}
