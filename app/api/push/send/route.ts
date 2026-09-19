/**
 * /api/push/send
 * POST — Sends a Web Push notification to target users.
 * Uses native Web Crypto API (CF Workers compatible).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pushSubscriptions, users } from '@/db/schemas/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getVapidConfig } from '@/lib/vapid'
import { sendWebPush } from '@/lib/web-push-cf'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let vapid: ReturnType<typeof getVapidConfig>
  try {
    vapid = getVapidConfig()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'VAPID configuration error'
    return NextResponse.json({ error: message }, { status: 503 })
  }

  let body: {
    title?: string; body?: string; icon?: string
    targetType?: string; targetIds?: number[]; url?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    title, body: notifBody, icon,
    targetType = 'all', targetIds = [], url = '/notifications',
  } = body

  if (!title || !notifBody) {
    return NextResponse.json({ error: 'العنوان والنص مطلوبان' }, { status: 400 })
  }

  let targetUserIds: number[] | null = null
  if (targetType === 'teachers') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'teacher'))
    targetUserIds = rows.map(u => u.id)
  } else if (targetType === 'guardians') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'guardian'))
    targetUserIds = rows.map(u => u.id)
  } else if (targetType === 'specific' && Array.isArray(targetIds) && targetIds.length > 0) {
    targetUserIds = targetIds.map(Number).filter(Boolean)
  }

  const subs = targetUserIds === null
    ? await db.select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth }).from(pushSubscriptions)
    : targetUserIds.length === 0
      ? []
      : await db.select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, targetUserIds))

  if (subs.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, cleaned: 0, total: 0, message: 'لا توجد اشتراكات نشطة' })
  }

  const payload = JSON.stringify({
    title, body: notifBody,
    icon: icon ?? '/icon-192x192.png',
    badge: '/notification-badge.png',
    dir: 'rtl', lang: 'ar',
    data: { url, tag: `ferdous-${Date.now()}` },
  })

  const expiredEndpoints: string[] = []

  const results = await Promise.allSettled(
    subs.map(async sub => {
      const resp = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapid,
        { TTL: 86400 },
      )
      if (resp.status === 410 || resp.status === 404) {
        expiredEndpoints.push(sub.endpoint)
        throw new Error(`expired: ${resp.status}`)
      }
      if (!resp.ok) throw new Error(`push failed: ${resp.status}`)
    })
  )

  if (expiredEndpoints.length > 0) {
    await Promise.allSettled(
      expiredEndpoints.map(ep =>
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, ep))
      )
    )
  }

  return NextResponse.json({
    success: true,
    sent:    results.filter(r => r.status === 'fulfilled').length,
    failed:  results.filter(r => r.status === 'rejected').length,
    cleaned: expiredEndpoints.length,
    total:   subs.length,
  })
}
