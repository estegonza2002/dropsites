'use client'

import { useEffect, useState } from 'react'
import { Share2, Link, QrCode, Code, Mail, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { CopyLinkButton } from './copy-link-button'
import { QRCodeDownload } from './qr-code-download'
import { EmbedSnippet } from './embed-snippet'
import { EmailShare } from './email-share'
import { PasswordToggle } from './password-toggle'

interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  hasPassword: boolean
  onPasswordChange: (hasPassword: boolean) => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    // Set initial value via the handler pattern to avoid direct setState in effect
    handler({ matches: mql.matches } as MediaQueryListEvent)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function ShareSheetContent({
  slug,
  url,
  hasPassword,
  onPasswordChange,
}: {
  slug: string
  url: string
  hasPassword: boolean
  onPasswordChange: (hasPassword: boolean) => void
}) {
  return (
    <div className="space-y-5">
      {/* Link section */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Link size={16} strokeWidth={1.5} />
          Link
        </h3>
        <CopyLinkButton url={url} />
      </section>

      <Separator />

      {/* QR Code section */}
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <QrCode size={16} strokeWidth={1.5} />
          QR Code
        </h3>
        <QRCodeDownload url={url} slug={slug} />
      </section>

      <Separator />

      {/* Embed section */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Code size={16} strokeWidth={1.5} />
          Embed
        </h3>
        <EmbedSnippet url={url} />
      </section>

      <Separator />

      {/* Email section */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Mail size={16} strokeWidth={1.5} />
          Email
        </h3>
        <EmailShare url={url} slug={slug} />
      </section>

      <Separator />

      {/* Password section */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Shield size={16} strokeWidth={1.5} />
          Access
        </h3>
        <PasswordToggle
          slug={slug}
          hasPassword={hasPassword}
          onPasswordChange={onPasswordChange}
        />
      </section>
    </div>
  )
}

export function ShareSheet({
  open,
  onOpenChange,
  slug,
  hasPassword,
  onPasswordChange,
}: ShareSheetProps) {
  const isMobile = useIsMobile()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const url = `${APP_URL}/s/${slug}`

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-4 pb-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Share2 size={16} strokeWidth={1.5} />
              Share {slug}
            </SheetTitle>
            <SheetDescription>
              Share this deployment via link, QR code, embed, or email.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <ShareSheetContent
              slug={slug}
              url={url}
              hasPassword={hasPassword}
              onPasswordChange={onPasswordChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={16} strokeWidth={1.5} />
            Share {slug}
          </DialogTitle>
          <DialogDescription>
            Share this deployment via link, QR code, embed, or email.
          </DialogDescription>
        </DialogHeader>
        <ShareSheetContent
          slug={slug}
          url={url}
          hasPassword={hasPassword}
          onPasswordChange={onPasswordChange}
        />
      </DialogContent>
    </Dialog>
  )
}
