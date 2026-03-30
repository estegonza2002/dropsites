'use client'

import * as React from 'react'
import { ImageOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ThumbnailPreviewProps {
  deploymentId: string
  alt?: string
  className?: string
}

export function ThumbnailPreview({
  deploymentId,
  alt = 'Deployment preview',
  className,
}: ThumbnailPreviewProps) {
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>(
    'loading',
  )
  const thumbnailUrl = `/api/v1/thumbnails/${deploymentId}`

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-muted',
        className,
      )}
    >
      {status === 'loading' && (
        <Skeleton className="absolute inset-0 rounded-md" />
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff size={20} strokeWidth={1.5} />
          <span className="text-xs">No preview</span>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt={alt}
        className={cn(
          'h-full w-full object-cover transition-opacity',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
