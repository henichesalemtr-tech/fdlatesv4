import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, attendances, groupStudents, groups, teachers, teacherGroups,
  memorizationSessions, homework, surahs, feePayments, notifications,
} from '@/db/schemas/schema'
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getSeasonStart, afterSeasonStart } from '@/lib/academic-season'
import { getAlgeriaNow } from '@/lib/algeria-time'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'guardian') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const myStudents = await db
    .select()
    .from(students)
    .where(eq(students.guardianUserId, session.id))

  const seasonStart = await getSeasonStart()

  const now        = new Date()
  const algeriaNow = getAlgeriaNow(now)
  const todayStr   = algeriaNow.date

  // Week boundaries (Sat–Fri for Algeria)
  const day        = now.getDay()
  const diffToSat  = (day + 1) % 7
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - diffToSat)
  const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr   = weekEnd.toISOString().split('T')[0]

  // Month boundaries
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const result = await Promise.all(myStudents.map(async (student) => {

    // ── Groups + teacher ─────────────────────────────────────────
    const studentGroups = await db
      .select({
        groupId:     groups.id,
        groupName:   groups.name,
        groupNumber: groups.groupNumber,
        teacherName: teachers.fullName,
        teacherPhone: teachers.phone,
      })
      .from(groupStudents)
      .leftJoin(groups, eq(groupStudents.groupId, groups.id))
      .leftJoin(teacherGroups, eq(teacherGroups.groupId, groups.id))
      .leftJoin(teachers, eq(teacherGroups.teacherId, teachers.id))
      .where(eq(groupStudents.studentId, student.id))

    // ── Attendance ───────────────────────────────────────────────
    const [attTotal] = await db
      .select({
        total:   count(),
        present: sql<number>`count(case when status='present' then 1 end)`,
        absent:  sql<number>`count(case when status='absent' then 1 end)`,
        late:    sql<number>`count(case when status='late' then 1 end)`,
      })
      .from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        afterSeasonStart(attendances.attendanceDate, seasonStart),
      ))

    const weekAtt = await db
      .select()
      .from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        gte(attendances.attendanceDate, weekStartStr),
        lte(attendances.attendanceDate, weekEndStr),
      ))
      .orderBy(desc(attendances.attendanceDate))

    const recentAtt = await db
      .select()
      .from(attendances)
      .where(eq(attendances.studentId, student.id))
      .orderBy(desc(attendances.attendanceDate))
      .limit(10)

    // ── Memorization sessions (last 8) ───────────────────────────
    const memSessions = await db
      .select({
        id:          memorizationSessions.id,
        sessionDate: memorizationSessions.sessionDate,
        sessionType: memorizationSessions.sessionType,
        rating:      memorizationSessions.rating,
        notes:       memorizationSessions.notes,
        fromAyah:    memorizationSessions.fromAyah,
        toAyah:      memorizationSessions.toAyah,
        surahName:   surahs.name,
      })
      .from(memorizationSessions)
      .leftJoin(surahs, eq(memorizationSessions.surahId, surahs.id))
      .where(eq(memorizationSessions.studentId, student.id))
      .orderBy(desc(memorizationSessions.sessionDate))
      .limit(8)

    // Memorization rating distribution (last 30 sessions)
    const memAll = await db
      .select({ rating: memorizationSessions.rating })
      .from(memorizationSessions)
      .where(eq(memorizationSessions.studentId, student.id))
      .orderBy(desc(memorizationSessions.sessionDate))
      .limit(30)

    const ratingDist: Record<string, number> = {}
    for (const m of memAll) {
      if (m.rating) ratingDist[m.rating] = (ratingDist[m.rating] ?? 0) + 1
    }

    // ── Current homework ─────────────────────────────────────────
    const [currentHw] = await db
      .select({
        id:           homework.id,
        notes:        homework.notes,
        isGroupHomework: homework.isGroupHomework,
        fromSurahId:  homework.fromSurahId,
        toSurahId:    homework.toSurahId,
        fromSurahName: surahs.name,
        assignedAt:   homework.assignedAt,
      })
      .from(homework)
      .leftJoin(surahs, eq(homework.fromSurahId, surahs.id))
      .where(eq(homework.studentId, student.id))
      .orderBy(desc(homework.assignedAt))
      .limit(1)

    let toSurahName: string | null = null
    if (currentHw?.toSurahId && currentHw.toSurahId !== currentHw.fromSurahId) {
      const [ts] = await db.select({ name: surahs.name }).from(surahs).where(eq(surahs.id, currentHw.toSurahId)).limit(1)
      toSurahName = ts?.name ?? null
    }

    // ── Fee payments (this year) ─────────────────────────────────
    const payments = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.studentId, student.id))
      .orderBy(desc(feePayments.paymentDate))
      .limit(6)

    const totalPaid  = payments.reduce((s, p) => s + parseFloat(p.amount ?? '0'), 0)
    const monthPaid  = payments
      .filter(p => p.paymentDate && p.paymentDate >= monthStart)
      .reduce((s, p) => s + parseFloat(p.amount ?? '0'), 0)

    return {
      student,
      groups:    studentGroups,
      attendance: {
        total:   Number(attTotal.total),
        present: Number(attTotal.present),
        absent:  Number(attTotal.absent),
        late:    Number(attTotal.late),
        rate:    attTotal.total > 0
          ? Math.round((Number(attTotal.present) / Number(attTotal.total)) * 100)
          : 0,
        thisWeek: weekAtt.map(a => ({
          date: a.attendanceDate,
          status: a.status,
          notes: a.notes,
        })),
        recent: recentAtt.map(a => ({
          date: a.attendanceDate,
          status: a.status,
          notes: a.notes,
        })),
      },
      memorization: {
        sessions:     memSessions,
        ratingDist,
        totalSessions: memAll.length,
      },
      homework: currentHw
        ? { ...currentHw, toSurahName }
        : null,
      finance: {
        totalPaid,
        monthPaid,
        recentPayments: payments,
      },
    }
  }))

  // ── Notifications for guardian ───────────────────────────────
  const notifs = await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(5)

  return NextResponse.json({ students: result, notifications: notifs })
}
