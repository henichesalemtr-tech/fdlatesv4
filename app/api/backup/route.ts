import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, teachers, groups, groupStudents,
  rooms, subjects, schedules, attendances,
  feePayments, expenses, donations, salaryPayments,
  settings as settingsTable, users,
  teacherGroups, memorizationSessions, homework,
  teacherAttendances, registrationRequests, roles,
  notifications, messages, courses, courseStudents, courseRegistrations,
  studentSeasonArchive,
} from '@/db/schemas/schema'
import { getSession, hashPassword, hasPermission } from '@/lib/auth'
import { sql } from 'drizzle-orm'

/* ════════════════════════════════════════════════════════
   GET  /api/backup  → تصدير النسخة الاحتياطية الكاملة
════════════════════════════════════════════════════════ */
export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'backup.manage'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [
      allStudents, allTeachers, allGroups, allGroupStudents, allTeacherGroups,
      allRooms, allSubjects, allSchedules, allAttendances,
      allFees, allExpenses, allDonations, allSalaries,
      allSettings, allUsers,
      allMemo, allHomework, allTeacherAtt, allRegReq, allRoles,
      allNotifications, allMessages,
      allCourses, allCourseStudents, allCourseRegistrations,
      allSeasonArchive,
    ] = await Promise.all([
      db.select().from(students),
      db.select().from(teachers),
      db.select().from(groups),
      db.select().from(groupStudents),
      db.select().from(teacherGroups),
      db.select().from(rooms),
      db.select().from(subjects),
      db.select().from(schedules),
      db.select().from(attendances),
      db.select().from(feePayments),
      db.select().from(expenses),
      db.select().from(donations),
      db.select().from(salaryPayments),
      db.select().from(settingsTable),
      db.select({
        id: users.id, username: users.username, role: users.role,
        fullName: users.fullName, phone: users.phone,
        status: users.status, teacherId: users.teacherId,
        createdAt: users.createdAt,
      }).from(users),
      db.select().from(memorizationSessions),
      db.select().from(homework),
      db.select().from(teacherAttendances),
      db.select().from(registrationRequests),
      db.select().from(roles),
      db.select().from(notifications),
      db.select().from(messages),
      db.select().from(courses),
      db.select().from(courseStudents),
      db.select().from(courseRegistrations),
      db.select().from(studentSeasonArchive),
    ])

    const backup = {
      meta: { version: '4.0', created_at: new Date().toISOString(), system: 'منصة الفردوس' },
      tables: {
        students: allStudents,
        teachers: allTeachers,
        groups: allGroups,
        group_students: allGroupStudents,
        teacher_groups: allTeacherGroups,
        rooms: allRooms,
        subjects: allSubjects,
        schedules: allSchedules,
        attendances: allAttendances,
        memorization_sessions: allMemo,
        homework: allHomework,
        teacher_attendances: allTeacherAtt,
        registration_requests: allRegReq,
        fee_payments: allFees,
        expenses: allExpenses,
        donations: allDonations,
        salary_payments: allSalaries,
        roles: allRoles,
        settings: allSettings,
        users: allUsers,
        notifications: allNotifications,
        messages: allMessages,
        courses: allCourses,
        course_students: allCourseStudents,
        course_registrations: allCourseRegistrations,
        student_season_archive: allSeasonArchive,
      },
      stats: {
        students: allStudents.length,
        teachers: allTeachers.length,
        groups: allGroups.length,
        attendances: allAttendances.length,
        memorization_sessions: allMemo.length,
        teacher_attendances: allTeacherAtt.length,
        fee_payments: allFees.length,
        registration_requests: allRegReq.length,
        notifications: allNotifications.length,
        messages: allMessages.length,
        courses: allCourses.length,
        course_students: allCourseStudents.length,
        course_registrations: allCourseRegistrations.length,
        student_season_archive: allSeasonArchive.length,
      },
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `ferdous_backup_${ts}-${Date.now()}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    console.error('[Backup/GET]', err)
    return NextResponse.json({ error: 'فشل تصدير النسخة الاحتياطية' }, { status: 500 })
  }
}

/* ════════════════════════════════════════════════════════
   POST /api/backup  → استعادة النسخة الاحتياطية
════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'backup.manage'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tables?: Record<string, unknown[]>; meta?: { version?: string } }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'ملف JSON غير صالح' }, { status: 400 }) }

  const { tables } = body
  if (!tables || typeof tables !== 'object')
    return NextResponse.json({ error: 'ملف غير صالح — حقل tables مفقود' }, { status: 400 })

  const counts: Record<string, number> = {}

  try {
    // ── helper: sync sequence after bulk insert ────────────────
    const syncSeq = async (tbl: string, col = 'id') => {
      await db.execute(
        sql`SELECT setval(pg_get_serial_sequence(${tbl}, ${col}), COALESCE((SELECT MAX(id) FROM ${sql.identifier(tbl)}), 1))`
      )
    }

    /* ── STEP 1: Build student id remapping (FD0023 → id=23) ── */
    const rawStudents = (tables.students ?? []) as Record<string, unknown>[]
    const sortedStudents = [...rawStudents].sort((a, b) =>
      String(a.studentNumber ?? '').localeCompare(String(b.studentNumber ?? ''))
    )
    const oldToNew: Record<number, number> = {}
    for (const s of sortedStudents) {
      const sn = String(s.studentNumber ?? '')
      const newId = sn.startsWith('FD') ? parseInt(sn.slice(2), 10) : (s.id as number)
      if (!isNaN(newId) && newId > 0) oldToNew[s.id as number] = newId
    }

    /* ── STEP 2: Truncate all tables ──────────────────────────── */
    await db.execute(sql`
      TRUNCATE TABLE
        scan_logs, push_subscriptions, activity_logs,
        memorization_sessions, homework, teacher_attendances,
        messages, notifications, registration_requests,
        fee_payments, salary_payments, expenses, donations,
        attendances, group_students, teacher_groups, schedules,
        course_registrations, course_students, courses,
        student_season_archive,
        students, teachers, groups, rooms, subjects,
        roles, users, settings
      RESTART IDENTITY CASCADE
    `)

    /* ── STEP 3: Settings ─────────────────────────────────────── */
    if (Array.isArray(tables.settings) && tables.settings.length > 0) {
      for (const s of tables.settings as Record<string, unknown>[]) {
        if (!s.key) continue
        await db.execute(sql`
          INSERT INTO settings (key, value) VALUES (${String(s.key)}, ${s.value != null ? String(s.value) : null})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `)
      }
      counts.settings = tables.settings.length
    }

    /* ── STEP 4: Users ────────────────────────────────────────── */
    if (Array.isArray(tables.users) && tables.users.length > 0) {
      const ADMIN_HASH = await hashPassword('admin123')
      for (const u of tables.users as Record<string, unknown>[]) {
        const pw = u.role === 'admin'
          ? ADMIN_HASH
          : await hashPassword(String(u.phone ?? u.username ?? 'password123'))
        await db.execute(sql`
          INSERT INTO users (id, username, password, role, full_name, phone, status, teacher_id, created_at)
          VALUES (
            ${u.id as number}, ${String(u.username)}, ${pw}, ${String(u.role ?? 'guardian')},
            ${u.fullName != null ? String(u.fullName) : null},
            ${u.phone != null ? String(u.phone) : null},
            ${String(u.status ?? 'active')},
            ${u.teacherId != null ? Number(u.teacherId) : null},
            ${u.createdAt ? new Date(u.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO UPDATE SET
            username=EXCLUDED.username, role=EXCLUDED.role,
            full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, status=EXCLUDED.status
        `)
      }
      await syncSeq('users')
      counts.users = tables.users.length
    }

    /* ── STEP 5: Rooms ────────────────────────────────────────── */
    if (Array.isArray(tables.rooms) && tables.rooms.length > 0) {
      for (const r of tables.rooms as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO rooms (id, name, room_number, floor, capacity, status, equipment, created_at)
          VALUES (
            ${r.id as number}, ${String(r.name)},
            ${r.roomNumber != null ? String(r.roomNumber) : null},
            ${r.floor != null ? String(r.floor) : null},
            ${r.capacity != null ? Number(r.capacity) : null},
            ${String(r.status ?? 'available')},
            ${r.equipment != null ? String(r.equipment) : null},
            ${r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('rooms')
      counts.rooms = tables.rooms.length
    }

    /* ── STEP 6: Subjects ─────────────────────────────────────── */
    if (Array.isArray(tables.subjects) && tables.subjects.length > 0) {
      for (const s of tables.subjects as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO subjects (id, subject_code, name, description, weekly_sessions, created_at)
          VALUES (
            ${s.id as number},
            ${s.subjectCode != null ? String(s.subjectCode) : null},
            ${String(s.name)},
            ${s.description != null ? String(s.description) : null},
            ${s.weeklySessions != null ? Number(s.weeklySessions) : 1},
            ${s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('subjects')
      counts.subjects = tables.subjects.length
    }

    /* ── STEP 7: Teachers ─────────────────────────────────────── */
    if (Array.isArray(tables.teachers) && tables.teachers.length > 0) {
      for (const t of tables.teachers as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO teachers (id, teacher_number, full_name, qualification, phone, email,
            hire_date, base_salary, avatar, status, user_id, created_at)
          VALUES (
            ${t.id as number},
            ${t.teacherNumber != null ? String(t.teacherNumber) : null},
            ${String(t.fullName)},
            ${t.qualification != null ? String(t.qualification) : null},
            ${t.phone != null ? String(t.phone) : null},
            ${t.email != null ? String(t.email) : null},
            ${t.hireDate != null ? String(t.hireDate) : null},
            ${t.baseSalary != null ? String(t.baseSalary) : null},
            ${t.avatar != null ? String(t.avatar) : null},
            ${String(t.status ?? 'active')},
            ${t.userId != null ? Number(t.userId) : null},
            ${t.createdAt ? new Date(t.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('teachers')
      counts.teachers = tables.teachers.length
    }

    /* ── STEP 8: Groups ───────────────────────────────────────── */
    if (Array.isArray(tables.groups) && tables.groups.length > 0) {
      for (const g of tables.groups as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO groups (id, group_number, name, group_type, room_id, capacity, status, created_at)
          VALUES (
            ${g.id as number},
            ${g.groupNumber != null ? String(g.groupNumber) : null},
            ${String(g.name)},
            ${g.groupType != null ? String(g.groupType) : null},
            ${g.roomId != null ? Number(g.roomId) : null},
            ${g.capacity != null ? Number(g.capacity) : null},
            ${String(g.status ?? 'open')},
            ${g.createdAt ? new Date(g.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('groups')
      counts.groups = tables.groups.length
    }

    /* ── STEP 9: Students (with FD id remapping) ──────────────── */
    if (sortedStudents.length > 0) {
      for (const s of sortedStudents) {
        const newId = oldToNew[s.id as number] ?? (s.id as number)
        await db.execute(sql`
          INSERT INTO students (
            id, student_number, first_name, last_name, gender, birth_date, birth_place,
            address, phone, guardian_name, guardian_phone, guardian_user_id,
            avatar, educational_level, social_status,
            enrollment_date, withdrawal_date, status, notes, created_at
          ) VALUES (
            ${newId},
            ${s.studentNumber != null ? String(s.studentNumber) : null},
            ${String(s.firstName ?? '')},
            ${String(s.lastName ?? '')},
            ${s.gender != null ? String(s.gender) : null},
            ${s.birthDate != null ? String(s.birthDate) : null},
            ${s.birthPlace != null ? String(s.birthPlace) : null},
            ${s.address != null ? String(s.address) : null},
            ${s.phone != null ? String(s.phone) : null},
            ${s.guardianName != null ? String(s.guardianName) : null},
            ${s.guardianPhone != null ? String(s.guardianPhone) : null},
            ${s.guardianUserId != null ? Number(s.guardianUserId) : null},
            ${s.avatar != null ? String(s.avatar) : null},
            ${s.educationalLevel != null ? String(s.educationalLevel) : null},
            ${s.socialStatus != null ? String(s.socialStatus) : null},
            ${s.enrollmentDate != null ? String(s.enrollmentDate) : null},
            ${s.withdrawalDate != null ? String(s.withdrawalDate) : null},
            ${String(s.status ?? 'active')},
            ${s.notes != null ? String(s.notes) : null},
            ${s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('students')
      counts.students = sortedStudents.length
    }

    /* ── STEP 10: Group Students (remap studentId) ────────────── */
    if (Array.isArray(tables.group_students) && tables.group_students.length > 0) {
      let inserted = 0
      for (const gs of tables.group_students as Record<string, unknown>[]) {
        const newStudId = oldToNew[gs.studentId as number] ?? (gs.studentId as number)
        if (!newStudId) continue
        await db.execute(sql`
          INSERT INTO group_students (id, group_id, student_id, joined_date)
          VALUES (${gs.id as number}, ${gs.groupId as number}, ${newStudId}, ${gs.joinedDate != null ? String(gs.joinedDate) : null})
          ON CONFLICT (id) DO NOTHING
        `)
        inserted++
      }
      await syncSeq('group_students')
      counts.group_students = inserted
    }

    /* ── STEP 11: Teacher Groups ──────────────────────────────── */
    if (Array.isArray(tables.teacher_groups) && tables.teacher_groups.length > 0) {
      for (const tg of tables.teacher_groups as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO teacher_groups (id, teacher_id, group_id, subject_id)
          VALUES (${tg.id as number}, ${tg.teacherId as number}, ${tg.groupId as number}, ${tg.subjectId != null ? Number(tg.subjectId) : null})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('teacher_groups')
      counts.teacher_groups = tables.teacher_groups.length
    }

    /* ── STEP 12: Schedules ───────────────────────────────────── */
    if (Array.isArray(tables.schedules) && tables.schedules.length > 0) {
      for (const s of tables.schedules as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO schedules (id, day_of_week, start_time, end_time, group_id, subject_id, teacher_id, room_id, created_at)
          VALUES (
            ${s.id as number},
            ${s.dayOfWeek != null ? String(s.dayOfWeek) : null},
            ${s.startTime != null ? String(s.startTime) : null},
            ${s.endTime != null ? String(s.endTime) : null},
            ${s.groupId != null ? Number(s.groupId) : null},
            ${s.subjectId != null ? Number(s.subjectId) : null},
            ${s.teacherId != null ? Number(s.teacherId) : null},
            ${s.roomId != null ? Number(s.roomId) : null},
            ${s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('schedules')
      counts.schedules = tables.schedules.length
    }

    /* ── STEP 13: Attendances (remap studentId) ───────────────── */
    if (Array.isArray(tables.attendances) && tables.attendances.length > 0) {
      let inserted = 0
      for (const a of tables.attendances as Record<string, unknown>[]) {
        const newStudId = oldToNew[a.studentId as number] ?? (a.studentId as number)
        if (!newStudId) continue
        await db.execute(sql`
          INSERT INTO attendances (id, schedule_id, student_id, attendance_date, status, notes, created_at)
          VALUES (
            ${a.id as number},
            ${a.scheduleId != null ? Number(a.scheduleId) : null},
            ${newStudId},
            ${String(a.attendanceDate)},
            ${String(a.status ?? 'present')},
            ${a.notes != null ? String(a.notes) : null},
            ${a.createdAt ? new Date(a.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
        inserted++
      }
      await syncSeq('attendances')
      counts.attendances = inserted
    }

    /* ── STEP 14: Memorization Sessions (remap studentId) ─────── */
    if (Array.isArray(tables.memorization_sessions) && tables.memorization_sessions.length > 0) {
      let inserted = 0
      for (const m of tables.memorization_sessions as Record<string, unknown>[]) {
        const newStudId = oldToNew[m.studentId as number] ?? (m.studentId as number)
        if (!newStudId) continue
        await db.execute(sql`
          INSERT INTO memorization_sessions
            (id, student_id, group_id, teacher_id, session_date, session_type,
             surah_id, from_ayah, to_ayah, rating, notes, created_at)
          VALUES (
            ${m.id as number}, ${newStudId},
            ${m.groupId != null ? Number(m.groupId) : null},
            ${m.teacherId != null ? Number(m.teacherId) : null},
            ${String(m.sessionDate)},
            ${String(m.sessionType ?? 'new')},
            ${m.surahId != null ? Number(m.surahId) : null},
            ${m.fromAyah != null ? Number(m.fromAyah) : null},
            ${m.toAyah != null ? Number(m.toAyah) : null},
            ${m.rating != null ? String(m.rating) : null},
            ${m.notes != null ? String(m.notes) : null},
            ${m.createdAt ? new Date(m.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
        inserted++
      }
      await syncSeq('memorization_sessions')
      counts.memorization_sessions = inserted
    }

    /* ── STEP 15: Homework (remap studentId) ──────────────────── */
    if (Array.isArray(tables.homework) && tables.homework.length > 0) {
      let inserted = 0
      for (const h of tables.homework as Record<string, unknown>[]) {
        const newStudId = h.studentId != null
          ? (oldToNew[h.studentId as number] ?? (h.studentId as number))
          : null
        await db.execute(sql`
          INSERT INTO homework
            (id, student_id, group_id, is_group_homework,
             from_surah_id, to_surah_id, notes, assigned_at, assigned_by)
          VALUES (
            ${h.id as number}, ${newStudId},
            ${h.groupId != null ? Number(h.groupId) : null},
            ${Boolean(h.isGroupHomework ?? false)},
            ${h.fromSurahId != null ? Number(h.fromSurahId) : null},
            ${h.toSurahId != null ? Number(h.toSurahId) : null},
            ${h.notes != null ? String(h.notes) : null},
            ${h.assignedAt ? new Date(h.assignedAt as string).toISOString() : new Date().toISOString()},
            ${h.assignedBy != null ? Number(h.assignedBy) : null}
          )
          ON CONFLICT (id) DO NOTHING
        `)
        inserted++
      }
      await syncSeq('homework')
      counts.homework = inserted
    }

    /* ── STEP 16: Teacher Attendances ─────────────────────────── */
    if (Array.isArray(tables.teacher_attendances) && tables.teacher_attendances.length > 0) {
      for (const ta of tables.teacher_attendances as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO teacher_attendances
            (id, teacher_id, attendance_date, status, check_in_time, method, notes, created_at)
          VALUES (
            ${ta.id as number}, ${ta.teacherId as number},
            ${String(ta.attendanceDate)},
            ${String(ta.status ?? 'present')},
            ${ta.checkInTime != null ? String(ta.checkInTime) : null},
            ${String(ta.method ?? 'manual')},
            ${ta.notes != null ? String(ta.notes) : null},
            ${ta.createdAt ? new Date(ta.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('teacher_attendances')
      counts.teacher_attendances = tables.teacher_attendances.length
    }

    /* ── STEP 17: Registration Requests ───────────────────────── */
    if (Array.isArray(tables.registration_requests) && tables.registration_requests.length > 0) {
      for (const rr of tables.registration_requests as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO registration_requests
            (id, first_name, last_name, gender, birth_date, birth_place, address, phone,
             educational_level, guardian_name, guardian_phone,
             guardian_relation, guardian_email,
             notes, status, accepted_student_id, created_at, updated_at)
          VALUES (
            ${rr.id as number},
            ${String(rr.firstName ?? '')}, ${String(rr.lastName ?? '')},
            ${rr.gender != null ? String(rr.gender) : null},
            ${rr.birthDate != null ? String(rr.birthDate) : null},
            ${rr.birthPlace != null ? String(rr.birthPlace) : null},
            ${rr.address != null ? String(rr.address) : null},
            ${rr.phone != null ? String(rr.phone) : null},
            ${rr.educationalLevel != null ? String(rr.educationalLevel) : null},
            ${rr.guardianName != null ? String(rr.guardianName) : null},
            ${rr.guardianPhone != null ? String(rr.guardianPhone) : null},
            ${rr.guardianRelation != null ? String(rr.guardianRelation) : null},
            ${rr.guardianEmail != null ? String(rr.guardianEmail) : null},
            ${rr.notes != null ? String(rr.notes) : null},
            ${String(rr.status ?? 'pending')},
            ${rr.acceptedStudentId != null ? Number(rr.acceptedStudentId) : null},
            ${rr.createdAt ? new Date(rr.createdAt as string).toISOString() : new Date().toISOString()},
            ${rr.updatedAt ? new Date(rr.updatedAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('registration_requests')
      counts.registration_requests = tables.registration_requests.length
    }

    /* ── STEP 18: Financial tables ────────────────────────────── */
    if (Array.isArray(tables.fee_payments) && tables.fee_payments.length > 0) {
      for (const f of tables.fee_payments as Record<string, unknown>[]) {
        const newStudId = f.studentId != null
          ? (oldToNew[f.studentId as number] ?? (f.studentId as number))
          : null
        await db.execute(sql`
          INSERT INTO fee_payments (id, student_id, amount, payment_date, for_month, notes, created_at)
          VALUES (
            ${f.id as number}, ${newStudId},
            ${f.amount != null ? String(f.amount) : null},
            ${f.paymentDate != null ? String(f.paymentDate) : null},
            ${f.forMonth != null ? String(f.forMonth) : null},
            ${f.notes != null ? String(f.notes) : null},
            ${f.createdAt ? new Date(f.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('fee_payments')
      counts.fee_payments = tables.fee_payments.length
    }

    if (Array.isArray(tables.expenses) && tables.expenses.length > 0) {
      for (const e of tables.expenses as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO expenses (id, category, amount, expense_date, notes, created_at)
          VALUES (
            ${e.id as number},
            ${e.category != null ? String(e.category) : null},
            ${e.amount != null ? String(e.amount) : null},
            ${e.expenseDate != null ? String(e.expenseDate) : null},
            ${e.notes != null ? String(e.notes) : null},
            ${e.createdAt ? new Date(e.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('expenses')
      counts.expenses = tables.expenses.length
    }

    if (Array.isArray(tables.donations) && tables.donations.length > 0) {
      for (const d of tables.donations as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO donations (id, donor_name, amount, donation_date, notes, created_at)
          VALUES (
            ${d.id as number},
            ${d.donorName != null ? String(d.donorName) : null},
            ${d.amount != null ? String(d.amount) : null},
            ${d.donationDate != null ? String(d.donationDate) : null},
            ${d.notes != null ? String(d.notes) : null},
            ${d.createdAt ? new Date(d.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('donations')
      counts.donations = tables.donations.length
    }

    if (Array.isArray(tables.salary_payments) && tables.salary_payments.length > 0) {
      for (const s of tables.salary_payments as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO salary_payments
            (id, teacher_id, for_month, base_salary, bonus, deduction, net_salary, payment_date, created_at)
          VALUES (
            ${s.id as number},
            ${s.teacherId != null ? Number(s.teacherId) : null},
            ${s.forMonth != null ? String(s.forMonth) : null},
            ${s.baseSalary != null ? String(s.baseSalary) : null},
            ${s.bonus != null ? String(s.bonus) : '0'},
            ${s.deduction != null ? String(s.deduction) : '0'},
            ${s.netSalary != null ? String(s.netSalary) : null},
            ${s.paymentDate != null ? String(s.paymentDate) : null},
            ${s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('salary_payments')
      counts.salary_payments = tables.salary_payments.length
    }

    /* ── STEP 19: Roles ───────────────────────────────────────── */
    if (Array.isArray(tables.roles) && tables.roles.length > 0) {
      for (const r of tables.roles as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO roles (id, name, label, permissions, created_at)
          VALUES (
            ${r.id as number}, ${String(r.name)},
            ${r.label != null ? String(r.label) : (r.displayName != null ? String(r.displayName) : null)},
            ${typeof r.permissions === 'string' ? r.permissions : JSON.stringify(r.permissions ?? [])},
            ${r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('roles')
      counts.roles = tables.roles.length
    }

    /* ── STEP 20: Notifications ───────────────────────────────── */
    if (Array.isArray(tables.notifications) && tables.notifications.length > 0) {
      for (const n of tables.notifications as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO notifications
            (id, title, body, sender_id, target_type, target_ids, is_read_by, notification_type, created_at)
          VALUES (
            ${n.id as number},
            ${n.title != null ? String(n.title) : ''},
            ${n.body != null ? String(n.body) : ''},
            ${n.senderId != null ? Number(n.senderId) : null},
            ${n.targetType != null ? String(n.targetType) : 'all'},
            ${n.targetIds != null ? String(n.targetIds) : null},
            ${n.isReadBy != null ? String(n.isReadBy) : '[]'},
            ${n.notificationType != null ? String(n.notificationType) : 'manual'},
            ${n.createdAt ? new Date(n.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('notifications')
      counts.notifications = tables.notifications.length
    }

    /* ── STEP 21: Messages ────────────────────────────────────── */
    if (Array.isArray(tables.messages) && tables.messages.length > 0) {
      for (const m of tables.messages as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO messages
            (id, sender_id, receiver_id, content, is_read, read_at, created_at)
          VALUES (
            ${m.id as number},
            ${m.senderId as number},
            ${m.receiverId as number},
            ${String(m.content ?? '')},
            ${Boolean(m.isRead ?? false)},
            ${m.readAt ? new Date(m.readAt as string).toISOString() : null},
            ${m.createdAt ? new Date(m.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('messages')
      counts.messages = tables.messages.length
    }

    /* ── STEP 22: Courses ─────────────────────────────────────── */
    if (Array.isArray(tables.courses) && tables.courses.length > 0) {
      for (const c of tables.courses as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO courses
            (id, name, description, education_level, start_date, end_date, capacity, price, status, notes, created_at, updated_at)
          VALUES (
            ${c.id as number},
            ${String(c.name)},
            ${c.description != null ? String(c.description) : null},
            ${c.educationLevel != null ? String(c.educationLevel) : null},
            ${c.startDate != null ? String(c.startDate) : null},
            ${c.endDate != null ? String(c.endDate) : null},
            ${c.capacity != null ? Number(c.capacity) : null},
            ${c.price != null ? Number(c.price) : 0},
            ${String(c.status ?? 'open')},
            ${c.notes != null ? String(c.notes) : null},
            ${c.createdAt ? new Date(c.createdAt as string).toISOString() : new Date().toISOString()},
            ${c.updatedAt ? new Date(c.updatedAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('courses')
      counts.courses = tables.courses.length
    }

    /* ── STEP 23: Course Students ─────────────────────────────── */
    if (Array.isArray(tables.course_students) && tables.course_students.length > 0) {
      for (const cs of tables.course_students as Record<string, unknown>[]) {
        const newStudId = oldToNew[cs.studentId as number] ?? (cs.studentId as number)
        await db.execute(sql`
          INSERT INTO course_students (id, course_id, student_id, enrolled_at, notes)
          VALUES (
            ${cs.id as number},
            ${cs.courseId as number},
            ${newStudId},
            ${cs.enrolledAt ? new Date(cs.enrolledAt as string).toISOString() : new Date().toISOString()},
            ${cs.notes != null ? String(cs.notes) : null}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('course_students')
      counts.course_students = tables.course_students.length
    }

    /* ── STEP 24: Course Registrations ───────────────────────── */
    if (Array.isArray(tables.course_registrations) && tables.course_registrations.length > 0) {
      for (const cr of tables.course_registrations as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO course_registrations
            (id, course_id, first_name, last_name, phone, guardian_name, guardian_phone,
             education_level, notes, status, accepted_student_id, created_at)
          VALUES (
            ${cr.id as number},
            ${cr.courseId as number},
            ${String(cr.firstName ?? '')},
            ${String(cr.lastName ?? '')},
            ${cr.phone != null ? String(cr.phone) : null},
            ${cr.guardianName != null ? String(cr.guardianName) : null},
            ${cr.guardianPhone != null ? String(cr.guardianPhone) : null},
            ${cr.educationLevel != null ? String(cr.educationLevel) : null},
            ${cr.notes != null ? String(cr.notes) : null},
            ${String(cr.status ?? 'pending')},
            ${cr.acceptedStudentId != null ? Number(cr.acceptedStudentId) : null},
            ${cr.createdAt ? new Date(cr.createdAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await syncSeq('course_registrations')
      counts.course_registrations = tables.course_registrations.length
    }

    /* ── STEP 25: Season Archives (remap studentId) ───────────── */
    if (Array.isArray(tables.student_season_archive) && tables.student_season_archive.length > 0) {
      let inserted = 0
      for (const a of tables.student_season_archive as Record<string, unknown>[]) {
        const newStudId = oldToNew[a.studentId as number] ?? (a.studentId as number)
        if (!newStudId) continue
        await db.execute(sql`
          INSERT INTO student_season_archive
            (id, student_id, academic_year, season_start, season_end,
             total_points, total_present, total_absent, total_late, total_excused,
             memo_sessions_count, archived_at)
          VALUES (
            ${a.id as number}, ${newStudId},
            ${a.academicYear != null ? String(a.academicYear) : null},
            ${a.seasonStart != null ? String(a.seasonStart) : null},
            ${a.seasonEnd != null ? String(a.seasonEnd) : null},
            ${a.totalPoints != null ? Number(a.totalPoints) : 0},
            ${a.totalPresent != null ? Number(a.totalPresent) : 0},
            ${a.totalAbsent != null ? Number(a.totalAbsent) : 0},
            ${a.totalLate != null ? Number(a.totalLate) : 0},
            ${a.totalExcused != null ? Number(a.totalExcused) : 0},
            ${a.memoSessionsCount != null ? Number(a.memoSessionsCount) : 0},
            ${a.archivedAt ? new Date(a.archivedAt as string).toISOString() : new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
        inserted++
      }
      await syncSeq('student_season_archive')
      counts.student_season_archive = inserted
    }

    return NextResponse.json({
      success: true,
      message: 'تمت استعادة النسخة الاحتياطية بنجاح',
      counts,
    })
  } catch (err: unknown) {
    console.error('[Backup/POST]', err)
    const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
    return NextResponse.json({ error: `فشلت الاستعادة: ${msg}` }, { status: 500 })
  }
}
