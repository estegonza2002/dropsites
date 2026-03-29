import sharp from 'sharp'

/** Threshold in bytes — images below this skip optimization */
const SIZE_THRESHOLD = 200 * 1024 // 200 KB

/** Minimum WebP savings ratio to justify conversion */
const WEBP_SAVINGS_THRESHOLD = 0.20

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp'])

/**
 * Returns true if the file path has an image extension eligible for optimization.
 */
export function isOptimizableImage(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  const lastDot = lower.lastIndexOf('.')
  if (lastDot === -1) return false
  return IMAGE_EXTENSIONS.has(lower.slice(lastDot))
}

export type OptimizeResult = {
  /** The (possibly compressed) buffer */
  content: Buffer
  /** True if the image was modified from the original */
  optimized: boolean
  /** Output MIME type (may change if converted to WebP) */
  mimeType: string
}

/**
 * Optimizes an image buffer if it exceeds the size threshold.
 *
 * - Compresses the image lossily (quality 80).
 * - Converts to WebP if savings exceed 20%.
 * - Returns the original unchanged if below 200 KB or if optimization
 *   does not reduce size.
 *
 * NOTE: Per CLAUDE.md rule #2, this is applied to the *stored* copy,
 * not the original source. The original uploaded content is never modified
 * in place — the optimized version is stored alongside or replaces the
 * storage copy before first serve.
 */
export async function optimizeImage(
  content: Buffer,
  filePath: string,
  originalMimeType: string,
): Promise<OptimizeResult> {
  // Skip small images
  if (content.length <= SIZE_THRESHOLD) {
    return { content, optimized: false, mimeType: originalMimeType }
  }

  // Skip non-optimizable formats
  if (!isOptimizableImage(filePath)) {
    return { content, optimized: false, mimeType: originalMimeType }
  }

  // Already WebP — just compress
  if (filePath.toLowerCase().endsWith('.webp')) {
    const compressed = await sharp(content)
      .webp({ quality: 80 })
      .toBuffer()

    if (compressed.length < content.length) {
      return { content: compressed, optimized: true, mimeType: 'image/webp' }
    }
    return { content, optimized: false, mimeType: originalMimeType }
  }

  try {
    // Try the original format first (lossy compression)
    const image = sharp(content)
    const metadata = await image.metadata()
    let compressedOriginal: Buffer

    switch (metadata.format) {
      case 'jpeg':
        compressedOriginal = await sharp(content).jpeg({ quality: 80 }).toBuffer()
        break
      case 'png':
        compressedOriginal = await sharp(content).png({ compressionLevel: 9 }).toBuffer()
        break
      case 'gif':
        // sharp gif support is limited; return original
        compressedOriginal = content
        break
      default:
        compressedOriginal = await sharp(content).jpeg({ quality: 80 }).toBuffer()
    }

    // Try WebP conversion
    const webpBuffer = await sharp(content).webp({ quality: 80 }).toBuffer()

    const webpSavings = 1 - webpBuffer.length / content.length

    // Choose WebP if savings exceed threshold and it's smaller than the
    // compressed original format
    if (webpSavings >= WEBP_SAVINGS_THRESHOLD && webpBuffer.length < compressedOriginal.length) {
      return { content: webpBuffer, optimized: true, mimeType: 'image/webp' }
    }

    // Otherwise use the compressed original if it's actually smaller
    if (compressedOriginal.length < content.length) {
      return { content: compressedOriginal, optimized: true, mimeType: originalMimeType }
    }

    return { content, optimized: false, mimeType: originalMimeType }
  } catch {
    // If sharp fails (corrupted image, unsupported variant), return original
    return { content, optimized: false, mimeType: originalMimeType }
  }
}
