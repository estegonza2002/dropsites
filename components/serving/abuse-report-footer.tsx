import Link from 'next/link'
import { Flag } from 'lucide-react'

/**
 * Subtle "Report abuse" link shown at the bottom of served deployments.
 * Receives the deployment slug so the report form can pre-fill the URL.
 */
export function AbuseReportFooter({ slug }: { slug: string }) {
  const reportUrl = `/compromise?url=${encodeURIComponent(slug)}`

  return (
    <div className="fixed bottom-0 inset-x-0 flex justify-center pointer-events-none z-50">
      <Link
        href={reportUrl}
        className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/5 backdrop-blur-sm transition-colors hover:text-foreground hover:ring-foreground/10"
      >
        <Flag className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        Report abuse
      </Link>
    </div>
  )
}
