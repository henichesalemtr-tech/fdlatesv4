import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances, students, schedules, groups, subjects, settings } from '@/db/schemas/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  // Get absent/late students for this date
  const absentRecords = await db
    .select({
      attendanceId: attendances.id,
      status: attendances.status,
      attendanceDate: attendances.attendanceDate,
      studentId: students.id,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentPhone: students.phone,
      guardianName: students.guardianName,
      scheduleId: schedules.id,
      startTime: schedules.startTime,
      groupName: groups.name,
      subjectName: subjects.name,
    })
    .from(attendances)
    .leftJoin(students, eq(attendances.studentId, students.id))
    .leftJoin(schedules, eq(attendances.scheduleId, schedules.id))
    .leftJoin(groups, eq(schedules.groupId, groups.id))
    .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
    .where(
      and(
        eq(attendances.attendanceDate, date),
        inArray(attendances.status, ['absent', 'late'])
      )
    )

  // Get settings for messages
  const allSettings = await db.select().from(settings)
  const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]))

  return NextResponse.json({
    absences: absentRecords,
    settings: {
      countryCode: settingsMap['country_code'] ?? '+213',
      msgAbsent: settingsMap['msg_absent'] ?? 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا للتوضيح.',
      msgLate: settingsMap['msg_late'] ?? 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.',
    },
  })
}
