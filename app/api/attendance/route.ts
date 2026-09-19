import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances, students, groupStudents, teacherGroups, settings } from '@/db/schemas/schema'
import { eq, and, sql, inArray, count } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    const groupId = searchParams.get('groupId')
    const month = searchParams.get('month') // format: YYYY-MM — for monthly report
  
    // If teacher → verify this group is assigned to them
    if (session.role === 'teacher' && session.teacherId && groupId) {
      const allowed = await db.select().from(teacherGroups)
        .where(and(
          eq(teacherGroups.teacherId, session.teacherId),
          eq(teacherGroups.groupId, parseInt(groupId))
        )).limit(1)
      if (allowed.length === 0) {
        return NextResponse.json({ error: 'ليس لديك صلاحية الوصول لهذا الفوج' }, { status: 403 })
      }
    }
  
    // Monthly report mode: return all records for the month
    if (month && groupId) {
      const gs = await db
        .select({ student: students })
        .from(groupStudents)
        .leftJoin(students, eq(groupStudents.studentId, students.id))
        .where(eq(groupStudents.groupId, parseInt(groupId)))
      const studentIds = gs.map(g => g.student?.id).filter((x): x is number => !!x)
      if (studentIds.length === 0) return NextResponse.json([])
  
      const monthRecords = await db.select({
        studentId: attendances.studentId,
        date: attendances.attendanceDate,
        status: attendances.status,
      }).from(attendances)
        .where(sql`to_char(${attendances.attendanceDate}::date, 'YYYY-MM') = ${month}`)
  
      const filtered = monthRecords.filter(r => studentIds.includes(r.studentId))
      return NextResponse.json(filtered)
    }
  
    type StudentRow = typeof students.$inferSelect
    let studentsInGroup: StudentRow[] = []
    if (groupId) {
      const gs = await db
        .select({ student: students })
        .from(groupStudents)
        .leftJoin(students, eq(groupStudents.studentId, students.id))
        .where(eq(groupStudents.groupId, parseInt(groupId)))
      studentsInGroup = gs.map(g => g.student).filter((s): s is StudentRow => s !== null)
    }
  
    const attRecords = await db.select().from(attendances)
      .where(and(
        eq(attendances.attendanceDate, date),
        ...(studentsInGroup.length > 0
          ? [sql`${attendances.studentId} = ANY(ARRAY[${sql.raw(studentsInGroup.map(s => s.id).join(','))}]::int[])`]
          : [])
      ))
  
    return NextResponse.json({ students: studentsInGroup, attendance: attRecords })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const body = await req.json()
    const { records, date, groupId } = body
  
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }
  
    // Teacher permission check
    if (session.role === 'teacher' && session.teacherId && groupId) {
      const allowed = await db.select().from(teacherGroups)
        .where(and(
          eq(teacherGroups.teacherId, session.teacherId),
          eq(teacherGroups.groupId, parseInt(groupId))
        )).limit(1)
      if (allowed.length === 0) {
        return NextResponse.json({ error: 'ليس لديك صلاحية لتسجيل حضور هذا الفوج' }, { status: 403 })
      }
    }
  
    // ── Batched upsert (was: 2-3 queries per record → N+1) ─────────────
    const recordStudentIds = records.map((r: { studentId: number }) => r.studentId)

    const existingRows = recordStudentIds.length > 0
      ? await db.select({ studentId: attendances.studentId })
          .from(attendances)
          .where(and(
            eq(attendances.attendanceDate, date),
            inArray(attendances.studentId, recordStudentIds)
          ))
      : []
    const existingSet = new Set(existingRows.map(r => r.studentId))

    const toInsert = records.filter((r: { studentId: number }) => !existingSet.has(r.studentId))
    const toUpdate = records.filter((r: { studentId: number }) => existingSet.has(r.studentId))

    if (toInsert.length > 0) {
      await db.insert(attendances).values(toInsert.map((rec: { studentId: number; status: string; notes?: string; scheduleId?: number }) => ({
        studentId: rec.studentId,
        attendanceDate: date,
        status: rec.status as 'present' | 'absent' | 'late' | 'excused',
        notes: rec.notes ?? null,
        scheduleId: rec.scheduleId ?? null,
      }))).onConflictDoNothing({
        target: [attendances.studentId, attendances.attendanceDate],
      })
    }

    await Promise.all(toUpdate.map((rec: { studentId: number; status: string; notes?: string }) =>
      db.update(attendances)
        .set({ status: rec.status as 'present' | 'absent' | 'late' | 'excused', notes: rec.notes ?? null })
        .where(and(eq(attendances.studentId, rec.studentId), eq(attendances.attendanceDate, date)))
    ))

    // ── Automatic withdrawal after N absences (configurable setting) ────
    const [thresholdRow] = await db.select({ value: settings.value })
      .from(settings).where(eq(settings.key, 'auto_withdraw_absences')).limit(1)
    const threshold = Math.max(1, parseInt(thresholdRow?.value ?? '5') || 5)

    if (recordStudentIds.length > 0) {
      // Single grouped aggregate instead of one query per student
      const absenceCounts = await db
        .select({ studentId: attendances.studentId, total: count() })
        .from(attendances)
        .where(and(
          inArray(attendances.studentId, recordStudentIds),
          eq(attendances.status, 'absent')
        ))
        .groupBy(attendances.studentId)

      const toWithdraw = absenceCounts
        .filter(r => Number(r.total) >= threshold)
        .map(r => r.studentId)

      if (toWithdraw.length > 0) {
        await db.update(students)
          .set({ status: 'withdrawn' })
          .where(and(inArray(students.id, toWithdraw), eq(students.status, 'active')))
      }
    }

    const absentCount = records.filter((r: { status: string }) => r.status === 'absent').length
    await logActivity({
      userId: session.id,
      userFullName: session.fullName ?? session.username,
      userRole: session.role,
      action: 'attendance',
      entity: 'attendance',
      description: `تم تسجيل حضور ${records.length} طالب بتاريخ ${date}${absentCount > 0 ? ` (${absentCount} غائب)` : ''}`,
      metadata: { date, total: records.length, absent: absentCount },
    })
  
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
