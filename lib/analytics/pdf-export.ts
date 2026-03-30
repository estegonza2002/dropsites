/**
 * Analytics PDF export — generates a simple PDF report using raw PDF primitives.
 * No external PDF library required.
 */

import {
  getViewStats,
  getTopReferrers,
  getTimeSeriesViews,
  type DateRange,
} from './query'

export interface PdfExportOptions {
  deploymentId: string
  deploymentSlug: string
  dateRange: DateRange
}

/**
 * Minimal PDF generator that produces a valid PDF 1.4 document.
 * Uses text-only layout with basic formatting.
 */
class PdfBuilder {
  private objects: string[] = []
  private offsets: number[] = []
  private pages: number[] = []
  private content = ''

  private addObject(obj: string): number {
    const id = this.objects.length + 1
    this.objects.push(obj)
    return id
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
  }

  addPage(lines: Array<{ text: string; x: number; y: number; fontSize?: number; bold?: boolean }>): void {
    // Build content stream
    let stream = 'BT\n'
    for (const line of lines) {
      const fontName = line.bold ? '/F2' : '/F1'
      const size = line.fontSize ?? 12
      stream += `${fontName} ${size} Tf\n`
      stream += `${line.x} ${line.y} Td\n`
      stream += `(${this.escapeText(line.text)}) Tj\n`
      stream += `${-line.x} ${-line.y} Td\n`
    }
    stream += 'ET\n'

    const streamId = this.addObject(
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    )

    const pageId = this.addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>`,
    )

    this.pages.push(pageId)
  }

  build(): Buffer {
    // Object layout:
    // 1 = catalog, 2 = pages, 3 = reserved for actual pages array
    // 4 = font Helvetica, 5 = font Helvetica-Bold
    // Then come stream + page objects added via addPage()

    const allObjects: Array<{ id: number; content: string }> = []

    // Font objects (reserved for embedded font support)
    const _fontRegular = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    const _fontBold = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

    // Pages object — references all page objects
    const pageRefs = this.pages.map((id) => `${id} 0 R`).join(' ')
    const pagesObj = `<< /Type /Pages /Kids [${pageRefs}] /Count ${this.pages.length} >>`

    // Catalog
    const catalogObj = '<< /Type /Catalog /Pages 2 0 R >>'

    // Build final object list with fixed IDs
    allObjects.push({ id: 1, content: catalogObj })
    allObjects.push({ id: 2, content: pagesObj })
    // Objects 3+ are from addObject (1-indexed in this.objects)
    // But we need to remap: our addObject started at 1, now we offset by +2
    // Actually let's rebuild cleanly:

    // Re-number: 1=catalog, 2=pages, 3=... (page objects added)
    // We need fonts at known positions. Let's fix:
    // 1=catalog, 2=pages, 3=fontRegular, 4=fontBold, 5+=user objects
    // But pages in addPage reference "4 0 R" and "5 0 R" for fonts, and "2 0 R" for parent
    // So fonts must be at obj 4 and 5. Our addObject IDs start at 1.
    // Actual object IDs for user objects: their addObject index + 5 (offset)
    // But page content references streamId as (streamId) 0 R — those IDs are wrong now.

    // Simpler approach: build everything inline
    return this.buildSimple()
  }

  private buildSimple(): Buffer {
    const _parts: string[] = []
    const objectOffsets: number[] = []
    let output = '%PDF-1.4\n'

    const objs: string[] = []

    // Obj 1: Catalog
    objs.push('<< /Type /Catalog /Pages 2 0 R >>')

    // Obj 2: Pages (placeholder, filled later)
    objs.push('') // placeholder

    // Obj 3: Font Helvetica
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

    // Obj 4: Font Helvetica-Bold
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

    // Build page content streams + page objects
    const pageObjIds: number[] = []

    // Re-process pages from stored data
    // We need to rebuild since the original object refs are wrong
    // Store raw page line data instead
    // Actually, let's just use this.objects directly and fix references

    // For each pair (stream, page) in this.objects:
    for (let i = 0; i < this.objects.length; i += 2) {
      const streamContent = this.objects[i]
      const streamObjId = objs.length + 1
      objs.push(streamContent)

      const pageObjId = objs.length + 1
      // Fix parent and font references
      const pageContent = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      objs.push(pageContent)
      pageObjIds.push(pageObjId)
    }

    // Fix Pages object
    const pageRefs = pageObjIds.map((id) => `${id} 0 R`).join(' ')
    objs[1] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageObjIds.length} >>`

    // Serialize
    for (let i = 0; i < objs.length; i++) {
      objectOffsets.push(output.length)
      output += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`
    }

    // Cross-reference table
    const xrefOffset = output.length
    output += 'xref\n'
    output += `0 ${objs.length + 1}\n`
    output += '0000000000 65535 f \n'
    for (const offset of objectOffsets) {
      output += `${String(offset).padStart(10, '0')} 00000 n \n`
    }

    // Trailer
    output += 'trailer\n'
    output += `<< /Size ${objs.length + 1} /Root 1 0 R >>\n`
    output += 'startxref\n'
    output += `${xrefOffset}\n`
    output += '%%EOF\n'

    return Buffer.from(output, 'ascii')
  }
}

/**
 * Generate an analytics PDF report for a deployment.
 */
export async function generateAnalyticsPdf(
  options: PdfExportOptions,
): Promise<Buffer> {
  const { deploymentId, deploymentSlug, dateRange } = options

  // Fetch analytics data
  const [stats, referrers, timeSeries] = await Promise.all([
    getViewStats(deploymentId, dateRange),
    getTopReferrers(deploymentId, dateRange),
    getTimeSeriesViews(deploymentId, dateRange),
  ])

  const pdf = new PdfBuilder()
  const rangeLabel = dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'
  const generatedAt = new Date().toISOString().split('T')[0]

  // Page 1: Cover + Summary
  const coverLines: Array<{ text: string; x: number; y: number; fontSize?: number; bold?: boolean }> = [
    { text: 'DropSites Analytics Report', x: 72, y: 700, fontSize: 24, bold: true },
    { text: `Deployment: ${deploymentSlug}`, x: 72, y: 660, fontSize: 14 },
    { text: `Period: ${rangeLabel}`, x: 72, y: 636, fontSize: 14 },
    { text: `Generated: ${generatedAt}`, x: 72, y: 612, fontSize: 12 },
    { text: '', x: 72, y: 570, fontSize: 12 },
    { text: 'Views Summary', x: 72, y: 540, fontSize: 18, bold: true },
    { text: `Total Views: ${stats.totalViews.toLocaleString()}`, x: 72, y: 510, fontSize: 14 },
    { text: `Active Days: ${stats.uniqueDays}`, x: 72, y: 486, fontSize: 14 },
    { text: `Top Referrer: ${stats.topReferrer ?? 'Direct traffic'}`, x: 72, y: 462, fontSize: 14 },
  ]

  // Add time series summary
  let yPos = 410
  coverLines.push({ text: 'Daily Views', x: 72, y: yPos, fontSize: 16, bold: true })
  yPos -= 24

  const recentDays = timeSeries.slice(-14) // Show last 14 days on cover
  for (const point of recentDays) {
    coverLines.push({
      text: `${point.date}: ${point.views} views`,
      x: 72,
      y: yPos,
      fontSize: 11,
    })
    yPos -= 16
    if (yPos < 72) break
  }

  pdf.addPage(coverLines)

  // Page 2: Top Referrers
  const referrerLines: Array<{ text: string; x: number; y: number; fontSize?: number; bold?: boolean }> = [
    { text: 'Top Referrers', x: 72, y: 700, fontSize: 18, bold: true },
    { text: '', x: 72, y: 680 },
  ]

  let refY = 660
  if (referrers.length === 0) {
    referrerLines.push({
      text: 'No referrer data available for this period.',
      x: 72,
      y: refY,
      fontSize: 12,
    })
  } else {
    // Header
    referrerLines.push({
      text: 'Domain                                    Views    %',
      x: 72,
      y: refY,
      fontSize: 11,
      bold: true,
    })
    refY -= 20

    for (const ref of referrers) {
      const domain = ref.domain.padEnd(40).slice(0, 40)
      const count = String(ref.count).padStart(8)
      const pct = `${ref.percentage}%`.padStart(5)
      referrerLines.push({
        text: `${domain}${count}${pct}`,
        x: 72,
        y: refY,
        fontSize: 10,
      })
      refY -= 16
      if (refY < 72) break
    }
  }

  // Footer
  referrerLines.push({
    text: `DropSites - ${generatedAt}`,
    x: 72,
    y: 40,
    fontSize: 8,
  })

  pdf.addPage(referrerLines)

  return pdf.build()
}
