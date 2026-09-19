import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, users, groupStudents, teacherGroups, students, notificationReads } from '@/db/schemas/schema'
import { eq, desc, and, inArray, or, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { resolvePushTargets, sendPushToUsers } from '@/lib/push'

// Helper: get guardian user IDs for a specific group
async function getGroupGuardianUserIds(groupId: number): Promise<number[]> {
  const gs = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupId, groupId))
  const studentIds = [...new Set(gs.map(g => g.studentId))]
  if (studentIds.length === 0) return []
  const studs = await db
    .select({ guardianUserId: students.guardianUserId })
    .from(students)
    .where(and(inArray(students.id, studentIds), sql`${students.guardianUserId} IS NOT NULL`))
  return [...new Set(studs.map(s => s.guardianUserId).filter((id): id is number => id !== null))]
}

// Helper: get guardian user IDs for a teacher's groups (3 batched queries)
async function getTeacherGroupGuardianUserIds(teacherId: number): Promise<number[]> {
  const tGroups = await db
    .select({ groupId: teacherGroups.groupId })
    .from(teacherGroups)
    .where(eq(teacherGroups.teacherId, teacherId))
  const groupIds = tGroups.map(g => g.groupId).filter((id): id is number => id !== null)
  if (groupIds.length === 0) return []

  const gs = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(inArray(groupStudents.groupId, groupIds))
  const studentIds = [...new Set(gs.map(g => g.studentId))]
  if (studentIds.length === 0) return []

  const studs = await db
    .select({ guardianUserId: students.guardianUserId })
    .from(students)
    .where(and(inArray(students.id, studentIds), sql`${students.guardianUserId} IS NOT NULL`))

  return [...new Set(studs.map(s => s.guardianUserId).filter((id): id is number => id !== null))]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const forMe = searchParams.get('forMe') === '1'
  const notifType = searchParams.get('type') // 'auto' | 'manual' — tab filtering
  const search = searchParams.get('search') ?? ''

  // ── SQL-level filters (type tab + teacher ownership) ────────────────────
  const conditions = []

  // Tab filtering — General = manual only, Automatic = system-generated only
  if (notifType === 'auto') {
    conditions.push(inArray(notifications.notificationType, ['auto_absence', 'auto_late']))
  } else if (notifType === 'manual') {
    conditions.push(eq(notifications.notificationType, 'manual'))
  }

  // Teacher scope (not the personal inbox view): only notifications they sent
  // themselves, plus automatic absence/late notifications belonging to the
  // guardians of students in their OWN groups. Never other teachers' data.
  let teacherGuardianIds: number[] = []
  if (!forMe && session.role === 'teacher') {
    if (session.teacherId) {
      teacherGuardianIds = await getTeacherGroupGuardianUserIds(session.teacherId)
    }
    conditions.push(eq(notifications.senderId, session.id))
  }

  const rows = await db.select({
    id: notifications.id,
    title: notifications.title,
    body: notifications.body,
    senderId: notifications.senderId,
    targetType: notifications.targetType,
    targetIds: notifications.targetIds,
    isReadBy: notifications.isReadBy,
    notificationType: notifications.notificationType,
    createdAt: notifications.createdAt,
    senderName: users.fullName,
    senderUsername: users.username,
  })
  .from(notifications)
  .leftJoin(users, eq(notifications.senderId, users.id))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(notifications.createdAt))

  let allNotifs = rows

  // Extra automatic notifications for the teacher's own students' guardians
  if (!forMe && session.role === 'teacher' && teacherGuardianIds.length > 0) {
    const autoConditions = [
      inArray(notifications.notificationType, ['auto_absence', 'auto_late']),
      eq(notifications.targetType, 'specific'),
    ]
    if (notifType === 'manual') {
      // "General" tab must not show automatic notifications at all
    } else {
      const autoRows = await db.select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        senderId: notifications.senderId,
        targetType: notifications.targetType,
        targetIds: notifications.targetIds,
        isReadBy: notifications.isReadBy,
        notificationType: notifications.notificationType,
        createdAt: notifications.createdAt,
        senderName: users.fullName,
        senderUsername: users.username,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(and(...autoConditions))
      .orderBy(desc(notifications.createdAt))

      const mine = autoRows.filter(n => {
        try {
          const ids: number[] = JSON.parse(n.targetIds ?? '[]')
          return ids.some(id => teacherGuardianIds.includes(id))
        } catch { return false }
      })

      const seen = new Set(allNotifs.map(n => n.id))
      allNotifs = [...allNotifs, ...mine.filter(n => !seen.has(n.id))]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    }
  }

  // Personal inbox filtering (unchanged behaviour)
  if (forMe) {
    allNotifs = allNotifs.filter(n => {
      if (n.targetType === 'all') return true
      if (n.targetType === 'teachers' && session.role === 'teacher') return true
      if (n.targetType === 'guardians' && session.role === 'guardian') return true
      if (n.targetType === 'specific') {
        try {
          const ids: number[] = JSON.parse(n.targetIds ?? '[]')
          return ids.includes(session.id)
        } catch { return false }
      }
      return false
    })
  }

  // Search filtering
  if (search) {
    const q = search.toLowerCase()
    allNotifs = allNotifs.filter(n =>
      n.title?.toLowerCase().includes(q) ||
      n.body?.toLowerCase().includes(q) ||
      (n.senderName ?? '').toLowerCase().includes(q) ||
      (n.senderUsername ?? '').toLowerCase().includes(q) ||
      (n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar') : '').includes(q)
    )
  }

  // Reception counts (single batched query)
  const notifIds = allNotifs.map(n => n.id)
  const readCounts: Record<number, { accounts: number; devices: number }> = {}
  if (notifIds.length > 0) {
    const reads = await db.select({
      notificationId: notificationReads.notificationId,
      userId: notificationReads.userId,
      deviceId: notificationReads.deviceId,
    }).from(notificationReads).where(inArray(notificationReads.notificationId, notifIds))

    for (const r of reads) {
      if (!readCounts[r.notificationId]) readCounts[r.notificationId] = { accounts: 0, devices: 0 }
      if (r.userId) readCounts[r.notificationId].accounts++
      if (r.deviceId) readCounts[r.notificationId].devices++
    }
  }

  const result = allNotifs.map(n => {
    let readBy: number[] = []
    try { readBy = JSON.parse(n.isReadBy ?? '[]') } catch {}
    return {
      ...n,
      isRead: readBy.includes(session.id),
      receptionAccounts: readCounts[n.id]?.accounts ?? 0,
      receptionDevices: readCounts[n.id]?.devices ?? 0,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, targetType, targetIds, notificationType, groupId: bodyGroupId } = await req.json()
  if (!title || !body) return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 })

  let resolvedTargetType = targetType ?? 'all'
  let resolvedTargetIds: number[] | null = targetIds ?? null

  // Admin sending to a specific group's guardians (e.g. from ranking page)
  if (session.role === 'admin' && targetType === 'myGuardians' && bodyGroupId) {
    const guardianIds = await getGroupGuardianUserIds(parseInt(bodyGroupId))
    resolvedTargetType = 'specific'
    resolvedTargetIds = guardianIds
    if (guardianIds.length === 0) {
      return NextResponse.json({ error: 'لا يوجد أولياء أمور مرتبطون بطلاب هذا الفوج' }, { status: 400 })
    }
  } else if (session.role === 'teacher') {
    if (!session.teacherId) return NextResponse.json({ error: 'حساب المعلم غير مرتبط' }, { status: 403 })
    const allowedGuardianIds = await getTeacherGroupGuardianUserIds(session.teacherId)

    if (targetType === 'myGuardians') {
      // One notification to ALL guardians of the teacher's own groups
      resolvedTargetType = 'specific'
      resolvedTargetIds = allowedGuardianIds
    } else if (targetType === 'specific' && Array.isArray(targetIds)) {
      const filtered = (targetIds as number[]).filter(id => allowedGuardianIds.includes(id))
      if (filtered.length === 0) return NextResponse.json({ error: 'لا يوجد أولياء أمور صالحون' }, { status: 400 })
      resolvedTargetType = 'specific'
      resolvedTargetIds = filtered
    } else {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    if (!resolvedTargetIds || resolvedTargetIds.length === 0) {
      return NextResponse.json({ error: 'لا يوجد أولياء أمور مرتبطون بطلاب فوجك' }, { status: 400 })
    }
  }

  const [created] = await db.insert(notifications).values({
    title,
    body,
    senderId: session.id,
    targetType: resolvedTargetType,
    targetIds: resolvedTargetIds ? JSON.stringify(resolvedTargetIds) : null,
    isReadBy: '[]',
    notificationType: notificationType ?? 'manual',
  }).returning()

  // ── Web Push — triggered server-side, never blocks saving ───────────────
  const pushTargets = await resolvePushTargets(resolvedTargetType, resolvedTargetIds)
  const push = await sendPushToUsers(pushTargets, title, body, {
    url: '/notifications',
    guardianUrl: '/guardian-dashboard',
  })

  await logActivity({
    userId: session.id,
    userFullName: session.fullName ?? session.username,
    userRole: session.role,
    action: 'notification',
    entity: 'notification',
    entityId: created.id,
    description: `أرسل إشعاراً: "${title}" إلى ${resolvedTargetType === 'all' ? 'الجميع' : `${resolvedTargetIds?.length ?? 0} مستخدم`}`,
  })

  return NextResponse.json({ ...created, push }, { status: 201 })
}

// DELETE — bulk delete
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'يجب تحديد إشعارات للحذف' }, { status: 400 })
  }

  // Admin can delete any; teacher can only delete their own sent notifications
  let toDelete = ids as number[]
  if (session.role === 'teacher') {
    const owned = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(inArray(notifications.id, toDelete), eq(notifications.senderId, session.id)))
    toDelete = owned.map(n => n.id)
  }

  if (toDelete.length === 0) return NextResponse.json({ error: 'لا توجد إشعارات مسموح بحذفها' }, { status: 403 })

  await db.delete(notifications).where(inArray(notifications.id, toDelete))
  return NextResponse.json({ success: true, deleted: toDelete.length })
}
