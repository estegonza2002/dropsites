'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, Settings, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface NavItemsProps {
  isAdmin?: boolean
  onNavigate?: () => void
}

export function NavItems({ isAdmin, onNavigate }: NavItemsProps) {
  const pathname = usePathname()

  const items = isAdmin
    ? [...NAV, { href: '/admin', label: 'Admin', icon: ShieldCheck }]
    : NAV

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
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
      })}
    </nav>
  )
}
