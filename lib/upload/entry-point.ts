import type { ExtractedFile } from './zip'

export type EntryPointResult = {
  entryPath: string
  type: 'index' | 'single-html' | 'directory-listing'
}

/**
 * Strip a common leading directory prefix from all file paths.
 * If every file is under a single root folder (e.g. "dist/"), remove it.
 */
function stripCommonPrefix(files: ExtractedFile[]): ExtractedFile[] {
  if (files.length === 0) return files

  const firstParts = files[0].path.split('/')
  if (firstParts.length < 2) return files // already at root

  const rootDir = firstParts[0] + '/'

  if (files.every((f) => f.path.startsWith(rootDir))) {
    return files.map((f) => ({ ...f, path: f.path.slice(rootDir.length) }))
  }

  return files
}

export function detectEntryPoint(files: ExtractedFile[]): EntryPointResult {
  const normalized = stripCommonPrefix(files)

  // 1. Root index.html
  const rootIndex = normalized.find(
    (f) => f.path === 'index.html' || f.path === 'index.htm'
  )
  if (rootIndex) {
    return { entryPath: rootIndex.path, type: 'index' }
  }

  // 2. Single .html file anywhere in the archive
  const htmlFiles = normalized.filter(
    (f) => f.path.endsWith('.html') || f.path.endsWith('.htm')
  )
  if (htmlFiles.length === 1) {
    return { entryPath: htmlFiles[0].path, type: 'single-html' }
  }

  // 3. Directory listing fallback
  return { entryPath: '', type: 'directory-listing' }
}
