import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { activityLogs } from '@/db/schemas/schema'
import { desc, sql } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'settings.activity_logs') && !await hasPermission(session, 'activity_logs.view')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const entity = searchParams.get('entity')
    const offset = (page - 1) * limit

    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(activityLogs)

    return NextResponse.json({ logs, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Internal endpoint — called from other API routes to log actions
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { action, entity, entityId, description, metadata } = await req.json()
    if (!action || !description) {
      return NextResponse.json({ error: 'action و description مطلوبان' }, { status: 400 })
    }
    await db.insert(activityLogs).values({
      userId: session.id,
      userFullName: session.fullName ?? session.username,
      userRole: session.role,
      action,
      entity: entity ?? null,
      entityId: entityId ?? null,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
