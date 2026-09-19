/**
 * lib/vapid.ts
 * ─────────────────────────────────────────────────────────────────
 * Central helper for reading and validating VAPID environment vars
 * at RUNTIME (not build time).
 *
 * Why not use next.config `env` block?
 *   The `env` block in next.config bakes values at BUILD time.
 *   If VAPID keys are not present when `next build` runs (e.g. CI/CD
 *   pipeline before secrets are injected), the built bundle contains
 *   empty strings — and every request will return 503 in production.
 *
 *   Reading `process.env` directly inside route handlers ensures the
 *   values are resolved at request time from the actual runtime env.
 */

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

/**
 * Returns the VAPID config read from environment variables at runtime.
 * Throws a descriptive error if any required variable is missing so
 * the server returns a clear 503 instead of a cryptic crash.
 */
export function getVapidConfig(): VapidConfig {
  const publicKey  = process.env.VAPID_PUBLIC_KEY  ?? ''
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject    = process.env.VAPID_SUBJECT     ?? 'mailto:admin@ferdous.app'

  const missing: string[] = []
  if (!publicKey)  missing.push('VAPID_PUBLIC_KEY')
  if (!privateKey) missing.push('VAPID_PRIVATE_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Web Push غير مهيّأ — المتغيرات التالية مفقودة: ${missing.join(', ')}.\n` +
      'راجع ملف .env.example للتعليمات.'
    )
  }

  return { publicKey, privateKey, subject }
}

/**
 * Returns the public VAPID key only (safe to call from GET /api/push/subscribe).
 * Returns null (not throws) if the key is missing, so the client can
 * show a graceful "notifications not configured" message.
 */
export function getVapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY ?? ''
  return key || null
}
