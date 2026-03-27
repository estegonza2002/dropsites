import type { Metadata } from 'next'
import { UploadZone } from '@/components/upload/upload-zone'

export const metadata: Metadata = {
  title: 'Dashboard — DropSites',
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Your Deployments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a file to publish it instantly.
        </p>
      </div>

      <UploadZone showSlugInput />

      {/* Deployment list placeholder — populated in S16 */}
      <div className="rounded-lg border bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">No deployments yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a file above to get your first shareable link.
        </p>
      </div>
    </div>
  )
}
