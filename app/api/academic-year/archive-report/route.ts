import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  studentSeasonArchive, students, groups, groupStudents,
} from '@/db/schemas/schema'
import { desc, and, or, ilike, sql, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

/**
 * GET /api/academic-year/archive-report
 * Admin-only. Returns archived season counters for each student, joined with
 * student + group info. Optional ?query= filters by name / student number.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('query') ?? '').trim()

    const base = db
      .select({
        id: studentSeasonArchive.id,
        academicYear: studentSeasonArchive.academicYear,
        seasonStart: studentSeasonArchive.seasonStart,
        seasonEnd: studentSeasonArchive.seasonEnd,
        totalPoints: studentSeasonArchive.totalPoints,
        totalPresent: studentSeasonArchive.totalPresent,
        totalAbsent: studentSeasonArchive.totalAbsent,
        totalLate: studentSeasonArchive.totalLate,
        totalExcused: studentSeasonArchive.totalExcused,
        memoSessionsCount: studentSeasonArchive.memoSessionsCount,
        archivedAt: studentSeasonArchive.archivedAt,
        studentId: students.id,
        studentNumber: students.studentNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        studentStatus: students.status,
        groupName: groups.name,
      })
      .from(studentSeasonArchive)
      .innerJoin(students, eq(studentSeasonArchive.studentId, students.id))
      .leftJoin(groupStudents, eq(groupStudents.studentId, students.id))
      .leftJoin(groups, eq(groups.id, groupStudents.groupId))
      .orderBy(desc(studentSeasonArchive.academicYear), desc(studentSeasonArchive.seasonStart), students.firstName)

    const rows = query
      ? await base.where(or(
          ilike(students.firstName, `%${query}%`),
          ilike(students.lastName, `%${query}%`),
          ilike(students.studentNumber, `%${query}%`),
          ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, `%${query}%`),
        ))
      : await base

    return NextResponse.json({ rows })
  } catch (err) {
    console.error('[ArchiveReport/GET]', err)
    return NextResponse.json({ error: 'حدث خطأ في استرجاع سجلّ المواسم المؤرشفة' }, { status: 500 })
  }
}
