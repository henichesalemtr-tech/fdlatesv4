/**
 * /api/push/subscribe
 *
 * GET    — Returns the VAPID public key (browser uses it to create a subscription)
 * POST   — Saves / upserts a push subscription linked to the session user
 * DELETE — Removes a push subscription by endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pushSubscriptions } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getVapidPublicKey } from '@/lib/vapid'

// ── GET: Return VAPID public key ──────────────────────────────
export async function GET() {
  const publicKey = getVapidPublicKey()

  if (!publicKey) {
    console.error(
      '[Push/Subscribe] VAPID_PUBLIC_KEY is not set in environment. ' +
      'Add it to your .env file or Vercel environment variables.'
    )
    return NextResponse.json(
      {
        error: 'إشعارات Web Push غير مهيّأة على هذا الخادم',
        hint: 'VAPID_PUBLIC_KEY environment variable is missing',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ publicKey })
}

// ── POST: Save or upsert push subscription ────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { endpoint, keys } = body as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: 'بيانات الاشتراك غير مكتملة — endpoint و keys.p256dh و keys.auth مطلوبة' },
      { status: 400 }
    )
  }

  try {
    await db
      .insert(pushSubscriptions)
      .values({ userId: session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: keys.p256dh, auth: keys.auth, userId: session.id },
      })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Push/Subscribe] DB upsert error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// ── DELETE: Remove push subscription ─────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { endpoint } = body as { endpoint?: string }
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint مطلوب' }, { status: 400 })
  }

  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Push/Subscribe] DB delete error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
