import Link from 'next/link'
import { Clock } from 'lucide-react'

export default function ExpiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* DropSites logo */}
      <Link
        href="/"
        className="mb-8 text-lg font-medium tracking-tight"
        aria-label="DropSites home"
      >
        Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
      </Link>

      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Clock
          size={20}
          strokeWidth={1.5}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <h1 className="text-xl font-medium text-foreground mb-2">
        This link has expired
      </h1>
      <p className="text-sm text-muted-foreground mb-2 max-w-xs">
        The owner of this deployment set an expiry date that has now passed.
      </p>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        Contact the owner to request access or a new link.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: 'var(--color-accent)' }}
      >
        Go to DropSites
      </Link>
    </div>
  )
}
