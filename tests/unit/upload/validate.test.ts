// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateFile } from '@/lib/upload/validate'

function makeFile(name: string, size: number, content = 'x'): Parameters<typeof validateFile>[0] {
  return { name, size, buffer: Buffer.from(content) }
}

describe('validateFile', () => {
  describe('valid files', () => {
    it('accepts a normal HTML file', () => {
      const result = validateFile(makeFile('index.html', 100, '<html></html>'))
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts a CSS file', () => {
      const result = validateFile(makeFile('styles.css', 200, 'body {}'))
      expect(result.valid).toBe(true)
    })

    it('accepts a PNG image', () => {
      const result = validateFile(makeFile('logo.png', 1024 * 1024, 'data'))
      expect(result.valid).toBe(true)
    })
  })

  describe('empty files', () => {
    it('rejects a file with size 0', () => {
      const result = validateFile({ name: 'empty.html', size: 0, buffer: Buffer.alloc(0) })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/empty/)
    })

    it('rejects a file with empty buffer', () => {
      const result = validateFile({ name: 'empty.html', size: 0, buffer: Buffer.alloc(0) })
      expect(result.valid).toBe(false)
    })
  })

  describe('blocked extensions', () => {
    it('rejects .exe files', () => {
      const result = validateFile(makeFile('virus.exe', 100))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/\.exe/)
    })

    it('rejects .php files', () => {
      const result = validateFile(makeFile('shell.php', 100))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/\.php/)
    })

    it('rejects .sh files', () => {
      const result = validateFile(makeFile('run.sh', 100))
      expect(result.valid).toBe(false)
    })
  })

  describe('size limits', () => {
    it('rejects an HTML file over 5 MB', () => {
      const fiveMbPlus = 5 * 1024 * 1024 + 1
      const result = validateFile(makeFile('big.html', fiveMbPlus))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/5 MB/)
    })

    it('accepts an HTML file exactly at 5 MB', () => {
      const fiveMb = 5 * 1024 * 1024
      const result = validateFile(makeFile('max.html', fiveMb))
      expect(result.valid).toBe(true)
    })

    it('rejects an image over 20 MB', () => {
      const twentyMbPlus = 20 * 1024 * 1024 + 1
      const result = validateFile(makeFile('huge.png', twentyMbPlus))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/20 MB/)
    })

    it('rejects a font over 2 MB', () => {
      const twoMbPlus = 2 * 1024 * 1024 + 1
      const result = validateFile(makeFile('heavy.woff2', twoMbPlus))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/2 MB/)
    })

    it('rejects a generic file over 10 MB', () => {
      const tenMbPlus = 10 * 1024 * 1024 + 1
      const result = validateFile(makeFile('data.json', tenMbPlus))
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatch(/10 MB/)
    })
  })

  describe('multiple errors', () => {
    it('reports both empty and blocked extension', () => {
      const result = validateFile({ name: 'shell.exe', size: 0, buffer: Buffer.alloc(0) })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
