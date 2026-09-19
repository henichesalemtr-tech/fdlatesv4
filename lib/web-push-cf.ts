/**
 * Web Push transport for the Vercel/Node.js runtime.
 *
 * The previous implementation mixed aes128gcm payload framing with the
 * legacy aesgcm content-encoding header. The web-push package handles VAPID
 * and payload encryption using the current Web Push protocol.
 */

import webpush from 'web-push'

export interface VapidDetails {
  subject: string
  publicKey: string
  privateKey: string
}

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscription {
  endpoint: string
  keys: PushSubscriptionKeys
}

function getErrorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const status = Number((error as { statusCode?: unknown }).statusCode)
    if (Number.isInteger(status) && status >= 100 && status <= 599) return status
  }
  return 500
}

function getErrorBody(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (error as { body?: unknown }).body
    if (typeof body === 'string') return body
  }
  return error instanceof Error ? error.message : 'Web Push delivery failed'
}

export async function sendWebPush(
  subscription: PushSubscription,
  payloadString: string,
  vapid: VapidDetails,
  options: { TTL?: number } = {},
): Promise<Response> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await webpush.sendNotification(
        subscription,
        payloadString,
        { TTL: options.TTL ?? 86400 },
      )

      return new Response(result.body || null, {
        status: result.statusCode,
        headers: result.headers as HeadersInit,
      })
    } catch (error: unknown) {
      lastError = error
      const status = getErrorStatus(error)
      const body = getErrorBody(error)
      const retryable = status === 408 || status === 425 || status === 429 || status >= 500
      if (!retryable || attempt === 2) {
        console.error('[WebPush] Delivery failed', {
          status,
          attempts: attempt + 1,
          message: body.slice(0, 300),
          endpointHost: (() => {
            try { return new URL(subscription.endpoint).host } catch { return 'invalid-endpoint' }
          })(),
        })
        return new Response(body, { status })
      }
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  const status = getErrorStatus(lastError)
  return new Response(getErrorBody(lastError), { status })
}
