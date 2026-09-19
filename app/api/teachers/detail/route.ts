/**
 * /api/teachers/detail?id=<teacherId>
 * GET - returns full teacher profile: info, schedules, salary history, monthly session count + salary
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  teachers, schedules, groups, subjects, rooms,
  salaryPayments, teacherAttendances, teacherSalarySettings, memorizationSessions,
} from '@/db/schemas/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Basic teacher info
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id))
  if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Schedules with group, subject, room
  const teacherSchedules = await db
    .select({
      id: schedules.id,
      dayOfWeek: schedules.dayOfWeek,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      groupName: groups.name,
      groupNumber: groups.groupNumber,
      subjectName: subjects.name,
      roomName: rooms.name,
    })
    .from(schedules)
    .leftJoin(groups, eq(schedules.groupId, groups.id))
    .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
    .leftJoin(rooms, eq(schedules.roomId, rooms.id))
    .where(eq(schedules.teacherId, id))

  // Salary payments history
  const salaryHistory = await db
    .select()
    .from(salaryPayments)
    .where(eq(salaryPayments.teacherId, id))
    .orderBy(desc(salaryPayments.forMonth))

  // Monthly session count from memorization_sessions
  const monthlySessionsRaw = await db
    .select({
      month: sql<string>`to_char(${memorizationSessions.sessionDate}, 'YYYY-MM')`,
      sessionCount: sql<number>`count(*)::int`,
    })
    .from(memorizationSessions)
    .where(eq(memorizationSessions.teacherId, id))
    .groupBy(sql`to_char(${memorizationSessions.sessionDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${memorizationSessions.sessionDate}, 'YYYY-MM') desc`)

  // Salary settings (price per session)
  const salarySettings = await db
    .select()
    .from(teacherSalarySettings)
    .where(eq(teacherSalarySettings.teacherId, id))
    .orderBy(desc(teacherSalarySettings.month))

  // Default price per session (from settings table if not per-teacher)
  const defaultPriceRaw = salarySettings[0]?.pricePerSession ?? '0'

  // Build monthly salary summary
  const monthlySalary = monthlySessionsRaw.map(m => {
    // Find setting for this month or latest
    const setting = salarySettings.find(s => s.month === m.month) ?? salarySettings[0]
    const pricePerSession = parseFloat(setting?.pricePerSession ?? defaultPriceRaw ?? '0')
    const calculated = (m.sessionCount * pricePerSession).toFixed(2)
    const paid = salaryHistory.find(s => s.forMonth === m.month)
    return {
      month: m.month,
      sessionCount: m.sessionCount,
      pricePerSession,
      calculatedSalary: calculated,
      paidSalary: paid?.netSalary ?? null,
      paymentId: paid?.id ?? null,
      isPaid: !!paid,
    }
  })

  // Attendance summary
  const attStats = await db
    .select({
      status: teacherAttendances.status,
      cnt: sql<number>`count(*)::int`,
    })
    .from(teacherAttendances)
    .where(eq(teacherAttendances.teacherId, id))
    .groupBy(teacherAttendances.status)

  const attendance = {
    present: attStats.find(a => a.status === 'present')?.cnt ?? 0,
    absent: attStats.find(a => a.status === 'absent')?.cnt ?? 0,
    late: attStats.find(a => a.status === 'late')?.cnt ?? 0,
  }

  return NextResponse.json({
    teacher,
    schedules: teacherSchedules,
    salaryHistory,
    monthlySalary,
    salarySettings,
    attendance,
  })
}
