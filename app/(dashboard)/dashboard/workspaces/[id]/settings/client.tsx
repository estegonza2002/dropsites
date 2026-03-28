'use client'

import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { WorkspaceSettingsForm } from '@/components/workspace/workspace-settings-form'
import { WorkspaceDangerZone } from '@/components/workspace/workspace-danger-zone'

interface WorkspaceSettingsClientProps {
  workspace: {
    id: string
    name: string
    namespace_slug: string | null
    is_personal: boolean
    owner_id: string
  }
  role: 'owner' | 'publisher' | 'viewer'
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
