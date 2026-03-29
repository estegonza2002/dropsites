// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  detectMultiPageDeployment,
  extractPageList,
  inferPageTitle,
  buildNavScriptTag,
} from '@/lib/serving/auto-nav'

// ── detectMultiPageDeployment ────────────────────────────────────────

describe('detectMultiPageDeployment', () => {
  it('returns false for a single HTML file', () => {
    const files = [{ file_path: 'index.html' }]
    expect(detectMultiPageDeployment(files)).toBe(false)
  })

  it('returns true for multiple HTML files', () => {
    const files = [
      { file_path: 'index.html' },
      { file_path: 'about.html' },
    ]
    expect(detectMultiPageDeployment(files)).toBe(true)
  })

  it('returns false for zero HTML files', () => {
    const files = [
      { file_path: 'app.js' },
      { file_path: 'style.css' },
    ]
    expect(detectMultiPageDeployment(files)).toBe(false)
  })

  it('detects .htm files as HTML', () => {
    const files = [
      { file_path: 'index.htm' },
      { file_path: 'about.htm' },
    ]
    expect(detectMultiPageDeployment(files)).toBe(true)
  })

  it('is case-insensitive for extensions', () => {
    const files = [
      { file_path: 'index.HTML' },
      { file_path: 'about.Html' },
    ]
    expect(detectMultiPageDeployment(files)).toBe(true)
  })

  it('ignores non-HTML files in the count', () => {
    const files = [
      { file_path: 'index.html' },
      { file_path: 'style.css' },
      { file_path: 'app.js' },
    ]
    expect(detectMultiPageDeployment(files)).toBe(false)
  })
})

// ── extractPageList ──────────────────────────────────────────────────

describe('extractPageList', () => {
  it('returns pages sorted with index.html first', () => {
    const files = [
      { file_path: 'about.html' },
      { file_path: 'index.html' },
      { file_path: 'contact.html' },
    ]
    const pages = extractPageList(files)
    expect(pages[0].path).toBe('index.html')
    expect(pages[0].label).toBe('Home')
    expect(pages[1].path).toBe('about.html')
    expect(pages[1].label).toBe('About')
    expect(pages[2].path).toBe('contact.html')
    expect(pages[2].label).toBe('Contact')
  })

  it('generates labels from filenames with hyphens and underscores', () => {
    const files = [
      { file_path: 'my-cool-page.html' },
      { file_path: 'another_page.html' },
    ]
    const pages = extractPageList(files)
    expect(pages[0].label).toBe('Another Page')
    expect(pages[1].label).toBe('My Cool Page')
  })

  it('only includes HTML files', () => {
    const files = [
      { file_path: 'index.html' },
      { file_path: 'style.css' },
      { file_path: 'about.html' },
    ]
    const pages = extractPageList(files)
    expect(pages).toHaveLength(2)
  })

  it('uses custom order from dropsites.json config', () => {
    const files = [
      { file_path: 'index.html' },
      { file_path: 'about.html' },
      { file_path: 'contact.html' },
    ]
    const config = {
      navigation: {
        order: 'custom' as const,
        pages: [
          { path: 'contact.html', label: 'Get in Touch' },
          { path: 'index.html', label: 'Welcome' },
        ],
      },
    }
    const pages = extractPageList(files, config)
    expect(pages).toHaveLength(2)
    expect(pages[0].label).toBe('Get in Touch')
    expect(pages[1].label).toBe('Welcome')
  })

  it('falls back to auto-detection when config order is not custom', () => {
    const files = [
      { file_path: 'index.html' },
      { file_path: 'about.html' },
    ]
    const config = {
      navigation: {
        order: 'alpha' as const,
        pages: [],
      },
    }
    const pages = extractPageList(files, config)
    expect(pages).toHaveLength(2)
    expect(pages[0].path).toBe('index.html')
  })

  it('strips leading slashes from paths', () => {
    const files = [{ file_path: '/index.html' }, { file_path: '/about.html' }]
    const pages = extractPageList(files)
    expect(pages[0].path).not.toMatch(/^\//)
  })
})

// ── inferPageTitle ───────────────────────────────────────────────────

describe('inferPageTitle', () => {
  it('extracts title from <title> tag', () => {
    const html = '<html><head><title>My Page</title></head><body></body></html>'
    expect(inferPageTitle(html)).toBe('My Page')
  })

  it('falls back to <h1> when no <title>', () => {
    const html = '<html><body><h1>Hello World</h1></body></html>'
    expect(inferPageTitle(html)).toBe('Hello World')
  })

  it('strips HTML tags from h1 content', () => {
    const html = '<html><body><h1>Hello <strong>World</strong></h1></body></html>'
    expect(inferPageTitle(html)).toBe('Hello World')
  })

  it('falls back to filename when no title or h1', () => {
    const html = '<html><body><p>Just text</p></body></html>'
    expect(inferPageTitle(html, 'my-page.html')).toBe('My Page')
  })

  it('returns Untitled when no title, h1, or filename', () => {
    const html = '<html><body><p>Just text</p></body></html>'
    expect(inferPageTitle(html)).toBe('Untitled')
  })

  it('handles whitespace in title tag', () => {
    const html = '<title>  Spaced  Title  </title>'
    expect(inferPageTitle(html)).toBe('Spaced Title')
  })

  it('skips empty title tags', () => {
    const html = '<title>  </title><h1>Fallback</h1>'
    expect(inferPageTitle(html)).toBe('Fallback')
  })

  it('handles case-insensitive tag matching', () => {
    const html = '<TITLE>Upper Case</TITLE>'
    expect(inferPageTitle(html)).toBe('Upper Case')
  })
})

// ── buildNavScriptTag ────────────────────────────────────────────────

describe('buildNavScriptTag', () => {
  it('produces a script tag with base64-encoded pages', () => {
    const pages = [
      { path: 'index.html', label: 'Home' },
      { path: 'about.html', label: 'About' },
    ]
    const tag = buildNavScriptTag(pages, 'index.html', 'my-site')

    expect(tag).toContain('<script async src="/auto-nav-widget.js"')
    expect(tag).toContain('data-current="index.html"')
    expect(tag).toContain('data-slug="my-site"')
    expect(tag).toContain('data-pages="')
    expect(tag).toContain('></script>')
  })

  it('base64-encodes the pages JSON correctly', () => {
    const pages = [
      { path: 'index.html', label: 'Home' },
    ]
    const tag = buildNavScriptTag(pages, 'index.html', 'test')

    // Extract the base64 value
    const match = tag.match(/data-pages="([^"]+)"/)
    expect(match).not.toBeNull()
    const decoded = JSON.parse(Buffer.from(match![1], 'base64').toString())
    expect(decoded).toEqual(pages)
  })

  it('escapes HTML special characters in attributes', () => {
    const pages = [{ path: 'a&b.html', label: 'A&B' }]
    const tag = buildNavScriptTag(pages, 'a&b.html', 'test<site')

    expect(tag).toContain('data-current="a&amp;b.html"')
    expect(tag).toContain('data-slug="test&lt;site"')
  })
})
