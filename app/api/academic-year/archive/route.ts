import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, attendances, memorizationSessions, settings as settingsTable,
  studentSeasonArchive,
} from '@/db/schemas/schema'
import { eq, count, and, inArray, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getSeasonStart, afterSeasonStart } from '@/lib/academic-season'
import { logActivity } from '@/lib/activity'

/** Derive the next academic year display label from the current one. */
function nextAcademicYear(current: string): string {
  const m = /^(\d{4})\/(\d{4})$/.exec(current)
  if (m) {
    const end = parseInt(m[2], 10)
    return `${end}/${end + 1}`
  }
  const y = new Date().getFullYear()
  return `${y}/${y + 1}`
}

/**
 * POST /api/academic-year/archive
 * Archive the current season's counters for every student, then start a new
 * season (resets live counters) without deleting any history. Memorization
 * sessions are never deleted and keep following each student.
 */
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Current season boundary + academic year label.
    const seasonStart = await getSeasonStart()
    const today = new Date().toISOString().split('T')[0]

    const [yearRow] = await db.select({ value: settingsTable.value })
      .from(settingsTable).where(eq(settingsTable.key, 'academic_year'))
    const prevAcademicYear = yearRow?.value?.trim() || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
    const newAcademicYear = nextAcademicYear(prevAcademicYear)

    // All students (archive anyone with a live record).
    const allStudents = await db.select({ id: students.id }).from(students)
    if (allStudents.length === 0) {
      return NextResponse.json({ success: true, archivedCount: 0, seasonStart, seasonEnd: today })
    }
    const ids = allStudents.map(s => s.id)

    // Aggregated points + values per student for the current season.
    const [attRows, memoRatings, memoCounts] = await Promise.all([
      db.select({
        studentId: attendances.studentId,
        present: sql<number>`count(*) FILTER (WHERE status = 'present')`,
        absent: sql<number>`count(*) FILTER (WHERE status = 'absent')`,
        late: sql<number>`count(*) FILTER (WHERE status = 'late')`,
        excused: sql<number>`count(*) FILTER (WHERE status = 'excused')`,
      }).from(attendances)
        .where(and(
          inArray(attendances.studentId, ids),
          afterSeasonStart(attendances.attendanceDate, seasonStart),
        ))
        .groupBy(attendances.studentId),
      db.select({
        studentId: memorizationSessions.studentId,
        rating: memorizationSessions.rating,
        cnt: count(),
      }).from(memorizationSessions)
        .where(and(
          inArray(memorizationSessions.studentId, ids),
          afterSeasonStart(memorizationSessions.sessionDate, seasonStart),
        ))
        .groupBy(memorizationSessions.studentId, memorizationSessions.rating),
      db.select({
        studentId: memorizationSessions.studentId,
        cnt: count(),
      }).from(memorizationSessions)
        .where(and(
          inArray(memorizationSessions.studentId, ids),
          afterSeasonStart(memorizationSessions.sessionDate, seasonStart),
        ))
        .groupBy(memorizationSessions.studentId),
    ])

    // Rating points from settings.
    const sRows = await db.select().from(settingsTable)
    const sm: Record<string, string> = {}
    sRows.forEach(s => { if (s.key && s.value) sm[s.key] = s.value })
    const pts: Record<string, number> = {
      excellent: parseFloat(sm['rating_excellent_points'] ?? '5'),
      very_good: parseFloat(sm['rating_very_good_points'] ?? '4'),
      good: parseFloat(sm['rating_good_points'] ?? '3'),
      acceptable: parseFloat(sm['rating_acceptable_points'] ?? '2'),
      weak: parseFloat(sm['rating_weak_points'] ?? '1'),
    }

    const attMap: Record<number, { present: number; absent: number; late: number; excused: number }> = {}
    attRows.forEach(a => {
      attMap[a.studentId] = { present: Number(a.present), absent: Number(a.absent), late: Number(a.late), excused: Number(a.excused) }
    })
    const pointMap: Record<number, number> = {}
    memoRatings.forEach(r => {
      const p = pts[r.rating ?? ''] ?? 0
      pointMap[r.studentId] = (pointMap[r.studentId] ?? 0) + p * Number(r.cnt)
    })
    const memoCountMap: Record<number, number> = {}
    memoCounts.forEach(m => { memoCountMap[m.studentId] = Number(m.cnt) })

    const values = ids.map(studentId => {
      const a = attMap[studentId] ?? { present: 0, absent: 0, late: 0, excused: 0 }
      return {
        studentId,
        academicYear: prevAcademicYear,
        seasonStart,
        seasonEnd: today,
        // The archive schema stores points as integers; round configurable values
        // so decimal settings cannot abort the archive operation.
        totalPoints: Math.round(pointMap[studentId] ?? 0),
        totalPresent: a.present,
        totalAbsent: a.absent,
        totalLate: a.late,
        totalExcused: a.excused,
        memoSessionsCount: memoCountMap[studentId] ?? 0,
      }
    }).filter(v => v.totalAbsent + v.totalPresent + v.totalLate + v.totalExcused + v.totalPoints + v.memoSessionsCount > 0)

    if (values.length > 0) {
      // Repeating the archive action for the same season replaces its snapshot
      // instead of creating duplicate historical rows.
      await db.delete(studentSeasonArchive).where(and(
        eq(studentSeasonArchive.academicYear, prevAcademicYear),
        eq(studentSeasonArchive.seasonStart, seasonStart),
      ))
      await db.insert(studentSeasonArchive).values(values)
    }

    // Start the new season (advance boundary + year label).
    await db.insert(settingsTable).values({ key: 'academic_season_start', value: today })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: today } })
    await db.insert(settingsTable).values({ key: 'academic_year', value: newAcademicYear })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: newAcademicYear } })

    await logActivity({
      userId: session.id,
      userFullName: session.fullName ?? null,
      userRole: session.role,
      action: 'update',
      entity: 'settings',
      description: `أرشفة الموسم الدراسي ${prevAcademicYear} وبدء موسم ${newAcademicYear}`,
      metadata: { archivedStudents: values.length, seasonStart, seasonEnd: today, newSeasonStart: today },
    })

    return NextResponse.json({
      success: true,
      archivedCount: values.length,
      prevAcademicYear,
      newAcademicYear,
      seasonStart,
      seasonEnd: today,
      newSeasonStart: today,
    })
  } catch (error) {
    console.error('[academic-year/archive] failed:', error)
    return NextResponse.json({ error: 'حدث خطأ في أرشفة الموسم الدراسي' }, { status: 500 })
  }
}
