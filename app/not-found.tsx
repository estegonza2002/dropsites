import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--accent)' }}>404</p>
      <h1 className="text-2xl font-medium text-foreground mb-2">
        Page not found
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
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
