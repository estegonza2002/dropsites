/**
 * DropSites Auto-Navigation Widget
 * Standalone vanilla JS — no framework dependencies.
 * Loaded via <script async> with data attributes.
 * ~4KB unminified.
 */
;(function () {
  'use strict'

  var script =
    document.currentScript ||
    document.querySelector('script[data-pages]')
  if (!script) return

  var pagesB64 = script.getAttribute('data-pages')
  var currentPath = script.getAttribute('data-current') || ''
  var slug = script.getAttribute('data-slug') || ''

  if (!pagesB64) return

  var pages
  try {
    pages = JSON.parse(atob(pagesB64))
  } catch (e) {
    return
  }

  if (!pages || pages.length < 2) return

  // ── State ──────────────────────────────────────────────────────

  var isOpen = false

  // ── Styles ─────────────────────────────────────────────────────

  var ACCENT = '#f97316'
  var ACCENT_HOVER = '#ea580c'

  var css = [
    '#ds-nav-widget{',
    '  position:fixed;bottom:20px;right:20px;z-index:999999;',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  font-size:14px;line-height:1.4;',
    '}',
    '#ds-nav-toggle{',
    '  width:48px;height:48px;border-radius:50%;border:none;',
    '  background:' + ACCENT + ';color:#fff;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;',
    '  box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:background 0.15s;',
    '  padding:0;',
    '}',
    '#ds-nav-toggle:hover{background:' + ACCENT_HOVER + ';}',
    '#ds-nav-toggle:focus-visible{',
    '  outline:2px solid ' + ACCENT + ';outline-offset:2px;',
    '}',
    '#ds-nav-toggle svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.5;}',
    '#ds-nav-panel{',
    '  display:none;position:absolute;bottom:56px;right:0;',
    '  background:#fff;border:1px solid #e5e7eb;border-radius:8px;',
    '  box-shadow:0 4px 16px rgba(0,0,0,0.12);',
    '  min-width:200px;max-width:280px;max-height:60vh;',
    '  overflow-y:auto;padding:4px 0;',
    '}',
    '#ds-nav-panel.ds-open{display:block;}',
    '#ds-nav-panel .ds-nav-header{',
    '  padding:8px 12px 4px;font-size:11px;font-weight:500;',
    '  color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;',
    '}',
    '#ds-nav-panel a{',
    '  display:block;padding:8px 12px;color:#1f2937;',
    '  text-decoration:none;transition:background 0.1s;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    '}',
    '#ds-nav-panel a:hover{background:#f3f4f6;}',
    '#ds-nav-panel a:focus-visible{',
    '  outline:2px solid ' + ACCENT + ';outline-offset:-2px;',
    '}',
    '#ds-nav-panel a.ds-current{',
    '  background:#fff7ed;color:' + ACCENT + ';font-weight:500;',
    '}',
    /* Mobile: full-width at bottom */
    '@media(max-width:480px){',
    '  #ds-nav-widget{left:12px;right:12px;bottom:12px;}',
    '  #ds-nav-toggle{position:absolute;right:0;bottom:0;}',
    '  #ds-nav-panel{',
    '    left:0;right:0;bottom:56px;',
    '    max-width:none;min-width:0;border-radius:8px;',
    '  }',
    '}',
    /* Respect prefers-color-scheme dark */
    '@media(prefers-color-scheme:dark){',
    '  #ds-nav-panel{background:#1f2937;border-color:#374151;}',
    '  #ds-nav-panel a{color:#f3f4f6;}',
    '  #ds-nav-panel a:hover{background:#374151;}',
    '  #ds-nav-panel a.ds-current{background:#431407;color:#fb923c;}',
    '  #ds-nav-panel .ds-nav-header{color:#9ca3af;}',
    '}',
  ].join('\n')

  // ── Build DOM ──────────────────────────────────────────────────

  var style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  var widget = document.createElement('div')
  widget.id = 'ds-nav-widget'
  widget.setAttribute('role', 'navigation')
  widget.setAttribute('aria-label', 'Site navigation')

  // Toggle button — hamburger icon (3-line menu)
  var btn = document.createElement('button')
  btn.id = 'ds-nav-toggle'
  btn.setAttribute('aria-expanded', 'false')
  btn.setAttribute('aria-label', 'Toggle page navigation')
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="3" y1="6" x2="21" y2="6"/>' +
    '<line x1="3" y1="12" x2="21" y2="12"/>' +
    '<line x1="3" y1="18" x2="21" y2="18"/>' +
    '</svg>'

  // Panel
  var panel = document.createElement('div')
  panel.id = 'ds-nav-panel'
  panel.setAttribute('role', 'menu')

  var header = document.createElement('div')
  header.className = 'ds-nav-header'
  header.textContent = 'Pages'
  panel.appendChild(header)

  // Build page links
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i]
    var a = document.createElement('a')
    a.setAttribute('role', 'menuitem')

    // Build href: /<slug>/<path>
    var href = '/' + slug
    if (page.path && page.path !== 'index.html' && page.path !== 'index.htm') {
      href += '/' + page.path
    }
    a.href = href
    a.textContent = page.label || page.path

    // Highlight current page
    var normalCurrent = currentPath || 'index.html'
    var normalPage = page.path || 'index.html'
    if (
      normalPage === normalCurrent ||
      normalPage.replace(/\.(html|htm)$/i, '') ===
        normalCurrent.replace(/\.(html|htm)$/i, '')
    ) {
      a.className = 'ds-current'
      a.setAttribute('aria-current', 'page')
    }

    panel.appendChild(a)
  }

  widget.appendChild(panel)
  widget.appendChild(btn)
  document.body.appendChild(widget)

  // ── Interactions ───────────────────────────────────────────────

  function toggle() {
    isOpen = !isOpen
    panel.classList.toggle('ds-open', isOpen)
    btn.setAttribute('aria-expanded', String(isOpen))
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    toggle()
  })

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (isOpen && !widget.contains(e.target)) {
      isOpen = false
      panel.classList.remove('ds-open')
      btn.setAttribute('aria-expanded', 'false')
    }
  })

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false
      panel.classList.remove('ds-open')
      btn.setAttribute('aria-expanded', 'false')
      btn.focus()
    }
  })
})()
