import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, groupStudents, teacherGroups, students } from '@/db/schemas/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const notifId = parseInt(id)
  if (isNaN(notifId)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  // Fetch the notification first
  const [notif] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notifId))
    .limit(1)

  if (!notif) return NextResponse.json({ error: 'الإشعار غير موجود' }, { status: 404 })

  // Admin: may delete anything
  if (session.role === 'admin') {
    await db.delete(notifications).where(eq(notifications.id, notifId))
    return NextResponse.json({ success: true })
  }

  // Check teacher's allowed reasons:
  let allowed = false

  // 1. Teacher is the sender
  if (notif.senderId === session.id) {
    allowed = true
  }

  // 2. Auto absence/late notification targeting a guardian of one of the teacher's own students
  if (!allowed && session.role === 'teacher' && session.teacherId &&
    (notif.notificationType === 'auto_absence' || notif.notificationType === 'auto_late') &&
    notif.targetType === 'specific') {
    try {
      const targetIds: number[] = JSON.parse(notif.targetIds ?? '[]')
      if (targetIds.length > 0) {
        // Get guardian user IDs for this teacher's groups
        const tGroups = await db
          .select({ groupId: teacherGroups.groupId })
          .from(teacherGroups)
          .where(eq(teacherGroups.teacherId, session.teacherId))
        const groupIds = tGroups.map(g => g.groupId).filter((gid): gid is number => gid !== null)
        if (groupIds.length > 0) {
          const gs = await db
            .select({ studentId: groupStudents.studentId })
            .from(groupStudents)
            .where(inArray(groupStudents.groupId, groupIds))
          const studentIds = [...new Set(gs.map(g => g.studentId))]
          if (studentIds.length > 0) {
            const studs = await db
              .select({ guardianUserId: students.guardianUserId })
              .from(students)
              .where(and(inArray(students.id, studentIds), sql`${students.guardianUserId} IS NOT NULL`))
            const myGuardianIds = [...new Set(studs.map(s => s.guardianUserId).filter((gid): gid is number => gid !== null))]
            if (targetIds.some(tid => myGuardianIds.includes(tid))) {
              allowed = true
            }
          }
        }
      }
    } catch { /* ignore JSON parse errors */ }
  }

  // 3. Notification sent by admin directly to this teacher (targetType='specific', targetIds includes session.id)
  if (!allowed && notif.targetType === 'specific') {
    try {
      const targetIds: number[] = JSON.parse(notif.targetIds ?? '[]')
      if (targetIds.includes(session.id)) {
        allowed = true
      }
    } catch { /* ignore */ }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'غير مصرح بحذف هذا الإشعار' }, { status: 403 })
  }

  await db.delete(notifications).where(eq(notifications.id, notifId))
  return NextResponse.json({ success: true })
}
