'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Globe } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { WorkspaceSettingsForm } from '@/components/workspace/workspace-settings-form'
import { WorkspaceDangerZone } from '@/components/workspace/workspace-danger-zone'
import { ApiKeysPanel } from '@/components/settings/api-keys-panel'
import { WebhooksPanel } from '@/components/settings/webhooks-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WorkspaceSettingsClientProps {
  workspace: {
    id: string
    name: string
    namespace_slug: string | null
    is_personal: boolean
    owner_id: string
    data_region: string
  }
  role: 'owner' | 'publisher' | 'viewer'
}

const DATA_REGIONS: { value: string; label: string; description: string }[] = [
  { value: 'us', label: 'United States', description: 'Data stored in US regions (default)' },
  { value: 'eu', label: 'European Union', description: 'Data stored in EU regions (GDPR)' },
]

function DataResidencyPanel({ workspaceId, currentRegion }: { workspaceId: string; currentRegion: string }) {
  const [region, setRegion] = useState(currentRegion ?? 'us')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_region: region }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <CardTitle className="text-base">Data residency</CardTitle>
        </div>
        <CardDescription>
          Choose where your deployment data and analytics are stored. Changing region does not migrate existing data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {DATA_REGIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRegion(r.value)}
              className={[
                'flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                region === r.value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'border-border hover:bg-muted/50',
              ].join(' ')}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                {region === r.value && (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                )}
              </span>
              <div>
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || region === currentRegion}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save region'}
          </Button>
          {region !== currentRegion && (
            <Badge variant="outline" className="text-xs text-[var(--color-warning)]">
              Unsaved change
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkspaceSettingsClient({ workspace, role }: WorkspaceSettingsClientProps) {
  const router = useRouter()

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-lg font-medium">
          {workspace.is_personal ? 'Personal workspace' : workspace.name} — Settings
        </h1>
      </div>

      {role === 'owner' ? (
        <>
          <WorkspaceSettingsForm
            workspaceId={workspace.id}
            initialName={workspace.name}
            initialNamespace={workspace.namespace_slug ?? ''}
            onSaved={() => router.refresh()}
          />

          <Separator />

          <ApiKeysPanel />

          <Separator />

          <WebhooksPanel workspaceId={workspace.id} initialEndpoints={[]} />

          <Separator />

          <DataResidencyPanel
            workspaceId={workspace.id}
            currentRegion={workspace.data_region ?? 'us'}
          />

          <Separator />

          <WorkspaceDangerZone
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            isPersonal={workspace.is_personal}
          />
        </>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Name:</strong> {workspace.name}
          </p>
          {workspace.namespace_slug && (
            <p>
              <strong>Namespace:</strong> {workspace.namespace_slug}
            </p>
          )}
          <p className="mt-2 text-xs">Only workspace owners can edit settings.</p>
        </div>
      )}
    </div>
  )
}
