/**
 * Email notification client.
 *
 * Uses Resend in production. Falls back to SMTP if SMTP_HOST is set.
 * In development (no RESEND_API_KEY and no SMTP_HOST), logs to console.
 */

import { Resend } from 'resend'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? 'DropSites <notifications@dropsites.io>'

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST)
}

/**
 * Send an email via Resend, SMTP fallback, or dev console log.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const { to, subject, html, text, from = DEFAULT_FROM, replyTo } = options

  // --- SMTP fallback ---
  if (isSmtpConfigured()) {
    return sendViaSmtp({ to, subject, html, text, from, replyTo })
  }

  // --- Resend ---
  const resend = getResendClient()
  if (resend) {
    return sendViaResend(resend, { to, subject, html, text, from, replyTo })
  }

  // --- Dev mode: console log ---
  console.log('[email:dev]', {
    to,
    subject,
    from,
    textLength: text.length,
    htmlLength: html.length,
  })
  return { success: true, id: `dev-${Date.now()}` }
}

async function sendViaResend(
  resend: Resend,
  options: SendEmailOptions & { from: string },
): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    return { success: false, error: message }
  }
}

/**
 * SMTP fallback using nodemailer-style transport.
 *
 * For self-hosted deployments that don't use Resend. Requires `nodemailer`
 * to be installed as an optional peer dependency (`pnpm add nodemailer`).
 */
async function sendViaSmtp(
  options: SendEmailOptions & { from: string },
): Promise<SendEmailResult> {
  try {
    // Dynamic require — nodemailer is an optional dependency only needed for SMTP.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (msg: Record<string, unknown>) => Promise<{ messageId: string }>
      }
    }

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })

    const info = await transport.sendMail({
      from: options.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    })

    return { success: true, id: info.messageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown SMTP error'
    console.error('[email:smtp] Send failed:', message)
    return { success: false, error: message }
  }
}
