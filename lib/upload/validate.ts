import { isAllowedFileType } from './mime'

// Per-file type size caps (bytes)
const TYPE_SIZE_CAPS: Array<{ extensions: string[]; maxBytes: number }> = [
  { extensions: ['.html', '.htm', '.css', '.js', '.mjs'], maxBytes: 5 * 1024 * 1024 },
  { extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.svg'], maxBytes: 20 * 1024 * 1024 },
  { extensions: ['.woff', '.woff2', '.ttf', '.otf', '.eot'], maxBytes: 2 * 1024 * 1024 },
]

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per individual file

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export type FileInput = {
  name: string
  size: number
  buffer: Buffer
}

export function validateFile(file: FileInput): ValidationResult {
  const errors: string[] = []

  if (file.size === 0 || file.buffer.length === 0) {
    errors.push(`File "${file.name}" is empty`)
  }

  if (!isAllowedFileType(file.name)) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    errors.push(`File type "${ext}" is not allowed`)
  }

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const typeCap = TYPE_SIZE_CAPS.find((cap) => cap.extensions.includes(ext))
  const maxBytes = typeCap ? typeCap.maxBytes : DEFAULT_MAX_FILE_SIZE

  if (file.size > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024)
    errors.push(
      `File "${file.name}" exceeds the ${maxMb} MB size limit for its type`
    )
  }

  return { valid: errors.length === 0, errors }
}
