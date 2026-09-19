import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, attendances, memorizationSessions, settings as settingsTable,
  groupStudents, teacherGroups,
} from '@/db/schemas/schema'
import { eq, count, inArray, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getSeasonStart, afterSeasonStart } from '@/lib/academic-season'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isTeacher = session.role === 'teacher' && session.teacherId

  // Scope students to teacher's groups
  let scopedStudentIds: number[] | null = null
  if (isTeacher) {
    const tGroups = await db
      .select({ groupId: teacherGroups.groupId })
      .from(teacherGroups)
      .where(eq(teacherGroups.teacherId, session.teacherId!))
    const groupIds = tGroups.map(r => r.groupId)
    if (groupIds.length > 0) {
      const tStudents = await db
        .select({ studentId: groupStudents.studentId })
        .from(groupStudents)
        .where(inArray(groupStudents.groupId, groupIds))
      scopedStudentIds = tStudents.map(r => r.studentId)
    } else {
      scopedStudentIds = []
    }
  }

  const activeStudentsQuery = db
    .select({ id: students.id, firstName: students.firstName, lastName: students.lastName, studentNumber: students.studentNumber })
    .from(students)
    .where(eq(students.status, 'active'))
  
  const seasonStart = await getSeasonStart()
  const [settingsRows, activeStudents, absenceCounts, sessionRatings] = await Promise.all([
    db.select().from(settingsTable),
    scopedStudentIds !== null && scopedStudentIds.length > 0
      ? db.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, studentNumber: students.studentNumber })
          .from(students)
          .where(inArray(students.id, scopedStudentIds))
      : scopedStudentIds !== null && scopedStudentIds.length === 0
        ? []
        : activeStudentsQuery,
    db.select({ studentId: attendances.studentId, absences: count() })
      .from(attendances)
      .where(and(eq(attendances.status, 'absent'), afterSeasonStart(attendances.attendanceDate, seasonStart)))
      .groupBy(attendances.studentId),
    db.select({ studentId: memorizationSessions.studentId, rating: memorizationSessions.rating, cnt: count() })
      .from(memorizationSessions)
      .where(afterSeasonStart(memorizationSessions.sessionDate, seasonStart))
      .groupBy(memorizationSessions.studentId, memorizationSessions.rating),
  ])

  if (activeStudents.length === 0) return NextResponse.json([])

  const sm: Record<string, string> = {}
  settingsRows.forEach(s => { if (s.key && s.value) sm[s.key] = s.value })
  const pts: Record<string, number> = {
    excellent: parseFloat(sm['rating_excellent_points'] ?? '5'),
    very_good: parseFloat(sm['rating_very_good_points'] ?? '4'),
    good: parseFloat(sm['rating_good_points'] ?? '3'),
    acceptable: parseFloat(sm['rating_acceptable_points'] ?? '2'),
    weak: parseFloat(sm['rating_weak_points'] ?? '1'),
  }

  const absenceMap: Record<number, number> = {}
  absenceCounts.forEach(a => { absenceMap[a.studentId] = Number(a.absences) })
  const ratingMap: Record<number, number> = {}
  sessionRatings.forEach(r => {
    const p = pts[r.rating ?? ''] ?? 0
    ratingMap[r.studentId] = (ratingMap[r.studentId] ?? 0) + p * Number(r.cnt)
  })

  const scored = activeStudents.map(s => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    studentNumber: s.studentNumber,
    absences: absenceMap[s.id] ?? 0,
    ratingScore: ratingMap[s.id] ?? 0,
    score: (ratingMap[s.id] ?? 0) - ((absenceMap[s.id] ?? 0) * 2),
  }))
  scored.sort((a, b) => b.score - a.score || a.absences - b.absences)

  return NextResponse.json(scored.slice(0, 7))
}
