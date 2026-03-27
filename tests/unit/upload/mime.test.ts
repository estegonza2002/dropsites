// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getMimeType, isAllowedFileType, MIME_MAP } from '@/lib/upload/mime'

describe('MIME_MAP', () => {
  it('covers all required extensions', () => {
    const required = [
      '.html', '.htm', '.css', '.js', '.mjs', '.json', '.xml',
      '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.pdf', '.wasm', '.mp4', '.webm', '.mp3', '.ogg', '.wav',
      '.txt', '.csv', '.md', '.map', '.avif',
    ]
    for (const ext of required) {
      expect(MIME_MAP[ext], `Missing MIME for ${ext}`).toBeDefined()
    }
  })
})

describe('getMimeType', () => {
  it('returns correct MIME for known extensions', () => {
    expect(getMimeType('index.html')).toBe('text/html')
    expect(getMimeType('styles.css')).toBe('text/css')
    expect(getMimeType('app.js')).toBe('text/javascript')
    expect(getMimeType('logo.png')).toBe('image/png')
    expect(getMimeType('font.woff2')).toBe('font/woff2')
    expect(getMimeType('doc.pdf')).toBe('application/pdf')
  })

  it('is case-insensitive for extension', () => {
    expect(getMimeType('index.HTML')).toBe('text/html')
    expect(getMimeType('IMAGE.PNG')).toBe('image/png')
  })

  it('returns application/octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream')
    expect(getMimeType('file.unknown')).toBe('application/octet-stream')
  })

  it('returns application/octet-stream for files with no extension', () => {
    expect(getMimeType('Makefile')).toBe('application/octet-stream')
  })
})

describe('isAllowedFileType', () => {
  it('allows standard web asset types', () => {
    expect(isAllowedFileType('index.html')).toBe(true)
    expect(isAllowedFileType('app.js')).toBe(true)
    expect(isAllowedFileType('style.css')).toBe(true)
    expect(isAllowedFileType('image.png')).toBe(true)
    expect(isAllowedFileType('font.woff2')).toBe(true)
    expect(isAllowedFileType('doc.pdf')).toBe(true)
  })

  it('blocks executable file types', () => {
    expect(isAllowedFileType('malware.exe')).toBe(false)
    expect(isAllowedFileType('setup.msi')).toBe(false)
    expect(isAllowedFileType('app.dmg')).toBe(false)
    expect(isAllowedFileType('native.dll')).toBe(false)
    expect(isAllowedFileType('lib.so')).toBe(false)
    expect(isAllowedFileType('lib.dylib')).toBe(false)
  })

  it('blocks shell scripts', () => {
    expect(isAllowedFileType('run.sh')).toBe(false)
    expect(isAllowedFileType('run.bat')).toBe(false)
    expect(isAllowedFileType('run.cmd')).toBe(false)
    expect(isAllowedFileType('run.ps1')).toBe(false)
  })

  it('blocks server-side scripts', () => {
    expect(isAllowedFileType('index.php')).toBe(false)
    expect(isAllowedFileType('app.py')).toBe(false)
    expect(isAllowedFileType('app.rb')).toBe(false)
    expect(isAllowedFileType('app.pl')).toBe(false)
    expect(isAllowedFileType('app.asp')).toBe(false)
    expect(isAllowedFileType('app.aspx')).toBe(false)
    expect(isAllowedFileType('app.jsp')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isAllowedFileType('MALWARE.EXE')).toBe(false)
    expect(isAllowedFileType('INDEX.PHP')).toBe(false)
  })
})
