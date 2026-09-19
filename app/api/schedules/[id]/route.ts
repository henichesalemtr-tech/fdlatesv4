import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { schedules } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const { dayOfWeek, startTime, endTime, groupId, subjectId, teacherId, roomId } = await req.json()
    const [updated] = await db.update(schedules).set({
      dayOfWeek, startTime, endTime,
      groupId: groupId ? parseInt(groupId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: teacherId ? parseInt(teacherId) : null,
      roomId: roomId ? parseInt(roomId) : null,
    }).where(eq(schedules.id, parseInt(id))).returning()
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    await db.delete(schedules).where(eq(schedules.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
