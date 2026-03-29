'use client'

/**
 * "Powered by DropSites" badge shown on free-tier deployments.
 * Removed by the `remove_badge` limit profile flag (Pro+).
 */
export function DropsitesBadge() {
  return (
    <a
      href="https://dropsites.app?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-3 right-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground hover:border-border"
    >
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-3 w-3"
        aria-hidden="true"
      >
        <path d="M9 2v4h4M15 11a6 6 0 11-9.9-4.5" />
      </svg>
      Powered by DropSites
    </a>
  )
}
