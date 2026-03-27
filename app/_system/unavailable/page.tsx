import Link from 'next/link'

export default function UnavailablePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </div>
      <h1 className="text-xl font-medium text-foreground mb-2">
        Temporarily unavailable
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        This deployment has been disabled. If you believe this is a mistake,
        please contact the owner.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: 'var(--accent)' }}
      >
        ← Back to home
      </Link>
    </div>
  )
}
