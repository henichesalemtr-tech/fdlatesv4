/**
 * Shared, non-fatal Web Push helper for the Vercel/Node.js runtime.
 */

import { db } from '@/db'
import { pushSubscriptions, users } from '@/db/schemas/schema'
import { eq, inArray } from 'drizzle-orm'
import { getVapidConfig } from '@/lib/vapid'
import { sendWebPush } from '@/lib/web-push-cf'

export type PushResult = {
  sent: number
  failed: number
  cleaned: number
  total: number
  errorsByStatus: Record<string, number>
}

const EMPTY: PushResult = {
  sent: 0,
  failed: 0,
  cleaned: 0,
  total: 0,
  errorsByStatus: {},
}

export async function resolvePushTargets(
  targetType: string,
  targetIds?: number[] | null,
): Promise<number[] | null> {
  if (targetType === 'teachers') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'teacher'))
    return rows.map(r => r.id)
  }
  if (targetType === 'guardians') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'guardian'))
    return rows.map(r => r.id)
  }
  if (targetType === 'specific') {
    return (targetIds ?? []).map(Number).filter(Boolean)
  }
  return null
}

export async function sendPushToUsers(
  userIds: number[] | null,
  title: string,
  body: string,
  opts: { url?: string; guardianUrl?: string; icon?: string } = {},
): Promise<PushResult> {
  try {
    if (Array.isArray(userIds) && userIds.length === 0) return EMPTY

    let vapid: ReturnType<typeof getVapidConfig>
    try {
      vapid = getVapidConfig()
    } catch (error) {
      console.error('[WebPush] VAPID configuration is missing or invalid', error)
      return { ...EMPTY, errorsByStatus: { configuration: 1 } }
    }

    const subs = userIds === null
      ? await db.select({
          userId: pushSubscriptions.userId,
          endpoint: pushSubscriptions.endpoint,
          p256dh: pushSubscriptions.p256dh,
          auth: pushSubscriptions.auth,
        }).from(pushSubscriptions)
      : await db.select({
          userId: pushSubscriptions.userId,
          endpoint: pushSubscriptions.endpoint,
          p256dh: pushSubscriptions.p256dh,
          auth: pushSubscriptions.auth,
        }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds))

    if (subs.length === 0) return EMPTY

    const subUserIds = [...new Set(subs.map(s => s.userId).filter((id): id is number => id !== null))]
    const roleRows = subUserIds.length > 0
      ? await db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.id, subUserIds))
      : []
    const roleById = new Map(roleRows.map(r => [r.id, r.role]))

    const staffUrl = opts.url ?? '/notifications'
    const guardianUrl = opts.guardianUrl ?? '/guardian-dashboard'
    const icon = opts.icon ?? '/icon-192x192.png'
    const expired: string[] = []

    const results = await Promise.all(subs.map(async sub => {
      const url = roleById.get(sub.userId ?? -1) === 'guardian' ? guardianUrl : staffUrl
      const payload = JSON.stringify({
        title,
        body,
        icon,
        badge: '/notification-badge.png',
        dir: 'rtl',
        lang: 'ar',
        data: { url, tag: `ferdous-${Date.now()}` },
      })

      const resp = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapid,
        { TTL: 86400 },
      )

      if (resp.status === 410 || resp.status === 404) expired.push(sub.endpoint)
      return { ok: resp.ok, status: resp.status }
    }))

    if (expired.length > 0) {
      await Promise.allSettled(expired.map(ep =>
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, ep))
      ))
    }

    const errorsByStatus: Record<string, number> = {}
    for (const result of results) {
      if (!result.ok) {
        const key = String(result.status)
        errorsByStatus[key] = (errorsByStatus[key] ?? 0) + 1
      }
    }

    const sent = results.filter(r => r.ok).length
    return {
      sent,
      failed: results.length - sent,
      cleaned: expired.length,
      total: subs.length,
      errorsByStatus,
    }
  } catch (error) {
    console.error('[WebPush] Unexpected delivery error', error)
    return { ...EMPTY, errorsByStatus: { internal: 1 } }
  }
}

export async function sendPushToUsersExcluding(
  userIds: number[] | null,
  excludeUserId: number,
  title: string,
  body: string,
  opts: { url?: string; guardianUrl?: string; icon?: string } = {},
): Promise<PushResult> {
  if (userIds === null) return sendPushToUsers(null, title, body, opts)
  return sendPushToUsers(userIds.filter(id => id !== excludeUserId), title, body, opts)
}
