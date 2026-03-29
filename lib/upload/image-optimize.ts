const IMAGE_THRESHOLD = 200 * 1024 // 200KB

interface OptimizeResult {
  buffer: Buffer
  savedBytes: number
  convertedTo?: string
}

/**
 * Optimize an image buffer if it exceeds the size threshold.
 * Currently a passthrough — actual compression requires sharp or similar
 * (to be added when the dependency is approved).
 */
export async function optimizeImage(
  buffer: Buffer,
  mime: string,
): Promise<OptimizeResult> {
  // Only process images above threshold
  if (buffer.length <= IMAGE_THRESHOLD) {
    return { buffer, savedBytes: 0 }
  }

  // Image types we can optimize
  const optimizable = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!optimizable.includes(mime)) {
    return { buffer, savedBytes: 0 }
  }

  // Placeholder: in production, use sharp for compression/WebP conversion
  // For now, return the original buffer with zero savings
  // TODO: Add sharp dependency and implement actual compression
  return { buffer, savedBytes: 0 }
}
