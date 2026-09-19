import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  date,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
// NOTE: user_role enum still exists in DB for legacy reasons but the column is now varchar(50)
export const studentStatusEnum = pgEnum('student_status', ['waiting', 'active', 'withdrawn', 'graduated'])
export const genderEnum = pgEnum('gender', ['male', 'female'])
export const roomStatusEnum = pgEnum('room_status', ['available', 'occupied', 'maintenance'])
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late', 'excused'])
export const groupStatusEnum = pgEnum('group_status', ['open', 'closed'])

// Settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
})

// Users table (admin + teachers + guardians login)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  role: varchar('role', { length: 50 }).notNull().default('admin'),
  username: varchar('username', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 150 }),
  email: varchar('email', { length: 150 }),
  profession: varchar('profession', { length: 150 }),
  educationLevel: varchar('education_level', { length: 150 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  teacherId: integer('teacher_id'), // link to teachers table if role=teacher
  createdAt: timestamp('created_at').defaultNow(),
})

// Notifications (الإشعارات)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'set null' }),
  targetType: varchar('target_type', { length: 20 }).notNull().default('all'), // all | teachers | guardians | specific
  targetIds: text('target_ids'), // JSON array of user IDs for specific targeting
  isReadBy: text('is_read_by').default('[]'), // JSON array of user IDs who read it
  notificationType: varchar('notification_type', { length: 20 }).notNull().default('manual'), // manual | auto_absence | auto_late
  createdAt: timestamp('created_at').defaultNow(),
})

