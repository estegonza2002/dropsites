'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Building2, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkspaceRow } from '@/lib/auth/types'

interface WorkspaceSelectorProps {
  workspaces: WorkspaceRow[]
  currentWorkspaceId?: string
}

const WORKSPACE_COOKIE = 'ds-workspace'

export function WorkspaceSelector({ workspaces, currentWorkspaceId }: WorkspaceSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const active =
    currentWorkspaceId ?? workspaces.find((w) => w.is_personal)?.id ?? workspaces[0]?.id ?? ''

  function handleChange(id: string | null) {
    if (!id) return
    if (id === '__create__') {
      router.push('/dashboard/workspaces/new')
      return
    }
    // Persist selection in a cookie (7-day expiry)
    document.cookie = `${WORKSPACE_COOKIE}=${id};path=/;max-age=${7 * 24 * 3600};samesite=lax`
    router.refresh()
    // Stay on the same path — the layout will re-render with the new workspace
    router.push(pathname)
  }

  return (
    <Select value={active} onValueChange={handleChange}>
      <SelectTrigger className="w-48 h-8 text-sm">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            <span className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              {ws.is_personal ? 'Personal' : ws.name}
            </span>
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="__create__">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Create workspace
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
