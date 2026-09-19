import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { schedules } from '@/db/schemas/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { days, startTime, endTime, groupId, subjectId, teacherId, roomId } = await req.json()

  if (!days || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: 'يجب اختيار يوم واحد على الأقل' }, { status: 400 })
  }
  if (!startTime || !endTime || !groupId || !subjectId || !teacherId) {
    return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 })
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: 'وقت البداية يجب أن يكون قبل وقت النهاية' }, { status: 400 })
  }

  const added: string[] = []
  const conflicts: string[] = []

  for (const day of days) {
    // Check teacher conflict on this day
    const teacherConflict = await db.select({ id: schedules.id }).from(schedules)
      .where(and(eq(schedules.teacherId, parseInt(teacherId)), eq(schedules.dayOfWeek, day)))
      .limit(1)

    if (teacherConflict.length > 0) {
      conflicts.push(`تعارض معلم: ${day}`)
      continue
    }

    // Check room conflict on this day
    if (roomId) {
      const roomConflict = await db.select({ id: schedules.id }).from(schedules)
        .where(and(eq(schedules.roomId, parseInt(roomId)), eq(schedules.dayOfWeek, day)))
        .limit(1)
      if (roomConflict.length > 0) {
        conflicts.push(`تعارض قاعة: ${day}`)
        continue
      }
    }

    await db.insert(schedules).values({
      dayOfWeek: day,
      startTime,
      endTime,
      groupId: parseInt(groupId),
      subjectId: parseInt(subjectId),
      teacherId: parseInt(teacherId),
      roomId: roomId ? parseInt(roomId) : null,
    })
    added.push(day)
  }

  const msg = added.length > 0
    ? `تم إضافة ${added.length} حصة بنجاح${conflicts.length > 0 ? `. تعارضات: ${conflicts.join('، ')}` : ''}`
    : `لم تتم إضافة أي حصة — ${conflicts.join('، ')}`

  return NextResponse.json({ success: added.length > 0, added: added.length, conflicts, message: msg })
}
