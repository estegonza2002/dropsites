/**
 * Publisher notification email templates.
 */

import { emailWrapper, BRAND_COLOR, BRAND_NAME, type TemplateResult } from './base'

export function deploymentPublished(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `Your site "${slug}" is live`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Deployment published</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your site <strong>${slug}</strong> has been published and is now accessible.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View your site
      </a>
    `),
    text: `${BRAND_NAME}: Your site "${slug}" is live.\n\nVisit: ${url}`,
  }
}

export function firstView(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `Your site "${slug}" got its first view!`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">First view received</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Someone just visited <strong>${slug}</strong> for the first time. Your content is being seen!
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View analytics
      </a>
    `),
    text: `${BRAND_NAME}: Your site "${slug}" got its first view!\n\nView analytics: ${url}`,
  }
}

export function viewMilestone(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const count = String(data.count ?? '0')
  const url = String(data.url ?? '')
  return {
    subject: `"${slug}" reached ${count} views`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">View milestone reached</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your site <strong>${slug}</strong> has reached <strong>${count} views</strong>. Congratulations!
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View analytics
      </a>
    `),
    text: `${BRAND_NAME}: "${slug}" reached ${count} views.\n\nView analytics: ${url}`,
  }
}

export function expiryWarning(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const expiresAt = String(data.expires_at ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `"${slug}" expires soon`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Expiry warning</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your site <strong>${slug}</strong> is set to expire on <strong>${expiresAt}</strong>.
        If you want to keep it available, extend the expiry date in your dashboard.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Manage deployment
      </a>
    `),
    text: `${BRAND_NAME}: "${slug}" expires on ${expiresAt}.\n\nManage: ${url}`,
  }
}

export function deploymentExpired(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const url = String(data.url ?? '')
  return {
    subject: `"${slug}" has expired`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Deployment expired</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your site <strong>${slug}</strong> has expired and is no longer publicly accessible.
        You can reactivate it from your dashboard.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Reactivate
      </a>
    `),
    text: `${BRAND_NAME}: "${slug}" has expired.\n\nReactivate: ${url}`,
  }
}

export function bruteForceAlert(data: Record<string, unknown>): TemplateResult {
  const slug = String(data.slug ?? '')
  const attempts = String(data.attempts ?? '0')
  const url = String(data.url ?? '')
  return {
    subject: `Security alert: failed password attempts on "${slug}"`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Security alert</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        We detected <strong>${attempts} failed password attempts</strong> on your site
        <strong>${slug}</strong>. The site remains protected. Consider changing the password
        if you suspect unauthorized access.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Review settings
      </a>
    `),
    text: `${BRAND_NAME}: Security alert — ${attempts} failed password attempts on "${slug}".\n\nReview: ${url}`,
  }
}

export function storageWarning(data: Record<string, unknown>): TemplateResult {
  const usagePercent = String(data.usage_percent ?? '0')
  const url = String(data.url ?? '')
  return {
    subject: `Storage usage at ${usagePercent}%`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Storage warning</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your workspace storage is at <strong>${usagePercent}%</strong> of its limit.
        Consider removing unused deployments or upgrading your plan.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Manage storage
      </a>
    `),
    text: `${BRAND_NAME}: Storage usage at ${usagePercent}%.\n\nManage: ${url}`,
  }
}

export function bandwidthWarning(data: Record<string, unknown>): TemplateResult {
  const usagePercent = String(data.usage_percent ?? '0')
  const url = String(data.url ?? '')
  return {
    subject: `Bandwidth usage at ${usagePercent}%`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Bandwidth warning</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        Your workspace bandwidth is at <strong>${usagePercent}%</strong> of its monthly limit.
        If you exceed the limit, deployments may be temporarily throttled.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View usage
      </a>
    `),
    text: `${BRAND_NAME}: Bandwidth usage at ${usagePercent}%.\n\nView usage: ${url}`,
  }
}

export function workspaceInvite(data: Record<string, unknown>): TemplateResult {
  const workspaceName = String(data.workspace_name ?? '')
  const inviterName = String(data.inviter_name ?? '')
  const role = String(data.role ?? 'viewer')
  const url = String(data.url ?? '')
  return {
    subject: `You've been invited to "${workspaceName}" on ${BRAND_NAME}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Workspace invitation</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
        <strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong>
        as a <strong>${role}</strong>.
      </p>
      <a href="${url}" style="display:inline-block;padding:10px 20px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Accept invitation
      </a>
    `),
    text: `${BRAND_NAME}: ${inviterName} invited you to "${workspaceName}" as ${role}.\n\nAccept: ${url}`,
  }
}
