import type { User } from '@supabase/supabase-js'
import { WorkspaceSelector } from './workspace-selector'
import { MobileSheetNav } from './mobile-sheet-nav'
import type { WorkspaceRow } from '@/lib/auth/types'

interface TopNavProps {
  user: User
  workspaces: WorkspaceRow[]
  currentWorkspaceId?: string
}

export function TopNav({ user, workspaces, currentWorkspaceId }: TopNavProps) {
  return (
    <header className="h-14 border-b flex items-center px-4 gap-3 shrink-0 bg-background">
      <MobileSheetNav user={user} />
      <div className="flex-1" />
      <WorkspaceSelector
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
      />
    </header>
  )
}
