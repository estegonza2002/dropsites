/**
 * Inject `loading="lazy"` and `decoding="async"` on `<img>` tags at serve time.
 *
 * Per CLAUDE.md rule #2, uploaded source files are never modified.
 * This injection happens in the serve pipeline (middleware rewrite)
 * so the original HTML in storage is untouched.
 *
 * Rules:
 * - Only adds `loading="lazy"` to `<img>` tags that do NOT already
 *   have a `loading` attribute.
 * - Skips images that already specify `loading="eager"` or any other value.
 * - Also adds `decoding="async"` when not already present.
 */

const IMG_TAG_RE = /<img\b([^>]*)>/gi

/**
 * Returns true if the attribute string already contains a given attribute name.
 */
function hasAttribute(attrs: string, name: string): boolean {
  const re = new RegExp(`\\b${name}\\s*=`, 'i')
  return re.test(attrs)
}

/**
 * Injects `loading="lazy"` and `decoding="async"` into `<img>` tags
 * in the provided HTML string.
 */
export function injectLazyLoading(html: string): string {
  return html.replace(IMG_TAG_RE, (match, attrs: string) => {
    let newAttrs = attrs

    if (!hasAttribute(attrs, 'loading')) {
      newAttrs += ' loading="lazy"'
    }

    if (!hasAttribute(attrs, 'decoding')) {
      newAttrs += ' decoding="async"'
    }

    // If nothing changed, return original match
    if (newAttrs === attrs) return match

    return `<img${newAttrs}>`
  })
}
