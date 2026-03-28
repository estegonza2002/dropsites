'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NavItems } from './nav-items'
import { createClient } from '@/lib/supabase/client'
import type { WorkspaceRow } from '@/lib/auth/types'

interface AppSidebarProps {
  user: User
  workspaces: WorkspaceRow[]
  currentWorkspaceId?: string
}

export function AppSidebar({ user, currentWorkspaceId }: AppSidebarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <aside className="hidden md:flex flex-col w-[280px] shrink-0 border-r bg-background h-screen">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b shrink-0">
        <Link href="/dashboard" className="text-base font-medium tracking-tight">
          Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <NavItems currentWorkspaceId={currentWorkspaceId} />
      </ScrollArea>

      {/* User footer */}
      <div className="border-t px-3 py-3 flex items-center gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.email}</p>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={signOut}>
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            }
          />
          <TooltipContent side="top">Sign out</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
