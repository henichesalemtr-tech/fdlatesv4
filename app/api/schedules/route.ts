import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { schedules, groups, subjects, teachers, rooms } from '@/db/schemas/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const result = await db
      .select({
        id: schedules.id,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        groupId: schedules.groupId,
        subjectId: schedules.subjectId,
        teacherId: schedules.teacherId,
        roomId: schedules.roomId,
        groupName: groups.name,
        subjectName: subjects.name,
        teacherName: teachers.fullName,
        roomName: rooms.name,
      })
      .from(schedules)
      .leftJoin(groups, eq(schedules.groupId, groups.id))
      .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
      .leftJoin(teachers, eq(schedules.teacherId, teachers.id))
      .leftJoin(rooms, eq(schedules.roomId, rooms.id))
      .orderBy(desc(schedules.createdAt))
  
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({})) as { ids?: unknown }
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map(value => Number(value)).filter(id => Number.isInteger(id) && id > 0))]
      : []
    if (ids.length === 0) return NextResponse.json({ error: 'لم يتم تحديد أي حصة للحذف' }, { status: 400 })
    const deleted = await db.delete(schedules).where(inArray(schedules.id, ids)).returning({ id: schedules.id })
    return NextResponse.json({ success: true, deletedCount: deleted.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في حذف الحصص' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { dayOfWeek, startTime, endTime, groupId, subjectId, teacherId, roomId } = await req.json()
    if (!dayOfWeek || !startTime || !endTime || !groupId || !subjectId || !teacherId) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 })
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'وقت البداية يجب أن يكون قبل وقت النهاية' }, { status: 400 })
    }
    const [created] = await db.insert(schedules).values({
      dayOfWeek, startTime, endTime,
      groupId: parseInt(groupId),
      subjectId: parseInt(subjectId),
      teacherId: parseInt(teacherId),
      roomId: roomId ? parseInt(roomId) : null,
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
