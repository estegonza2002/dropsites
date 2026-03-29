/**
 * Admin notification email templates.
 */

import { emailWrapper, BRAND_NAME, type TemplateResult } from './base'

export function adminAbuseReport(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const reporterEmail = String(data.reporter_email ?? 'anonymous')
  const reason = String(data.reason ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `[Admin] Abuse report for "${slug}"`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Abuse report</h2>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.5;">
        <strong>Deployment:</strong> ${slug}<br>
        <strong>Reporter:</strong> ${reporterEmail}<br>
        <strong>Reason:</strong> ${reason}
      </p>
      <a href="${url}" style="display:inline-block;margin-top:12px;padding:10px 20px;background-color:#374151;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Review in admin
      </a>
    `),
    text: `${BRAND_NAME} [Admin]: Abuse report for "${slug}"\nReporter: ${reporterEmail}\nReason: ${reason}\n\nReview: ${url}`,
  }
}

export function adminWeeklySummary(data: Record<string, unknown>): TemplateResult {
  const totalDeployments = String(data.total_deployments ?? '0')
  const newUsers = String(data.new_users ?? '0')
  const totalBandwidth = String(data.total_bandwidth ?? '0')
  const abuseReports = String(data.abuse_reports ?? '0')
  const url = String(data.url ?? '')
  return {
    subject: `[Admin] Weekly summary — ${BRAND_NAME}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Weekly summary</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">Total deployments</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${totalDeployments}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">New users</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${newUsers}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">Bandwidth served</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${totalBandwidth}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#374151;">Abuse reports</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${abuseReports}</td>
        </tr>
      </table>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#374151;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View admin dashboard
      </a>
    `),
    text: `${BRAND_NAME} [Admin] Weekly Summary\n\nTotal deployments: ${totalDeployments}\nNew users: ${newUsers}\nBandwidth: ${totalBandwidth}\nAbuse reports: ${abuseReports}\n\nView: ${url}`,
  }
}

export function trialReminderDay7(data: Record<string, unknown>): TemplateResult {
  const userName = String(data.user_name ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `Your ${BRAND_NAME} Pro trial is halfway through`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">7 days remaining</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Hi${userName ? ` ${userName}` : ''}, you have <strong>7 days</strong> left on your
        ${BRAND_NAME} Pro trial. Make the most of it — publish unlimited sites, use custom
        domains, and access analytics.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#374151;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Upgrade now
      </a>
    `),
    text: `${BRAND_NAME}: Your Pro trial has 7 days remaining.\n\nUpgrade: ${url}`,
  }
}

export function trialReminderDay12(data: Record<string, unknown>): TemplateResult {
  const userName = String(data.user_name ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `Only 2 days left on your ${BRAND_NAME} Pro trial`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">2 days remaining</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Hi${userName ? ` ${userName}` : ''}, your ${BRAND_NAME} Pro trial ends in
        <strong>2 days</strong>. After that, your account will revert to the free tier.
        Upgrade now to keep all Pro features.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#374151;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Upgrade now
      </a>
    `),
    text: `${BRAND_NAME}: Only 2 days left on your Pro trial.\n\nUpgrade: ${url}`,
  }
}

export function trialExpired(data: Record<string, unknown>): TemplateResult {
  const userName = String(data.user_name ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `Your ${BRAND_NAME} Pro trial has ended`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Trial ended</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Hi${userName ? ` ${userName}` : ''}, your ${BRAND_NAME} Pro trial has expired.
        Your account has been reverted to the free tier. You can still access your
        existing deployments, but some features are now limited.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#374151;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Upgrade to Pro
      </a>
    `),
    text: `${BRAND_NAME}: Your Pro trial has ended.\n\nUpgrade: ${url}`,
  }
}