// Rooms (القاعات)
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  roomNumber: varchar('room_number', { length: 20 }),
  floor: varchar('floor', { length: 50 }),
  capacity: integer('capacity'),
  status: roomStatusEnum('status').notNull().default('available'),
  equipment: text('equipment'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Guardians (أولياء الأمور)
export const guardians = pgTable('guardians', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  relation: varchar('relation', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Students (الطلاب)
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentNumber: varchar('student_number', { length: 50 }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  gender: genderEnum('gender'),
  birthDate: date('birth_date'),
  birthPlace: varchar('birth_place', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  guardianName: varchar('guardian_name', { length: 150 }),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  guardianUserId: integer('guardian_user_id').references(() => users.id, { onDelete: 'set null' }),
  guardianId: integer('guardian_id').references(() => guardians.id, { onDelete: 'set null' }),
  avatar: varchar('avatar', { length: 255 }),
  educationalLevel: varchar('educational_level', { length: 100 }),
  socialStatus: varchar('social_status', { length: 100 }),
  enrollmentDate: date('enrollment_date'),
  withdrawalDate: date('withdrawal_date'),
  status: studentStatusEnum('status').notNull().default('waiting'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Teachers (المعلمون)
export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  teacherNumber: varchar('teacher_number', { length: 50 }).unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  qualification: varchar('qualification', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  hireDate: date('hire_date'),
  baseSalary: varchar('base_salary', { length: 20 }),
  avatar: varchar('avatar', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  userId: integer('user_id'), // linked user account
  createdAt: timestamp('created_at').defaultNow(),
})

// Subjects (المواد)
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  subjectCode: varchar('subject_code', { length: 20 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  weeklySessions: integer('weekly_sessions').default(1),
  createdAt: timestamp('created_at').defaultNow(),
})

// Groups / Fossets (الأفواج)
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  groupNumber: varchar('group_number', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  groupType: varchar('group_type', { length: 50 }),
  roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  capacity: integer('capacity'),
  status: groupStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Group Students (ربط الطلاب بالأفواج)
export const groupStudents = pgTable('group_students', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  joinedDate: date('joined_date'),
})

// Schedules (الجداول الدراسية)
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  dayOfWeek: varchar('day_of_week', { length: 20 }),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

// Attendances (الحضور والغياب)
export const attendances = pgTable('attendances', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id').references(() => schedules.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  attendanceDate: date('attendance_date').notNull(),
  status: attendanceStatusEnum('status').notNull().default('present'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  // Kept in sync with drizzle/0002_safe_multi_scanner_attendance.sql so every
  // scanner is safe from duplicates (student_id + attendance_date).
  uniqueIndex('attendances_student_date_unique').on(table.studentId, table.attendanceDate),
])

// Fee payments (الرسوم المالية)
export const feePayments = pgTable('fee_payments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }),
  amount: varchar('amount', { length: 20 }),
  paymentDate: date('payment_date'),
  forMonth: varchar('for_month', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Teacher-Group assignments
export const teacherGroups = pgTable('teacher_groups', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
})

// Relations
export const studentsRelations = relations(students, ({ one, many }) => ({
  guardian: one(guardians, { fields: [students.guardianId], references: [guardians.id] }),
  groupStudents: many(groupStudents),
  attendances: many(attendances),
  feePayments: many(feePayments),
}))

export const groupsRelations = relations(groups, ({ one, many }) => ({
  room: one(rooms, { fields: [groups.roomId], references: [rooms.id] }),
  groupStudents: many(groupStudents),
  schedules: many(schedules),
  teacherGroups: many(teacherGroups),
}))

export const groupStudentsRelations = relations(groupStudents, ({ one }) => ({
  group: one(groups, { fields: [groupStudents.groupId], references: [groups.id] }),
  student: one(students, { fields: [groupStudents.studentId], references: [students.id] }),
}))

export const teachersRelations = relations(teachers, ({ many }) => ({
  schedules: many(schedules),
  teacherGroups: many(teacherGroups),
}))

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  group: one(groups, { fields: [schedules.groupId], references: [groups.id] }),
  subject: one(subjects, { fields: [schedules.subjectId], references: [subjects.id] }),
  teacher: one(teachers, { fields: [schedules.teacherId], references: [teachers.id] }),
  room: one(rooms, { fields: [schedules.roomId], references: [rooms.id] }),
  attendances: many(attendances),
}))

export const attendancesRelations = relations(attendances, ({ one }) => ({
  student: one(students, { fields: [attendances.studentId], references: [students.id] }),
  schedule: one(schedules, { fields: [attendances.scheduleId], references: [schedules.id] }),
}))

export const teacherGroupsRelations = relations(teacherGroups, ({ one }) => ({
  teacher: one(teachers, { fields: [teacherGroups.teacherId], references: [teachers.id] }),
  group: one(groups, { fields: [teacherGroups.groupId], references: [groups.id] }),
  subject: one(subjects, { fields: [teacherGroups.subjectId], references: [subjects.id] }),
}))

// Expenses (المصروفات)
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 100 }),
  amount: varchar('amount', { length: 20 }),
  expenseDate: date('expense_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Donations (التبرعات)
export const donations = pgTable('donations', {
  id: serial('id').primaryKey(),
  donorName: varchar('donor_name', { length: 150 }),
  amount: varchar('amount', { length: 20 }),
  donationDate: date('donation_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Salary payments (رواتب المعلمين)
export const salaryPayments = pgTable('salary_payments', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  forMonth: varchar('for_month', { length: 20 }),
  baseSalary: varchar('base_salary', { length: 20 }),
  bonus: varchar('bonus', { length: 20 }).default('0'),
  deduction: varchar('deduction', { length: 20 }).default('0'),
  netSalary: varchar('net_salary', { length: 20 }),
  paymentDate: date('payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Push subscriptions (اشتراكات الإشعارات)
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Activity Logs (سجل العمليات)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userFullName: varchar('user_full_name', { length: 150 }),
  userRole: varchar('user_role', { length: 20 }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 50 }),
  entityId: integer('entity_id'),
  description: text('description').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── NEW TABLES ──────────────────────────────────────────────────────────────

// Surahs (سور القرآن الكريم)
export const surahs = pgTable('surahs', {
  id: serial('id').primaryKey(),
  number: integer('number').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  ayahCount: integer('ayah_count').notNull(),
})

// Memorization Sessions (جلسات الحفظ)
export const memorizationSessions = pgTable('memorization_sessions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'set null' }),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  sessionDate: date('session_date').notNull(),
  sessionType: varchar('session_type', { length: 50 }).notNull().default('new'), // new | review | big_review | exam | other
  surahId: integer('surah_id').references(() => surahs.id, { onDelete: 'set null' }),
  fromAyah: integer('from_ayah'),
  toAyah: integer('to_ayah'),
  rating: varchar('rating', { length: 30 }), // excellent | very_good | good | acceptable | weak
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Homework (الواجبات المنزلية)
export const homework = pgTable('homework', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  isGroupHomework: boolean('is_group_homework').default(false),
  fromSurahId: integer('from_surah_id').references(() => surahs.id, { onDelete: 'set null' }),
  toSurahId: integer('to_surah_id').references(() => surahs.id, { onDelete: 'set null' }),
  notes: text('notes'),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: integer('assigned_by').references(() => teachers.id, { onDelete: 'set null' }),
})

// Teacher Attendance (حضور المعلمين)
export const teacherAttendances = pgTable('teacher_attendances', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  attendanceDate: date('attendance_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('present'), // present | absent | late
  checkInTime: varchar('check_in_time', { length: 10 }),
  method: varchar('method', { length: 20 }).default('manual'), // manual | barcode
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Messages (الرسائل الداخلية)
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Roles & Permissions (الأدوار والصلاحيات)
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }),
  permissions: text('permissions').default('[]'), // JSON array of permission keys
  createdAt: timestamp('created_at').defaultNow(),
})

// Per-session fee payment tracking
export const sessionFeeSettings = pgTable('session_fee_settings', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  pricePerSession: varchar('price_per_session', { length: 20 }).default('0'),
  month: varchar('month', { length: 7 }), // YYYY-MM
  createdAt: timestamp('created_at').defaultNow(),
})

// Teacher salary per-session setting
export const teacherSalarySettings = pgTable('teacher_salary_settings', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  pricePerSession: varchar('price_per_session', { length: 20 }).default('0'),
  month: varchar('month', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── Relations for new tables ─────────────────────────────────────────────────

export const memorizationSessionsRelations = relations(memorizationSessions, ({ one }) => ({
  student: one(students, { fields: [memorizationSessions.studentId], references: [students.id] }),
  group: one(groups, { fields: [memorizationSessions.groupId], references: [groups.id] }),
  teacher: one(teachers, { fields: [memorizationSessions.teacherId], references: [teachers.id] }),
  surah: one(surahs, { fields: [memorizationSessions.surahId], references: [surahs.id] }),
}))

export const homeworkRelations = relations(homework, ({ one }) => ({
  student: one(students, { fields: [homework.studentId], references: [students.id] }),
  group: one(groups, { fields: [homework.groupId], references: [groups.id] }),
  fromSurah: one(surahs, { fields: [homework.fromSurahId], references: [surahs.id] }),
  toSurah: one(surahs, { fields: [homework.toSurahId], references: [surahs.id] }),
}))

export const teacherAttendancesRelations = relations(teacherAttendances, ({ one }) => ({
  teacher: one(teachers, { fields: [teacherAttendances.teacherId], references: [teachers.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id] }),
}))

// ── FEATURE ADDITIONS ────────────────────────────────────────────────────────

// Notification type enum for distinguishing auto vs manual
export const notificationTypeEnum = pgEnum('notification_type', ['auto_absence', 'auto_late', 'manual'])

// Notification reads tracking (for reception counter)
export const notificationReads = pgTable('notification_reads', {
  id: serial('id').primaryKey(),
  notificationId: integer('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  deviceId: varchar('device_id', { length: 255 }),
  readAt: timestamp('read_at').defaultNow(),
})

// Registration Requests (طلبات التسجيل الإلكترونية)
export const registrationRequests = pgTable('registration_requests', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  birthDate: date('birth_date'),
  birthPlace: varchar('birth_place', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  educationalLevel: varchar('educational_level', { length: 100 }),
  guardianName: varchar('guardian_name', { length: 150 }),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  guardianRelation: varchar('guardian_relation', { length: 50 }),
  guardianEmail: varchar('guardian_email', { length: 150 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | accepted | rejected
  acceptedStudentId: integer('accepted_student_id'), // filled after acceptance
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Barcode/QR scan logs for "متابعة المسح"
export const scanLogs = pgTable('scan_logs', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }),
  scanType: varchar('scan_type', { length: 10 }).notNull().default('barcode'), // barcode | qr
  scanDate: date('scan_date').notNull(),
  scanTime: varchar('scan_time', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const scanLogsRelations = relations(scanLogs, ({ one }) => ({
  student: one(students, { fields: [scanLogs.studentId], references: [students.id] }),
}))

export const notificationReadsRelations = relations(notificationReads, ({ one }) => ({
  notification: one(notifications, { fields: [notificationReads.notificationId], references: [notifications.id] }),
  user: one(users, { fields: [notificationReads.userId], references: [users.id] }),
}))

// ─── Courses (الدورات التعليمية) ────────────────────────────────────────────

// courses: catalog of courses offered
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  educationLevel: varchar('education_level', { length: 50 }), // ابتدائي/متوسط/ثانوي/جامعي/غير ذلك
  startDate: date('start_date'),
  endDate: date('end_date'),
  capacity: integer('capacity'),
  price: integer('price').default(0), // course fee in local currency
  status: varchar('status', { length: 20 }).notNull().default('open'), // open | closed | cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// course_students: enrolled students (admin-managed)
export const courseStudents = pgTable('course_students', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  notes: text('notes'),
})

// course_registrations: public self-registration requests
export const courseRegistrations = pgTable('course_registrations', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  guardianName: varchar('guardian_name', { length: 150 }),
  guardianPhone: varchar('guardian_phone', { length: 30 }),
  educationLevel: varchar('education_level', { length: 50 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | accepted | rejected
  acceptedStudentId: integer('accepted_student_id'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const coursesRelations = relations(courses, ({ many }) => ({
  students: many(courseStudents),
  registrations: many(courseRegistrations),
}))

export const courseStudentsRelations = relations(courseStudents, ({ one }) => ({
  course: one(courses, { fields: [courseStudents.courseId], references: [courses.id] }),
  student: one(students, { fields: [courseStudents.studentId], references: [students.id] }),
}))

export const courseRegistrationsRelations = relations(courseRegistrations, ({ one }) => ({
  course: one(courses, { fields: [courseRegistrations.courseId], references: [courses.id] }),
}))

// student_season_archive: year-end snapshot of each student's season counters.
// Archived when a new academic season starts; the live counters (attendance,
// absences, points) restart from zero for the new season while memorization
// sessions stay permanent and keep following the student.
export const studentSeasonArchive = pgTable('student_season_archive', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  academicYear: varchar('academic_year', { length: 50 }),
  seasonStart: date('season_start'),
  seasonEnd: date('season_end'),
  totalPoints: integer('total_points').default(0),
  totalPresent: integer('total_present').default(0),
  totalAbsent: integer('total_absent').default(0),
  totalLate: integer('total_late').default(0),
  totalExcused: integer('total_excused').default(0),
  memoSessionsCount: integer('memo_sessions_count').default(0),
  archivedAt: timestamp('archived_at').defaultNow(),
})
