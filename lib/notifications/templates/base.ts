/**
 * Shared email template utilities.
 *
 * All email templates use inline styles because email clients do not support
 * external CSS. The orange accent (#f97316) is used directly here since email
 * templates operate outside the design-token system.
 */

export const BRAND_COLOR = '#f97316'
export const BRAND_NAME = 'DropSites'
export const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe_url}}'

export function emailWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
<tr><td style="padding:24px 32px 0;">
  <span style="font-size:20px;font-weight:600;color:${BRAND_COLOR};">${BRAND_NAME}</span>
</td></tr>
<tr><td style="padding:24px 32px;">
  ${body}
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
    You received this email because of your ${BRAND_NAME} account settings.<br>
    <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export type TemplateResult = {
  subject: string
  html: string
  text: string
}
