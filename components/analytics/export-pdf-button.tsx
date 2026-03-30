'use client'

import * as React from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DateRange } from '@/lib/analytics/query'

interface ExportPdfButtonProps {
  slug: string
  dateRange: DateRange
}

export function ExportPdfButton({ slug, dateRange }: ExportPdfButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleExport() {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/v1/deployments/${slug}/analytics/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange }),
        },
      )

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${slug}-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <Download size={16} strokeWidth={1.5} />
      )}
      <span className="ml-1.5">
        {isLoading ? 'Generating...' : 'Export PDF'}
      </span>
    </Button>
  )
}
