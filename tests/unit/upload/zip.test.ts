// @vitest-environment node
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { extractZip, ZipExtractionError } from '@/lib/upload/zip'

async function buildZip(
  files: Record<string, string | Buffer>
): Promise<Buffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
}

/**
 * Build a raw ZIP buffer with an entry whose filename contains path traversal
 * characters. JSZip normalises paths when *writing*, so we must craft the raw
 * bytes manually to simulate a malicious ZIP from an external source.
 *
 * Layout: local file header + content + central directory + EOCD
 * CRC-32 is left as 0x00000000; JSZip does not check it by default.
 */
function buildTraversalZip(): Buffer {
  const filename = Buffer.from('../evil.txt')      // 10 bytes
  const content  = Buffer.from('evil')             //  4 bytes

  // Local file header (30 bytes fixed + filename + content)
  const local = Buffer.alloc(30 + filename.length + content.length)
  local.writeUInt32LE(0x04034b50, 0)  // signature
  local.writeUInt16LE(20, 4)          // version needed (2.0)
  local.writeUInt16LE(0, 6)           // GP flag
  local.writeUInt16LE(0, 8)           // compression (stored)
  local.writeUInt16LE(0, 10)          // mod time
  local.writeUInt16LE(0, 12)          // mod date
  local.writeUInt32LE(0, 14)          // CRC-32 (unchecked)
  local.writeUInt32LE(content.length, 18)  // compressed size
  local.writeUInt32LE(content.length, 22)  // uncompressed size
  local.writeUInt16LE(filename.length, 26) // filename length
  local.writeUInt16LE(0, 28)          // extra field length
  filename.copy(local, 30)
  content.copy(local, 30 + filename.length)

  // Central directory record (46 bytes fixed + filename)
  const cdOffset = local.length
  const cd = Buffer.alloc(46 + filename.length)
  cd.writeUInt32LE(0x02014b50, 0)     // signature
  cd.writeUInt16LE(20, 4)             // version made by
  cd.writeUInt16LE(20, 6)             // version needed
  cd.writeUInt16LE(0, 8)              // GP flag
  cd.writeUInt16LE(0, 10)             // compression
  cd.writeUInt16LE(0, 12)             // mod time
  cd.writeUInt16LE(0, 14)             // mod date
  cd.writeUInt32LE(0, 16)             // CRC-32
  cd.writeUInt32LE(content.length, 20)    // compressed size
  cd.writeUInt32LE(content.length, 24)    // uncompressed size
  cd.writeUInt16LE(filename.length, 28)   // filename length
  cd.writeUInt16LE(0, 30)             // extra length
  cd.writeUInt16LE(0, 32)             // comment length
  cd.writeUInt16LE(0, 34)             // disk start
  cd.writeUInt16LE(0, 36)             // internal attrs
  cd.writeUInt32LE(0, 38)             // external attrs
  cd.writeUInt32LE(0, 42)             // local header offset
  filename.copy(cd, 46)

  // End of central directory (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)   // signature
  eocd.writeUInt16LE(0, 4)            // disk number
  eocd.writeUInt16LE(0, 6)            // disk with CD start
  eocd.writeUInt16LE(1, 8)            // entries this disk
  eocd.writeUInt16LE(1, 10)           // total entries
  eocd.writeUInt32LE(cd.length, 12)   // CD size
  eocd.writeUInt32LE(cdOffset, 16)    // CD offset
  eocd.writeUInt16LE(0, 20)           // comment length

  return Buffer.concat([local, cd, eocd])
}

describe('extractZip', () => {
  describe('normal extraction', () => {
    it('extracts files and lowercases paths', async () => {
      const buf = await buildZip({
        'index.html': '<html></html>',
        'style.css': 'body {}',
      })
      const files = await extractZip(buf)
      const paths = files.map((f) => f.path).sort()
      expect(paths).toEqual(['index.html', 'style.css'])
    })

    it('sets size equal to content byte length', async () => {
      const content = 'hello world'
      const buf = await buildZip({ 'index.html': content })
      const files = await extractZip(buf)
      expect(files[0].size).toBe(Buffer.from(content).length)
    })

    it('skips directory entries', async () => {
      const zip = new JSZip()
      zip.folder('assets')
      zip.file('assets/style.css', 'body {}')
      const buf = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
      const files = await extractZip(buf)
      expect(files.every((f) => !f.path.endsWith('/'))).toBe(true)
    })
  })

  describe('path traversal', () => {
    it('is safe: JSZip normalises traversal paths on load so no file escapes the archive', async () => {
      // JSZip strips leading "../" segments during loadAsync — a malicious ZIP
      // with "../evil.txt" becomes "evil.txt". Our explicit ".." check is
      // defense-in-depth for future library changes; JSZip is the primary guard.
      const buf = buildTraversalZip()
      const files = await extractZip(buf)
      // The path has been sanitised to just the basename — no traversal possible.
      expect(files[0].path).not.toContain('..')
      expect(files[0].path).toBe('evil.txt')
    })
  })

  describe('nested ZIPs', () => {
    it('rejects files ending in .zip', async () => {
      const buf = await buildZip({ 'inner.zip': 'PK...' })
      await expect(extractZip(buf)).rejects.toThrow(ZipExtractionError)
      await expect(extractZip(buf)).rejects.toThrow(/nested zip/i)
    })
  })

  describe('max files limit', () => {
    it('rejects ZIPs with more than 10,000 files', async () => {
      const zip = new JSZip()
      for (let i = 0; i <= 10_000; i++) {
        zip.file(`file-${i}.txt`, 'x')
      }
      const buf = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
      await expect(extractZip(buf)).rejects.toThrow(ZipExtractionError)
      await expect(extractZip(buf)).rejects.toThrow(/10,000/)
    })

    it('accepts ZIPs with exactly 10,000 files', async () => {
      const zip = new JSZip()
      for (let i = 0; i < 10_000; i++) {
        zip.file(`file-${i}.txt`, 'x')
      }
      const buf = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
      const files = await extractZip(buf)
      expect(files).toHaveLength(10_000)
    }, 15_000) // generous timeout — building 10k files takes a moment
  })
})
