import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, users, teacherGroups, groupStudents, students, teachers } from '@/db/schemas/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { sendPushToUsers } from '@/lib/push'

// ── Helper: get all guardian user IDs for a teacher's groups ─────────────────
async function getTeacherGroupGuardianIds(teacherUserId: number): Promise<number[]> {
  const [teacherUser] = await db.select({ teacherId: users.teacherId })
    .from(users).where(eq(users.id, teacherUserId)).limit(1)
  if (!teacherUser?.teacherId) return []

  const tGroups = await db.select({ groupId: teacherGroups.groupId })
    .from(teacherGroups).where(eq(teacherGroups.teacherId, teacherUser.teacherId))
  const groupIds = tGroups.map(g => g.groupId)
  if (groupIds.length === 0) return []

  const studentRows = await db.select({ studentId: groupStudents.studentId })
    .from(groupStudents).where(inArray(groupStudents.groupId, groupIds))
  const studentIds = studentRows.map(s => s.studentId)
  if (studentIds.length === 0) return []

  const guardianRows = await db.select({ guardianUserId: students.guardianUserId })
    .from(students)
    .where(and(inArray(students.id, studentIds), sql`${students.guardianUserId} IS NOT NULL`))
  return [...new Set(guardianRows.map(r => r.guardianUserId!).filter(Boolean))]
}

// ── POST /api/messages/broadcast ─────────────────────────────────────────────
// Teacher sends a group broadcast message to all guardians in their groups
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  if (session.role !== 'teacher') {
    return NextResponse.json({ error: 'هذه الميزة متاحة للمعلمين فقط' }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 })
  }

  const guardianIds = await getTeacherGroupGuardianIds(session.id)
  if (guardianIds.length === 0) {
    return NextResponse.json({ error: 'لا يوجد أولياء أمور مرتبطون بفوجك' }, { status: 404 })
  }

  // Insert one message per guardian
  const insertValues = guardianIds.map(gId => ({
    senderId: session.id,
    receiverId: gId,
    content: content.trim(),
  }))

  await db.insert(messages).values(insertValues)

  // Push notification
  const [sender] = await db.select({ fullName: users.fullName })
    .from(users).where(eq(users.id, session.id)).limit(1)
  const senderName = sender?.fullName ?? 'معلم'
  const preview = content.trim().slice(0, 80) + (content.trim().length > 80 ? '…' : '')

  await sendPushToUsers(guardianIds, `رسالة من ${senderName}`, preview, { url: '/messages' })
    .catch(() => {})

  return NextResponse.json({ sent: guardianIds.length })
}
