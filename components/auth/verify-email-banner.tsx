import { MailWarning } from 'lucide-react'

/**
 * Shown in the dashboard layout when the user's email is not yet confirmed.
 * Read the `x-email-unverified` response header set by middleware to decide
 * whether to render this banner.
 */
export function VerifyEmailBanner() {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-4 py-3 text-sm border-b bg-muted"
    >
      <MailWarning className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <span>
        Please verify your email address to start publishing.{' '}
        <span className="text-muted-foreground">Check your inbox for the confirmation link.</span>
      </span>
    </div>
  )
}
