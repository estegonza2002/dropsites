'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NavItems } from './nav-items'
import { createClient } from '@/lib/supabase/client'

interface MobileSheetNavProps {
  user: User
}

export function MobileSheetNav({ user }: MobileSheetNavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Menu</TooltipContent>
      </Tooltip>

      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="h-14 flex flex-row items-center px-5 border-b shrink-0 space-y-0">
          <SheetTitle>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-base font-medium tracking-tight"
            >
              Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-3 py-4">
          <NavItems onNavigate={() => setOpen(false)} />
        </div>

        <div className="border-t px-3 py-3 flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <p className="flex-1 min-w-0 text-sm font-medium truncate">{user.email}</p>
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
      </SheetContent>
    </Sheet>
  )
}
