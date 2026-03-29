'use client'

import { useState } from 'react'
import { HelpCircle, BookOpen, MessageCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const links = [
  {
    label: 'Documentation',
    href: '/docs',
    icon: BookOpen,
    external: false,
  },
  {
    label: 'Contact support',
    href: 'mailto:support@dropsites.app',
    icon: MessageCircle,
    external: true,
  },
  {
    label: 'Status page',
    href: '/status',
    icon: ExternalLink,
    external: false,
  },
]

export function HelpWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-56 rounded-lg border bg-popover p-2 shadow-lg">
          <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Help</p>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <link.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              {link.label}
              {link.external && (
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/60" strokeWidth={1.5} />
              )}
            </a>
          ))}
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shadow-md"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Help"
              />
            }
          >
            <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent side="left">Help</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
