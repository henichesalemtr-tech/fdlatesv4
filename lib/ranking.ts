/**
 * lib/ranking.ts
 * Shared scoring logic used by:
 *   - app/api/dashboard/top-students/route.ts
 *   - app/api/ranking/route.ts
 *
 * Formula:
 *   ratingScore = Σ (points[rating] × count) for each memorization session
 *   absences    = count of attendances where status = 'absent'
 *   score       = ratingScore − (absences × 2)
 * Sort: descending score, tie-break by fewest absences.
 */

import { db } from '@/db'
import {
  students, attendances, memorizationSessions, settings as settingsTable,
  groupStudents,
} from '@/db/schemas/schema'
import { eq, count, inArray, and } from 'drizzle-orm'
import { getSeasonStart, afterSeasonStart } from '@/lib/academic-season'

export interface ScoredStudent {
  id: number
  name: string
  studentNumber: string | null
  absences: number
  ratingScore: number
  score: number
}

/** Read rating point settings from the DB (defaults: 5/4/3/2/1). */
export async function getRatingPoints(): Promise<Record<string, number>> {
  const settingsRows = await db.select().from(settingsTable)
  const sm: Record<string, string> = {}
  settingsRows.forEach(s => { if (s.key && s.value) sm[s.key] = s.value })
  return {
    excellent:  parseFloat(sm['rating_excellent_points']  ?? '5'),
    very_good:  parseFloat(sm['rating_very_good_points']  ?? '4'),
    good:       parseFloat(sm['rating_good_points']       ?? '3'),
    acceptable: parseFloat(sm['rating_acceptable_points'] ?? '2'),
    weak:       parseFloat(sm['rating_weak_points']       ?? '1'),
  }
}

/**
 * Score and rank students by their memorization performance and attendance.
 *
 * @param studentIds  Explicit list of student IDs to include. If null/undefined,
 *                    all active students are included (used by top-students dashboard).
 * @param limit       If set, slices the result to this many items (e.g. 7 for dashboard).
 */
export async function rankStudents(
  studentIds: number[] | null | undefined,
  limit?: number
): Promise<ScoredStudent[]> {
  const pts = await getRatingPoints()

  // Fetch students
  type StudentRow = { id: number; firstName: string; lastName: string; studentNumber: string | null }
  let activeStudents: StudentRow[]

  if (studentIds !== null && studentIds !== undefined) {
    if (studentIds.length === 0) return []
    activeStudents = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName, studentNumber: students.studentNumber })
      .from(students)
      .where(inArray(students.id, studentIds))
  } else {
    activeStudents = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName, studentNumber: students.studentNumber })
      .from(students)
      .where(eq(students.status, 'active'))
  }

  if (activeStudents.length === 0) return []

  const scopedIds = activeStudents.map(s => s.id)
  const seasonStart = await getSeasonStart()

  // Fetch absent counts and session ratings in parallel (scoped to the current season)
  const [absentRows, sessionRatings] = await Promise.all([
    db.select({ studentId: attendances.studentId, absences: count() })
      .from(attendances)
      .where(and(
        inArray(attendances.studentId, scopedIds),
        eq(attendances.status, 'absent'),
        afterSeasonStart(attendances.attendanceDate, seasonStart),
      ))
      .groupBy(attendances.studentId),
    db.select({ studentId: memorizationSessions.studentId, rating: memorizationSessions.rating, cnt: count() })
      .from(memorizationSessions)
      .where(and(
        inArray(memorizationSessions.studentId, scopedIds),
        afterSeasonStart(memorizationSessions.sessionDate, seasonStart),
      ))
      .groupBy(memorizationSessions.studentId, memorizationSessions.rating),
  ])

  // Build lookup maps
  const absenceMap: Record<number, number> = {}
  absentRows.forEach(a => { absenceMap[a.studentId] = Number(a.absences) })

  const ratingMap: Record<number, number> = {}
  sessionRatings.forEach(r => {
    const p = pts[r.rating ?? ''] ?? 0
    ratingMap[r.studentId] = (ratingMap[r.studentId] ?? 0) + p * Number(r.cnt)
  })

  const scored: ScoredStudent[] = activeStudents.map(s => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    studentNumber: s.studentNumber,
    absences: absenceMap[s.id] ?? 0,
    ratingScore: ratingMap[s.id] ?? 0,
    score: (ratingMap[s.id] ?? 0) - ((absenceMap[s.id] ?? 0) * 2),
  }))

  scored.sort((a, b) => b.score - a.score || a.absences - b.absences)

  return limit ? scored.slice(0, limit) : scored
}

/**
 * Get the student IDs for a specific group.
 */
export async function getGroupStudentIds(groupId: number): Promise<number[]> {
  const rows = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupId, groupId))
  return rows.map(r => r.studentId)
}
