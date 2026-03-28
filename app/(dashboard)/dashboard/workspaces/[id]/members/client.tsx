'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberList } from '@/components/workspace/member-list'
import { InviteForm } from '@/components/workspace/invite-form'

interface Member {
  id: string
  user_id: string | null
  email: string
  display_name: string
  role: 'owner' | 'publisher' | 'viewer'
  is_pending: boolean
  accepted_at: string | null
}

interface WorkspaceMembersClientProps {
  workspaceId: string
  currentUserId: string
  isOwner: boolean
}

export function WorkspaceMembersClient({ workspaceId, currentUserId, isOwner }: WorkspaceMembersClientProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-lg font-medium">Members</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">({members.length})</span>
        )}
      </div>

      {isOwner && (
        <>
          <InviteForm workspaceId={workspaceId} onInvited={fetchMembers} />
          <Separator />
        </>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <MemberList
          workspaceId={workspaceId}
          members={members}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onUpdate={fetchMembers}
        />
      )}
    </div>
  )
}
