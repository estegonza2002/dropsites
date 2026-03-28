'use client'

import { useState } from 'react'
import { Trash2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RoleSelect } from '@/components/workspace/role-select'

interface Member {
  id: string
  user_id: string | null
  email: string
  display_name: string
  role: 'owner' | 'publisher' | 'viewer'
  is_pending: boolean
  accepted_at: string | null
}

interface MemberListProps {
  workspaceId: string
  members: Member[]
  currentUserId: string
  isOwner: boolean
  onUpdate: () => void
}

export function MemberList({ workspaceId, members, currentUserId, isOwner, onUpdate }: MemberListProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleRoleChange(userId: string, newRole: 'publisher' | 'viewer') {
    setUpdating(userId)
    try {
      await fetch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      onUpdate()
    } finally {
      setUpdating(null)
    }
  }

  async function handleRemove(userId: string) {
    setUpdating(userId)
    try {
      await fetch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
      })
      onUpdate()
    } finally {
      setUpdating(null)
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const
      case 'publisher':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-16">Status</TableHead>
            {isOwner && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId
            const isOwnRow = member.role === 'owner'

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{member.display_name}</span>
                    {member.display_name !== member.email && (
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isOwner && !isOwnRow && !member.is_pending ? (
                    <RoleSelect
                      value={member.role as 'publisher' | 'viewer'}
                      onValueChange={(r) => handleRoleChange(member.user_id!, r)}
                      disabled={updating === member.user_id}
                    />
                  ) : (
                    <Badge variant={roleBadgeVariant(member.role)}>{member.role}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {member.is_pending ? (
                    <Badge variant="outline" className="text-[var(--color-warning)]">
                      <Clock className="h-3 w-3 mr-1" strokeWidth={1.5} />
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[var(--color-success)]">Active</Badge>
                  )}
                </TableCell>
                {isOwner && (
                  <TableCell>
                    {!isOwnRow && (
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={updating === member.user_id}
                                  >
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                  </Button>
                                }
                              />
                            }
                          />
                          <TooltipContent>Remove member</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {member.display_name} from this workspace? Their deployments will be transferred to the workspace owner.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(member.user_id!)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {isSelf && !isOwnRow && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--color-danger)] text-xs"
                        onClick={() => handleRemove(currentUserId)}
                      >
                        Leave
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
