'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, Settings, ShieldCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
]

interface NavItemsProps {
  isAdmin?: boolean
  currentWorkspaceId?: string
  onNavigate?: () => void
}

export function NavItems({ isAdmin, currentWorkspaceId, onNavigate }: NavItemsProps) {
  const pathname = usePathname()

  const items = isAdmin
    ? [...NAV, { href: '/admin', label: 'Admin', icon: ShieldCheck }]
    : NAV

  // Workspace-scoped nav items
  const wsItems = currentWorkspaceId
    ? [
        { href: `/dashboard/workspaces/${currentWorkspaceId}/settings`, label: 'Workspace Settings', icon: Settings },
        { href: `/dashboard/workspaces/${currentWorkspaceId}/members`, label: 'Members', icon: Users },
      ]
    : [{ href: '/dashboard/settings', label: 'Settings', icon: Settings }]

  function renderLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          active
            ? 'font-medium text-foreground bg-accent/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
        style={active ? { color: 'var(--color-accent)' } : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        {label}
      </Link>
    )
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(renderLink)}
      <Separator className="my-2" />
      {wsItems.map(renderLink)}
    </nav>
  )
}
