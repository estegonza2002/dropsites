import JSZip from 'jszip'

const MAX_FILES = 10_000

export type ExtractedFile = {
  path: string
  content: Buffer
  size: number
}

export class ZipExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipExtractionError'
  }
}

export async function extractZip(buffer: Buffer): Promise<ExtractedFile[]> {
  const zip = await JSZip.loadAsync(buffer)

  const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir)

  if (entries.length > MAX_FILES) {
    throw new ZipExtractionError(
      `ZIP contains more than 10,000 files`
    )
  }

  const files: ExtractedFile[] = []

  for (const [relativePath, entry] of entries) {
    const normalizedPath = relativePath.replace(/\\/g, '/')

    // Reject absolute paths
    if (normalizedPath.startsWith('/')) {
      throw new ZipExtractionError(
        `Absolute paths are not allowed: ${relativePath}`
      )
    }

    // Reject path traversal
    for (const part of normalizedPath.split('/')) {
      if (part === '..') {
        throw new ZipExtractionError(
          `Path traversal is not allowed: ${relativePath}`
        )
      }
    }

    // Reject nested ZIPs
    if (normalizedPath.toLowerCase().endsWith('.zip')) {
      throw new ZipExtractionError(
        `Nested ZIP files are not allowed: ${relativePath}`
      )
    }

    // Reject symlinks (unix permissions: file type bits 0xA000 = symlink)
    const unixPerms = entry.unixPermissions as number | null | undefined
    if (unixPerms != null && (unixPerms & 0xf000) === 0xa000) {
      throw new ZipExtractionError(
        `Symlinks are not allowed: ${relativePath}`
      )
    }

    const content = Buffer.from(await entry.async('arraybuffer'))
    files.push({
      path: normalizedPath.toLowerCase(),
      content,
      size: content.length,
    })
  }

  return files
}
