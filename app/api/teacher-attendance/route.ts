import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teacherAttendances, teachers, schedules, settings } from '@/db/schemas/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getAlgeriaNow } from '@/lib/algeria-time'

// GET /api/teacher-attendance?date=YYYY-MM-DD&teacherId=X
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const teacherId = searchParams.get('teacherId')
    const month = searchParams.get('month') // YYYY-MM

    if (month) {
      const records = await db
        .select()
        .from(teacherAttendances)
        .where(
          and(
            teacherId ? eq(teacherAttendances.teacherId, parseInt(teacherId)) : sql`1=1`,
            sql`to_char(${teacherAttendances.attendanceDate}, 'YYYY-MM') = ${month}`
          )
        )
        .orderBy(desc(teacherAttendances.attendanceDate))
      return NextResponse.json(records)
    }

    const targetDate = date ?? new Date().toISOString().split('T')[0]
    const allTeachers = await db.select().from(teachers).where(eq(teachers.status, 'active'))

    const attendanceMap: Record<number, typeof teacherAttendances.$inferSelect> = {}
    if (date) {
      const records = await db
        .select()
        .from(teacherAttendances)
        .where(eq(teacherAttendances.attendanceDate, targetDate))
      for (const r of records) {
        attendanceMap[r.teacherId] = r
      }
    }

    return NextResponse.json(
      allTeachers.map(t => ({ ...t, attendance: attendanceMap[t.id] ?? null }))
    )
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب البيانات' }, { status: 500 })
  }
}

// POST /api/teacher-attendance
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { teacherId, date, status, checkInTime, method, notes } = body

    if (!teacherId || !date || !status) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const [existing] = await db
      .select()
      .from(teacherAttendances)
      .where(and(
        eq(teacherAttendances.teacherId, parseInt(teacherId)),
        eq(teacherAttendances.attendanceDate, date)
      ))
      .limit(1)

    if (existing) {
      await db
        .update(teacherAttendances)
        .set({ status, checkInTime: checkInTime ?? null, method: method ?? 'manual', notes: notes ?? null })
        .where(eq(teacherAttendances.id, existing.id))
      return NextResponse.json({ success: true, updated: true })
    }

    await db.insert(teacherAttendances).values({
      teacherId: parseInt(teacherId),
      attendanceDate: date,
      status,
      checkInTime: checkInTime ?? null,
      method: method ?? 'manual',
      notes: notes ?? null,
    })

    return NextResponse.json({ success: true, created: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الحضور' }, { status: 500 })
  }
}

// PUT — Auto-absent: mark teachers absent if X+ min past schedule start
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [threshold] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'late_threshold_minutes'))
      .limit(1)

    const thresholdMinutes = parseInt(threshold?.value ?? '40')
    const algeriaNow = getAlgeriaNow()
    const today = algeriaNow.date
    const todayDay = algeriaNow.dayOfWeek

    const todaySchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.dayOfWeek, todayDay))

    let markedAbsent = 0
    for (const sched of todaySchedules) {
      if (!sched.teacherId || !sched.startTime) continue

      const [startH, startM] = sched.startTime.split(':').map(Number)
      const schedStartMinutes = startH * 60 + startM
      const currentMinutes = algeriaNow.minutesSinceMidnight

      if (currentMinutes >= schedStartMinutes + thresholdMinutes) {
        const [existing] = await db
          .select()
          .from(teacherAttendances)
          .where(and(
            eq(teacherAttendances.teacherId, sched.teacherId),
            eq(teacherAttendances.attendanceDate, today)
          ))
          .limit(1)

        if (!existing) {
          await db.insert(teacherAttendances).values({
            teacherId: sched.teacherId,
            attendanceDate: today,
            status: 'absent',
            method: 'auto',
            notes: `تغيب تلقائي — تجاوز ${thresholdMinutes} دقيقة من توقيت الحصة`,
          })
          markedAbsent++
        }
      }
    }

    return NextResponse.json({ success: true, markedAbsent })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في التحضير التلقائي' }, { status: 500 })
  }
}
