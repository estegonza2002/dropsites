'use client'

import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailShareProps {
  url: string
  slug: string
}

export function EmailShare({ url, slug }: EmailShareProps) {
  const subject = encodeURIComponent(`Check out ${slug}`)
  const body = encodeURIComponent(`Here's a link I wanted to share with you:\n\n${url}`)
  const href = `mailto:?subject=${subject}&body=${body}`

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      render={<a href={href} />}
    >
      <Mail size={16} strokeWidth={1.5} className="mr-1.5" />
      Share via email
    </Button>
  )
}
