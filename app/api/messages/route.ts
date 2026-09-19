import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, users, teacherGroups, groupStudents, students, teachers } from '@/db/schemas/schema'
import { eq, or, and, desc, sql, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { sendPushToUsers } from '@/lib/push'

// ── Helper: get guardian user IDs accessible by a teacher ──────────────────
async function getTeacherAccessibleGuardianIds(teacherUserId: number): Promise<number[]> {
  const [teacherUser] = await db.select({ teacherId: users.teacherId })
    .from(users).where(eq(users.id, teacherUserId)).limit(1)
  if (!teacherUser?.teacherId) return []

  const tGroups = await db.select({ groupId: teacherGroups.groupId })
    .from(teacherGroups).where(eq(teacherGroups.teacherId, teacherUser.teacherId))
  if (tGroups.length === 0) return []

  const groupIds = tGroups.map(g => g.groupId)

  const gStudents = await db.select({ studentId: groupStudents.studentId })
    .from(groupStudents).where(inArray(groupStudents.groupId, groupIds))
  if (gStudents.length === 0) return []

  const studentIds = gStudents.map(s => s.studentId)

  const guardianRows = await db.select({ guardianUserId: students.guardianUserId })
    .from(students)
    .where(and(inArray(students.id, studentIds), sql`${students.guardianUserId} IS NOT NULL`))

  return [...new Set(guardianRows.map(r => r.guardianUserId!).filter(Boolean))]
}

// ── Helper: teacher user IDs a guardian may message ────────────────────────
// Only the teachers assigned to the groups of the guardian's own children.
async function getGuardianAccessibleTeacherIds(guardianUserId: number): Promise<number[]> {
  // 1. Children of this guardian
  const childRows = await db.select({ id: students.id })
    .from(students).where(eq(students.guardianUserId, guardianUserId))
  if (childRows.length === 0) return []

  // 2. Groups of those children
  const gRows = await db.select({ groupId: groupStudents.groupId })
    .from(groupStudents).where(inArray(groupStudents.studentId, childRows.map(c => c.id)))
  const groupIds = [...new Set(gRows.map(g => g.groupId))]
  if (groupIds.length === 0) return []

  // 3. Teachers assigned to those groups
  const tRows = await db.select({ teacherId: teacherGroups.teacherId })
    .from(teacherGroups).where(inArray(teacherGroups.groupId, groupIds))
  const teacherIds = [...new Set(tRows.map(t => t.teacherId))]
  if (teacherIds.length === 0) return []

  // 4. Their user accounts
  const userRows = await db.select({ id: users.id })
    .from(users).where(and(inArray(users.teacherId, teacherIds), sql`${users.id} != ${guardianUserId}`))

  return [...new Set(userRows.map(u => u.id))]
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const withUserId = searchParams.get('withUserId')
  const inbox      = searchParams.get('inbox')
  const unread     = searchParams.get('unread')

  // ── Unread counter ────────────────────────────────────────────────────────
  if (unread) {
    const [row] = await db.select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.receiverId, session.id), eq(messages.isRead, false)))
    return NextResponse.json({ unread: row?.count ?? 0 })
  }

  // ── Conversation with specific user ──────────────────────────────────────
  if (withUserId) {
    const otherUserId = parseInt(withUserId)
    const conversation = await db
      .select({
        id: messages.id, content: messages.content, isRead: messages.isRead,
        createdAt: messages.createdAt, senderId: messages.senderId,
        receiverId: messages.receiverId, senderName: users.fullName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(or(
        and(eq(messages.senderId, session.id), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, session.id))
      ))
      .orderBy(desc(messages.createdAt))
      .limit(50)

    // Mark as read
    await db.update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(messages.senderId, otherUserId),
        eq(messages.receiverId, session.id),
        eq(messages.isRead, false)
      ))

    return NextResponse.json(conversation.reverse())
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  if (inbox) {
    const allMessages = await db.select().from(messages)
      .where(or(eq(messages.senderId, session.id), eq(messages.receiverId, session.id)))
      .orderBy(desc(messages.createdAt))

    const convMap = new Map<number, { userId: number; lastMessage: typeof messages.$inferSelect; unread: number }>()
    for (const msg of allMessages) {
      const otherId = msg.senderId === session.id ? msg.receiverId : msg.senderId
      if (!convMap.has(otherId)) convMap.set(otherId, { userId: otherId, lastMessage: msg, unread: 0 })
      if (msg.receiverId === session.id && !msg.isRead) convMap.get(otherId)!.unread++
    }

    // Batch-load the other participants (was N+1: one query per conversation)
    const otherIds = [...convMap.keys()]
    const participants = otherIds.length > 0
      ? await db.select({ id: users.id, fullName: users.fullName, role: users.role })
          .from(users).where(inArray(users.id, otherIds))
      : []
    const byId = new Map(participants.map(u => [u.id, u]))

    const convList = []
    for (const [userId, conv] of convMap) {
      const user = byId.get(userId)
      if (user) convList.push({ ...conv, user: { id: user.id, fullName: user.fullName, role: user.role } })
    }
    return NextResponse.json(convList)
  }

  // ── List of contactable users ─────────────────────────────────────────────
  // Teacher: only guardians of their group's students
  if (session.role === 'teacher') {
    const guardianIds = await getTeacherAccessibleGuardianIds(session.id)
    if (guardianIds.length === 0) return NextResponse.json([])

    const guardianUsers = await db.select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(and(inArray(users.id, guardianIds), sql`${users.id} != ${session.id}`))
    return NextResponse.json(guardianUsers)
  }

  // Guardian: only teachers assigned to their children's groups + admin/supervisor users
  if (session.role === 'guardian') {
    const teacherUserIds = await getGuardianAccessibleTeacherIds(session.id)

    // Also include admin/supervisor/manager users so guardian can contact admin
    const adminUsers = await db.select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(and(
        sql`${users.role} IN ('admin', 'supervisor', 'manager', 'مشرف', 'مدير', 'اداري')`,
        sql`${users.id} != ${session.id}`,
        sql`${users.status} = 'active'`
      ))
    const adminIds = adminUsers.map(u => u.id)
    const allIds = [...new Set([...teacherUserIds, ...adminIds])]
    if (allIds.length === 0) return NextResponse.json([])

    const contactUsers = await db.select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(inArray(users.id, allIds))
    return NextResponse.json(contactUsers)
  }

  // Admin: all users except self
  const allUsers = await db.select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(sql`${users.id} != ${session.id}`)
  return NextResponse.json(allUsers)
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { receiverId, content } = await req.json()
  if (!receiverId || !content?.trim()) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const targetId = parseInt(receiverId)

  // Teacher: validate target is a guardian from their groups
  if (session.role === 'teacher') {
    const accessibleIds = await getTeacherAccessibleGuardianIds(session.id)
    const existingConv = await db.select({ id: messages.id }).from(messages)
      .where(and(eq(messages.senderId, targetId), eq(messages.receiverId, session.id)))
      .limit(1)

    if (!accessibleIds.includes(targetId) && existingConv.length === 0) {
      return NextResponse.json({ error: 'غير مصرح بإرسال رسائل لهذا المستخدم' }, { status: 403 })
    }
  }

  // Guardian: only teachers of their children's groups (or an existing thread) + admin users
  if (session.role === 'guardian') {
    const accessibleIds = await getGuardianAccessibleTeacherIds(session.id)
    const existingConv = await db.select({ id: messages.id }).from(messages)
      .where(and(eq(messages.senderId, targetId), eq(messages.receiverId, session.id)))
      .limit(1)

    // Check if target is an admin/supervisor
    const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId)).limit(1)
    const isAdmin = targetUser && ['admin', 'supervisor', 'manager', 'مشرف', 'مدير', 'اداري'].includes(targetUser.role)

    if (!accessibleIds.includes(targetId) && existingConv.length === 0 && !isAdmin) {
      return NextResponse.json({ error: 'يمكنك مراسلة معلمي أفواج أبنائكم والإدارة فقط' }, { status: 403 })
    }
  }

  const [newMsg] = await db.insert(messages).values({
    senderId: session.id,
    receiverId: targetId,
    content: content.trim(),
  }).returning()

  // ── Push notification to receiver (non-fatal) ─────────────────────────────
  const [sender] = await db.select({ fullName: users.fullName })
    .from(users).where(eq(users.id, session.id)).limit(1)

  const senderName = sender?.fullName ?? 'مستخدم'
  const preview = content.trim().slice(0, 80) + (content.trim().length > 80 ? '…' : '')
  await sendPushToUsers([targetId], `رسالة جديدة من ${senderName}`, preview, {
    url: '/messages',
    guardianUrl: '/guardian-dashboard',
  })

  return NextResponse.json({ success: true, message: newMsg })
}
