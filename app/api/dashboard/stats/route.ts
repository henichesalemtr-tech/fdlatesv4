import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, teachers, groups, groupStudents, attendances, notifications,
  teacherGroups,
} from '@/db/schemas/schema'
import { eq, count, sql, desc, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const isTeacher = session.role === 'teacher' && session.teacherId

  // If teacher: scope everything to their groups
  let teacherGroupIds: number[] = []
  let teacherStudentIds: number[] = []
  if (isTeacher) {
    const tGroups = await db
      .select({ groupId: teacherGroups.groupId })
      .from(teacherGroups)
      .where(eq(teacherGroups.teacherId, session.teacherId!))
    teacherGroupIds = tGroups.map(r => r.groupId)

    if (teacherGroupIds.length > 0) {
      const tStudents = await db
        .select({ studentId: groupStudents.studentId })
        .from(groupStudents)
        .where(inArray(groupStudents.groupId, teacherGroupIds))
      teacherStudentIds = tStudents.map(r => r.studentId)
    }
  }

  const [
    [totalStudents], [activeStudents], [withdrawnStudents], [waitingStudents],
    [totalTeachers], [totalGroups], [openGroups],
    groupsWithStudents,
    [todayPresent], [todayAbsent],
    recentNotifsRaw,
  ] = await Promise.all([
    // Students counts – scoped to teacher's students if teacher
    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(students).where(inArray(students.id, teacherStudentIds))
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(students),

    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(students)
          .where(sql`${students.id} = ANY(ARRAY[${sql.raw(teacherStudentIds.join(',') || '0')}]::int[]) AND ${students.status} = 'active'`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(students).where(eq(students.status, 'active')),

    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(students)
          .where(sql`${students.id} = ANY(ARRAY[${sql.raw(teacherStudentIds.join(',') || '0')}]::int[]) AND ${students.status} = 'withdrawn'`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(students).where(eq(students.status, 'withdrawn')),

    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(students)
          .where(sql`${students.id} = ANY(ARRAY[${sql.raw(teacherStudentIds.join(',') || '0')}]::int[]) AND ${students.status} = 'waiting'`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(students).where(eq(students.status, 'waiting')),

    // Teachers – always global
    db.select({ count: count() }).from(teachers),

    // Groups – scoped to teacher
    isTeacher && teacherGroupIds.length > 0
      ? db.select({ count: count() }).from(groups).where(inArray(groups.id, teacherGroupIds))
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(groups),

    isTeacher && teacherGroupIds.length > 0
      ? db.select({ count: count() }).from(groups)
          .where(sql`${groups.id} = ANY(ARRAY[${sql.raw(teacherGroupIds.join(',') || '0')}]::int[]) AND ${groups.status} = 'open'`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(groups).where(eq(groups.status, 'open')),

    // Groups with students
    isTeacher && teacherGroupIds.length > 0
      ? db.selectDistinct({ groupId: groupStudents.groupId }).from(groupStudents)
          .where(inArray(groupStudents.groupId, teacherGroupIds))
      : isTeacher
        ? []
        : db.selectDistinct({ groupId: groupStudents.groupId }).from(groupStudents),

    // Today attendance
    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(attendances)
          .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'present' AND ${attendances.studentId} = ANY(ARRAY[${sql.raw(teacherStudentIds.join(','))}]::int[])`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(attendances)
            .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'present'`),

    isTeacher && teacherStudentIds.length > 0
      ? db.select({ count: count() }).from(attendances)
          .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'absent' AND ${attendances.studentId} = ANY(ARRAY[${sql.raw(teacherStudentIds.join(','))}]::int[])`)
      : isTeacher
        ? [{ count: '0' }]
        : db.select({ count: count() }).from(attendances)
            .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'absent'`),

    // Recent notifications
    db.select({
      id: notifications.id, title: notifications.title, body: notifications.body,
      createdAt: notifications.createdAt, senderId: notifications.senderId,
      targetType: notifications.targetType, targetIds: notifications.targetIds,
    }).from(notifications).orderBy(desc(notifications.createdAt)).limit(20),
  ])

  let recentNotifs
  if (isTeacher && session.id) {
    recentNotifs = recentNotifsRaw.filter(n => {
      if (n.senderId === session.id) return true
      if (n.targetType === 'all' || n.targetType === 'teachers') return true
      if (n.targetType === 'specific') {
        try { return (JSON.parse(n.targetIds ?? '[]') as number[]).includes(session.id) } catch { return false }
      }
      return false
    }).slice(0, 3)
  } else {
    recentNotifs = recentNotifsRaw.slice(0, 3)
  }

  return NextResponse.json({
    students: {
      total: Number(totalStudents.count),
      active: Number(activeStudents.count),
      withdrawn: Number(withdrawnStudents.count),
      waiting: Number(waitingStudents.count),
    },
    teachers: { total: Number(totalTeachers.count) },
    groups: {
      total: Number(totalGroups.count),
      open: Number(openGroups.count),
      withStudents: groupsWithStudents.length,
      empty: Number(totalGroups.count) - groupsWithStudents.length,
    },
    today: {
      present: Number(todayPresent.count),
      absent: Number(todayAbsent.count),
      date: today,
    },
    recentNotifs,
    // scoped: true when data is filtered for teacher
    _scoped: isTeacher ? true : false,
    _scopedGroupCount: isTeacher ? teacherGroupIds.length : null,
  })
}
