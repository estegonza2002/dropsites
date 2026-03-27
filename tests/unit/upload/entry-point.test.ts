// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { detectEntryPoint } from '@/lib/upload/entry-point'
import type { ExtractedFile } from '@/lib/upload/zip'

function makeFiles(paths: string[]): ExtractedFile[] {
  return paths.map((path) => ({ path, content: Buffer.from(''), size: 0 }))
}

describe('detectEntryPoint', () => {
  describe('root index.html', () => {
    it('detects index.html at root', () => {
      const result = detectEntryPoint(makeFiles(['index.html', 'style.css']))
      expect(result.entryPath).toBe('index.html')
      expect(result.type).toBe('index')
    })

    it('detects index.htm at root', () => {
      const result = detectEntryPoint(makeFiles(['index.htm', 'style.css']))
      expect(result.entryPath).toBe('index.htm')
      expect(result.type).toBe('index')
    })

    it('prefers root index.html over single HTML file in subdirectory', () => {
      const result = detectEntryPoint(
        makeFiles(['index.html', 'pages/about.html', 'style.css'])
      )
      expect(result.entryPath).toBe('index.html')
      expect(result.type).toBe('index')
    })
  })

  describe('single HTML file', () => {
    it('returns single .html file when no root index', () => {
      const result = detectEntryPoint(makeFiles(['report.html', 'style.css']))
      expect(result.entryPath).toBe('report.html')
      expect(result.type).toBe('single-html')
    })

    it('returns single .htm file', () => {
      const result = detectEntryPoint(makeFiles(['doc.htm']))
      expect(result.entryPath).toBe('doc.htm')
      expect(result.type).toBe('single-html')
    })
  })

  describe('directory listing fallback', () => {
    it('falls back when multiple HTML files and no root index', () => {
      const result = detectEntryPoint(
        makeFiles(['about.html', 'contact.html', 'style.css'])
      )
      expect(result.type).toBe('directory-listing')
      expect(result.entryPath).toBe('')
    })

    it('falls back when no HTML files at all', () => {
      const result = detectEntryPoint(makeFiles(['data.json', 'image.png']))
      expect(result.type).toBe('directory-listing')
    })
  })

  describe('subdirectory prefix stripping', () => {
    it('strips common root directory and finds index.html', () => {
      const result = detectEntryPoint(
        makeFiles(['dist/index.html', 'dist/style.css', 'dist/app.js'])
      )
      expect(result.entryPath).toBe('index.html')
      expect(result.type).toBe('index')
    })

    it('does not strip when files are not under a common directory', () => {
      const result = detectEntryPoint(
        makeFiles(['a/index.html', 'b/style.css'])
      )
      // 'a' and 'b' differ — no common prefix stripped.
      // 'a/index.html' is the only HTML file, so single-html is returned.
      expect(result.type).toBe('single-html')
      expect(result.entryPath).toBe('a/index.html')
    })

    it('strips prefix and finds single HTML', () => {
      const result = detectEntryPoint(
        makeFiles(['build/report.html', 'build/assets/chart.png'])
      )
      expect(result.entryPath).toBe('report.html')
      expect(result.type).toBe('single-html')
    })
  })

  describe('empty archive', () => {
    it('returns directory-listing for empty file list', () => {
      const result = detectEntryPoint([])
      expect(result.type).toBe('directory-listing')
    })
  })
})
