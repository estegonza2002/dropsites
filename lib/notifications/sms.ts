/**
 * SMS notification client.
 *
 * Uses Twilio in production. In development (no TWILIO_ACCOUNT_SID),
 * logs to console.
 */

export interface SendSMSOptions {
  to: string
  body: string
  from?: string
}

export interface SendSMSResult {
  success: boolean
  sid?: string
  error?: string
}

const DEFAULT_FROM = process.env.TWILIO_FROM_NUMBER ?? ''

interface TwilioMessageResponse {
  sid: string
  status: string
  errorCode?: number
  errorMessage?: string
}

function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  )
}

/**
 * Send an SMS via Twilio or dev console log.
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  const { to, body, from = DEFAULT_FROM } = options

  if (!isTwilioConfigured()) {
    // Dev mode: console log
    console.log('[sms:dev]', { to, body, from })
    return { success: true, sid: `dev-${Date.now()}` }
  }

  return sendViaTwilio(to, body, from)
}

/**
 * Send via Twilio REST API (no SDK dependency — uses fetch).
 * Keeps the dependency footprint minimal.
 */
async function sendViaTwilio(
  to: string,
  body: string,
  from: string,
): Promise<SendSMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })

    const data = (await response.json()) as TwilioMessageResponse

    if (!response.ok) {
      return {
        success: false,
        error: data.errorMessage ?? `Twilio error ${response.status}`,
      }
    }

    return { success: true, sid: data.sid }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown SMS error'
    console.error('[sms:twilio] Send failed:', message)
    return { success: false, error: message }
  }
}
