export const MIME_MAP: Record<string, string> = {
  // Web
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  // Images
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  // Documents
  '.pdf': 'application/pdf',
  // Binary / data
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  // Media
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  // Text
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
}

const BLOCKED_EXTENSIONS = new Set([
  // Executables
  '.exe', '.msi', '.dmg', '.apk', '.iso', '.dll', '.so', '.dylib',
  // Scripts
  '.sh', '.bat', '.cmd', '.ps1', '.psm1', '.psd1',
  // Server-side
  '.php', '.py', '.rb', '.pl', '.cgi', '.asp', '.aspx', '.jsp',
  // Node
  '.node',
])

export function getMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

export function isAllowedFileType(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return !BLOCKED_EXTENSIONS.has(ext)
}
