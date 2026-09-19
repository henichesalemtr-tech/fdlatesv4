import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, notificationReads } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const notifId = parseInt(id)

  const [notif] = await db.select().from(notifications).where(eq(notifications.id, notifId)).limit(1)
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update isReadBy JSON array (legacy compatibility)
  let readBy: number[] = []
  try { readBy = JSON.parse(notif.isReadBy ?? '[]') } catch {}
  if (!readBy.includes(session.id)) {
    readBy.push(session.id)
    await db.update(notifications).set({ isReadBy: JSON.stringify(readBy) }).where(eq(notifications.id, notifId))
  }

  // Also insert into notification_reads for accurate reception counter
  const body = await req.json().catch(() => ({}))
  const deviceId = body.deviceId ?? null

  const existing = await db.select({ id: notificationReads.id })
    .from(notificationReads)
    .where(and(
      eq(notificationReads.notificationId, notifId),
      eq(notificationReads.userId, session.id)
    )).limit(1)

  if (existing.length === 0) {
    await db.insert(notificationReads).values({
      notificationId: notifId,
      userId: session.id,
      deviceId,
      readAt: new Date(),
    })
  }

  return NextResponse.json({ success: true })
}
