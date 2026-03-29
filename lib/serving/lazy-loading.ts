/**
 * Inject `loading="lazy"` on `<img>` tags that don't already have a loading attribute.
 * Applied at serve time — never modifies source files.
 */
export function injectLazyLoading(html: string): string {
  // Match <img tags that don't already have loading=
  return html.replace(
    /<img(?![^>]*\bloading\s*=)([^>]*?)(\s*\/?>)/gi,
    '<img loading="lazy"$1$2',
  )
}
