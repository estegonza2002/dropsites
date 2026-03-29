'use client'

import { useEffect, useState, useCallback } from 'react'
import { ImageIcon, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { generateQRCode } from '@/lib/qr/generate'

interface QRCodeDownloadProps {
  url: string
  slug: string
}

export function QRCodeDownload({ url, slug }: QRCodeDownloadProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    generateQRCode(url, 'png').then((result) => {
      if (!cancelled) setDataUrl(result)
    })
    return () => { cancelled = true }
  }, [url])

  const downloadFile = useCallback(
    async (format: 'png' | 'svg') => {
      const data = await generateQRCode(url, format)
      const blob =
        format === 'svg'
          ? new Blob([data], { type: 'image/svg+xml' })
          : await fetch(data).then((r) => r.blob())

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${slug}-qr.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    },
    [url, slug]
  )

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-3">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code for ${url}`}
            width={192}
            height={192}
            className="block"
          />
        ) : (
          <div className="h-48 w-48 animate-pulse rounded bg-muted" />
        )}
      </div>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile('png')}
              aria-label="Download QR as PNG"
            >
              <ImageIcon size={16} strokeWidth={1.5} className="mr-1.5" />
              PNG
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download as PNG</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile('svg')}
              aria-label="Download QR as SVG"
            >
              <FileCode size={16} strokeWidth={1.5} className="mr-1.5" />
              SVG
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download as SVG</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
