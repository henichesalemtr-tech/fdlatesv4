import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances, students, notifications, settings } from '@/db/schemas/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { sendPushToUsers } from '@/lib/push'

/* ── Load a single setting value with a fallback ── */
async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1)
  return row?.value ?? fallback
}

/* ── Replace template variables ── */
function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{${k}}`, v),
    template
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { date, type = 'absent' } = body   // type: 'absent' | 'late'
  if (!date) return NextResponse.json({ error: 'date مطلوب' }, { status: 400 })

  const attendanceStatus = type === 'late' ? 'late' : 'absent'
  const notifType = type === 'late' ? 'auto_late' : 'auto_absence'

  // ── Load settings ────────────────────────────────────────────
  const [
    titleTpl, bodyTpl,
    notifEnabled, pushEnabledSetting, inappEnabled,
  ] = await Promise.all([
    getSetting(
      type === 'late' ? 'notif_late_title' : 'notif_absent_title',
      type === 'late'
        ? 'إشعار تأخر — {student_name}'
        : 'إشعار غياب — {student_name}'
    ),
    getSetting(
      type === 'late' ? 'notif_late_body' : 'notif_absent_body',
      type === 'late'
        ? 'تأخر(ت) ابنكم/ابنتكم {student_name} ({student_number}) عن الحصة بتاريخ {date}.'
        : 'تغيّب(ت) ابنكم/ابنتكم {student_name} ({student_number}) عن الحصة بتاريخ {date}. يرجى التواصل مع الإدارة.'
    ),
    getSetting(type === 'late' ? 'notif_late_enabled' : 'notif_absent_enabled', 'true'),
    getSetting('notif_push_enabled', 'true'),
    getSetting('notif_inapp_enabled', 'true'),
  ])

  // Respect enabled flags
  if (notifEnabled !== 'true') {
    return NextResponse.json({
      success: false,
      message: `إشعارات ${type === 'late' ? 'التأخر' : 'الغياب'} معطّلة من الإعدادات`,
      sent: 0,
    })
  }

  const pushActive  = pushEnabledSetting === 'true'
  const inappActive = inappEnabled === 'true'

  // ── Fetch absent/late records ────────────────────────────────
  const records = await db
    .select({ studentId: attendances.studentId })
    .from(attendances)
    .where(and(
      eq(attendances.attendanceDate, date),
      eq(attendances.status, attendanceStatus as 'absent' | 'late')
    ))

  if (records.length === 0) {
    return NextResponse.json({
      message: `لا يوجد ${type === 'late' ? 'تأخر' : 'غياب'} لهذا التاريخ`,
      sent: 0,
    })
  }

  // ── Batch-load the students (was N+1: one query per record) ──
  const studentIds = [...new Set(records.map(r => r.studentId))]
  const studentRows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      studentNumber: students.studentNumber,
      guardianName: students.guardianName,
      guardianUserId: students.guardianUserId,
    })
    .from(students)
    .where(inArray(students.id, studentIds))

  type Prepared = { guardianUserId: number; title: string; body: string }
  const prepared: Prepared[] = []

  for (const student of studentRows) {
    if (!student.guardianUserId) continue
    const vars = {
      student_name:   `${student.firstName} ${student.lastName}`,
      student_number: student.studentNumber ?? '',
      date,
      guardian_name:  student.guardianName ?? 'ولي الأمر',
    }
    prepared.push({
      guardianUserId: student.guardianUserId,
      title: applyTemplate(titleTpl, vars),
      body:  applyTemplate(bodyTpl,  vars),
    })
  }

  if (prepared.length === 0) {
    return NextResponse.json({ success: true, sent: 0, pushSent: 0, total: records.length, message: 'لا يوجد أولياء أمور مرتبطون' })
  }

  // ── 1) In-app notifications — single batched insert ──────────
  let sentCount = 0
  if (inappActive) {
    await db.insert(notifications).values(prepared.map(p => ({
      title: p.title,
      body: p.body,
      senderId: session.id,
      targetType: 'specific',
      targetIds: JSON.stringify([p.guardianUserId]),
      isReadBy: '[]',
      notificationType: notifType,   // ← tags it as system-generated (Automatic tab)
    })))
    sentCount = prepared.length
  }

  // ── 2) Web Push — non-fatal, never blocks the in-app save ────
  let pushSent = 0
  let cleaned = 0
  if (pushActive) {
    const pushResults = await Promise.all(prepared.map(p =>
      sendPushToUsers([p.guardianUserId], p.title, p.body, { guardianUrl: '/guardian-dashboard' })
    ))
    pushSent = pushResults.reduce((n, r) => n + r.sent, 0)
    cleaned  = pushResults.reduce((n, r) => n + r.cleaned, 0)
  }

  return NextResponse.json({
    success: true,
    sent: sentCount,
    pushSent,
    cleaned,
    total: records.length,
    message: `تم إرسال ${sentCount} إشعار داخلي و${pushSent} إشعار متصفح`,
  })
}
