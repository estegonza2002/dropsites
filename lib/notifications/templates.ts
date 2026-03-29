/**
 * Notification template renderer (placeholder).
 *
 * S27 will implement the actual templates for each event type.
 * For now, returns a generic template with the event data serialized.
 */

export interface RenderedTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Render a notification template for the given event type and data.
 *
 * @param eventType - e.g. "deployment.published", "workspace.invite"
 * @param data - arbitrary event payload
 * @returns subject, html, and text renderings
 */
export function renderTemplate(
  eventType: string,
  data: Record<string, unknown>,
): RenderedTemplate {
  const prettyData = JSON.stringify(data, null, 2)
  const humanEvent = eventType.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    subject: `[DropSites] ${humanEvent}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">${humanEvent}</h2>
        <p style="color: #71717a;">You have a new notification from DropSites.</p>
        <pre style="background: #f4f4f5; padding: 16px; border-radius: 8px; font-size: 13px; overflow-x: auto;">${escapeHtml(prettyData)}</pre>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          This is an automated notification from DropSites. You can manage your notification preferences in your account settings.
        </p>
      </div>
    `.trim(),
    text: `${humanEvent}\n\n${prettyData}\n\n---\nThis is an automated notification from DropSites.`,
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
