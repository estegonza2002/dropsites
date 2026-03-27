import Link from 'next/link'

export default function ExpiredPage() {
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
          <path d="M12 7v5.5l3 1.5" />
        </svg>
      </div>
      <h1 className="text-xl font-medium text-foreground mb-2">
        This link has expired
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        The owner of this deployment set an expiry date that has now passed.
        Contact the owner to request access.
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
