/**
 * seed-demo.mjs — بيانات تجريبية شاملة لمنصة الفردوس
 * يستخدم postgres.js مباشرة (بدون Drizzle) لتجنب مشاكل TypeScript
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf8')
const DATABASE_URL = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not found'); process.exit(1) }

const sql = postgres(DATABASE_URL, { max: 5 })

// ─── helpers ─────────────────────────────────────────────────────────────────
async function hash(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
const monthStr = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const tsAgo = (hours) => new Date(Date.now() - hours * 3600000)

// ─── 0. CLEAN ────────────────────────────────────────────────────────────────
console.log('🧹 تنظيف البيانات السابقة...')
await sql`TRUNCATE TABLE
  scan_logs, notification_reads, registration_requests,
  activity_logs, homework, memorization_sessions,
  teacher_attendances, teacher_salary_settings, session_fee_settings,
  salary_payments, expenses, donations, fee_payments,
  attendances, schedules, teacher_groups, group_students,
  groups, subjects, rooms,
  messages, notifications,
  students, guardians,
  teachers,
  push_subscriptions,
  roles,
  users
  RESTART IDENTITY CASCADE`

// ─── 1. SETTINGS ─────────────────────────────────────────────────────────────
console.log('⚙️  الإعدادات...')
const settingsRows = [
  ['school_name',              'مؤسسة الفردوس للتعليم القرآني – فرع الديبيلة'],
  ['academic_year',            '2025/2026'],
  ['academic_season_start',    '2025-09-01'],
  ['contact_email',            'info@firdaws-quran.dz'],
  ['contact_phone',            '0555123456'],
  ['country_code',             '+213'],
  ['default_student_fee',      '1500'],
  ['default_teacher_salary',   '35000'],
  ['default_admin_salary',     '50000'],
  ['msg_absent',               'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا.'],
  ['msg_late',                 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.'],
  ['primary_color',            '#1a5c35'],
  ['auto_attendance',          'true'],
  ['teacher_late_threshold',   '40'],
  ['rating_excellent_points',  '5'],
  ['rating_very_good_points',  '4'],
  ['rating_good_points',       '3'],
  ['rating_acceptable_points', '2'],
  ['rating_weak_points',       '1'],
  ['holiday_mode',             'false'],
  ['online_registration',      'true'],
]
for (const [key, value] of settingsRows) {
  await sql`INSERT INTO settings (key,value) VALUES (${key},${value})
            ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
}

// ─── 2. ROLES ─────────────────────────────────────────────────────────────────
console.log('🛡️  الأدوار...')
await sql`INSERT INTO roles (name,label,permissions) VALUES
  ('admin',    'مدير النظام', '["all"]'),
  ('teacher',  'معلم',        '["attendance","memorization","notifications","messages"]'),
  ('guardian', 'ولي أمر',     '["view_child","messages"]')
  ON CONFLICT (name) DO NOTHING`

// ─── 3. ROOMS ─────────────────────────────────────────────────────────────────
console.log('🏫 القاعات...')
const rooms = await sql`
  INSERT INTO rooms (name, room_number, floor, capacity, status, equipment) VALUES
  ('قاعة النور',    'A01', 'الطابق الأول',   25, 'available', 'سبورة، شاشة عرض'),
  ('قاعة الهدى',    'A02', 'الطابق الأول',   20, 'occupied',  'سبورة، مكيف'),
  ('قاعة الفرقان',  'B01', 'الطابق الثاني',  30, 'available', 'سبورة ذكية، مكيف'),
  ('قاعة التجويد',  'B02', 'الطابق الثاني',  15, 'available', 'سبورة، مرايا صوتية'),
  ('قاعة الحفاظ',   'C01', 'الطابق الثالث',  20, 'occupied',  'سبورة، طاولات مستديرة')
  RETURNING id`

// ─── 4. SUBJECTS ──────────────────────────────────────────────────────────────
console.log('📚 المواد...')
const subjects = await sql`
  INSERT INTO subjects (subject_code, name, description, weekly_sessions) VALUES
  ('QME','حفظ القرآن الكريم','حفظ الآيات ومراجعتها',5),
  ('TWJ','التجويد','أحكام تجويد القرآن الكريم',3),
  ('TFS','التفسير','تفسير الآيات القرآنية',2),
  ('FQH','الفقه الإسلامي','المسائل الفقهية الأساسية',2),
  ('ARL','اللغة العربية','قواعد النحو والصرف والإملاء',3)
  RETURNING id`

// ─── 5. TEACHERS ──────────────────────────────────────────────────────────────
console.log('👨‍🏫 المعلمون...')
const teachers = await sql`
  INSERT INTO teachers (teacher_number, full_name, qualification, phone, email, hire_date, base_salary, status) VALUES
  ('T001','الشيخ عبد الرحمن بن محمد', 'حافظ للقرآن الكريم – ليسانس في الشريعة','0551234001','abdelrahman@firdaws.dz','2020-09-01','38000','active'),
  ('T002','الأستاذ كريم بوعزيزي',      'دبلوم تعليم – شهادة في التجويد',          '0551234002','karim@firdaws.dz',      '2021-01-15','32000','active'),
  ('T003','الأستاذة فاطمة الزهراء',    'ليسانس أدب عربي – شهادة حفظ',             '0551234003','fatima@firdaws.dz',     '2021-09-01','30000','active'),
  ('T004','الشيخ سامي الجزائري',       'ماجستير في علوم القرآن',                   '0551234004','sami@firdaws.dz',       '2022-02-01','42000','active'),
  ('T005','الأستاذ يوسف بن عمر',       'بكالوريا + شهادة تجويد',                   '0551234005','youssef@firdaws.dz',    '2023-01-01','28000','active')
  RETURNING id, full_name, base_salary`

// ─── 6. USERS ─────────────────────────────────────────────────────────────────
console.log('👤 المستخدمون...')
const adminPw = await hash('admin123')
const [adminUser] = await sql`
  INSERT INTO users (role, username, password, full_name, email, phone, status) VALUES
  ('admin','admin',${adminPw},'مدير النظام','admin@firdaws.dz','0555000000','active')
  RETURNING id, full_name`

// teacher users
const teacherUserDefs = [
  { username: 'sheikh.abdelrahman', name: teachers[0].full_name, tid: teachers[0].id },
  { username: 'karim.bouazizi',     name: teachers[1].full_name, tid: teachers[1].id },
  { username: 'fatima.zahra',       name: teachers[2].full_name, tid: teachers[2].id },
  { username: 'sheikh.sami',        name: teachers[3].full_name, tid: teachers[3].id },
  { username: 'youssef.omar',       name: teachers[4].full_name, tid: teachers[4].id },
]
const teacherPw = await hash('teacher123')
const teacherUsers = []
for (const { username, name, tid } of teacherUserDefs) {
  const [u] = await sql`
    INSERT INTO users (role, username, password, full_name, teacher_id, status)
    VALUES ('teacher', ${username}, ${teacherPw}, ${name}, ${tid}, 'active')
    RETURNING id, full_name`
  teacherUsers.push(u)
  await sql`UPDATE teachers SET user_id=${u.id} WHERE id=${tid}`
}

// ─── 7. GUARDIANS ─────────────────────────────────────────────────────────────
console.log('👨‍👩‍👧 أولياء الأمور...')
const guardians = await sql`
  INSERT INTO guardians (full_name, relation, phone, address) VALUES
  ('محمد بن علي الأمين',    'أب','0661001001','حي السلام، الديبيلة'),
  ('إبراهيم بن صالح قادري', 'أب','0661001002','شارع الاستقلال، الديبيلة'),
  ('عبد الله بن موسى',      'أب','0661001003','حي الورود، الديبيلة'),
  ('أحمد بن إسماعيل حمود',  'أب','0661001004','حي النصر، الديبيلة'),
  ('يحيى بن كمال دراجي',    'أب','0661001005','الطريق الوطني، الديبيلة'),
  ('عمر بن حسين بلعيد',     'أب','0661001006','حي الفتح، الديبيلة'),
  ('سليم بن جلال عيسى',     'أب','0661001007','حي العزة، الديبيلة'),
  ('الطاهر بن عيسى رزاق',   'أب','0661001008','الحي القديم، الديبيلة')
  RETURNING id`

const guardianPw = await hash('guardian123')
const guardianUsers = []
for (let i = 0; i < 3; i++) {
  const [u] = await sql`
    INSERT INTO users (role, username, password, full_name, phone, status)
    VALUES ('guardian', ${'guardian' + (i+1)}, ${guardianPw}, ${`ولي أمر ${i+1}`}, ${'066100100'+(i+1)}, 'active')
    RETURNING id`
  guardianUsers.push({ userId: u.id, guardianId: guardians[i].id })
}

// ─── 8. STUDENTS ──────────────────────────────────────────────────────────────
console.log('🎓 الطلاب (25)...')
const studentRows = [
  // ذكور نشطون (0-15)
  {num:'S001',fn:'عبد الرحمن',   ln:'بن علي الأمين',    g:'male',  bd:'2010-03-12', st:'active', gid:guardians[0].id, guid:guardianUsers[0].userId},
  {num:'S002',fn:'محمد الأمين',  ln:'قادري',            g:'male',  bd:'2011-06-05', st:'active', gid:guardians[1].id, guid:guardianUsers[1].userId},
  {num:'S003',fn:'يوسف',         ln:'موسى حسن',         g:'male',  bd:'2009-11-20', st:'active', gid:guardians[2].id, guid:guardianUsers[2].userId},
  {num:'S004',fn:'عمر',          ln:'حمود إبراهيم',     g:'male',  bd:'2010-08-15', st:'active', gid:guardians[3].id, guid:null},
  {num:'S005',fn:'عبد العزيز',   ln:'دراجي يحيى',       g:'male',  bd:'2012-01-30', st:'active', gid:guardians[4].id, guid:null},
  {num:'S006',fn:'حمزة',         ln:'بلعيد عمر',        g:'male',  bd:'2011-04-17', st:'active', gid:guardians[5].id, guid:null},
  {num:'S007',fn:'إسماعيل',      ln:'عيسى سليم',        g:'male',  bd:'2013-07-08', st:'active', gid:guardians[6].id, guid:null},
  {num:'S008',fn:'عبد الله',     ln:'رزاق طاهر',        g:'male',  bd:'2010-09-22', st:'active', gid:guardians[7].id, guid:null},
  {num:'S009',fn:'رياض',         ln:'بن صالح',          g:'male',  bd:'2012-02-14', st:'active', gid:guardians[0].id, guid:null},
  {num:'S010',fn:'بلال',         ln:'بن موسى',          g:'male',  bd:'2011-10-01', st:'active', gid:guardians[1].id, guid:null},
  {num:'S011',fn:'سفيان',        ln:'حمودة',            g:'male',  bd:'2013-05-25', st:'active', gid:guardians[2].id, guid:null},
  {num:'S012',fn:'عمار',         ln:'بن علي',           g:'male',  bd:'2010-12-18', st:'active', gid:guardians[3].id, guid:null},
  {num:'S013',fn:'هارون',        ln:'الجزائري',         g:'male',  bd:'2012-07-03', st:'active', gid:guardians[4].id, guid:null},
  {num:'S014',fn:'آدم',          ln:'بن يوسف',          g:'male',  bd:'2011-03-29', st:'active', gid:guardians[5].id, guid:null},
  {num:'S015',fn:'نوح',          ln:'طاهري',            g:'male',  bd:'2013-08-11', st:'active', gid:guardians[6].id, guid:null},
  {num:'S016',fn:'طارق',         ln:'بوعلام',           g:'male',  bd:'2010-11-06', st:'active', gid:guardians[7].id, guid:null},
  // منتظر
  {num:'S017',fn:'أنس',          ln:'قريشي',            g:'male',  bd:'2014-01-20', st:'waiting', gid:guardians[0].id, guid:null},
  // منسحب
  {num:'S018',fn:'زياد',         ln:'بن حسن',           g:'male',  bd:'2009-06-14', st:'withdrawn',gid:guardians[1].id, guid:null},
  // إناث نشطات (18-24)
  {num:'S019',fn:'مريم',         ln:'بن علي',           g:'female',bd:'2011-02-08', st:'active', gid:guardians[2].id, guid:null},
  {num:'S020',fn:'آسيا',         ln:'قادري',            g:'female',bd:'2012-09-17', st:'active', gid:guardians[3].id, guid:null},
  {num:'S021',fn:'هدى',          ln:'حمود',             g:'female',bd:'2010-04-30', st:'active', gid:guardians[4].id, guid:null},
  {num:'S022',fn:'نور الهدى',    ln:'دراجي',            g:'female',bd:'2013-11-22', st:'active', gid:guardians[5].id, guid:null},
  {num:'S023',fn:'رقية',         ln:'بلعيد',            g:'female',bd:'2011-07-05', st:'active', gid:guardians[6].id, guid:null},
  {num:'S024',fn:'إيمان',        ln:'عيسى',             g:'female',bd:'2012-03-19', st:'active', gid:guardians[7].id, guid:null},
  {num:'S025',fn:'أميرة',        ln:'رزاق',             g:'female',bd:'2010-10-27', st:'active', gid:guardians[0].id, guid:null},
]
const students = []
for (const s of studentRows) {
  const [row] = await sql`
    INSERT INTO students (
      student_number, first_name, last_name, gender, birth_date, birth_place,
      address, guardian_name, guardian_phone, guardian_id, guardian_user_id,
      status, enrollment_date, educational_level
    ) VALUES (
      ${s.num}, ${s.fn}, ${s.ln}, ${s.g}, ${s.bd}, 'الديبيلة',
      ${'حي السلام، الديبيلة'}, ${s.fn + ' ' + s.ln.split(' ')[0]},
      ${'066' + s.num.replace('S','1') + '0'}, ${s.gid}, ${s.guid ?? null},
      ${s.st}, '2024-09-01', ${['ابتدائي','متوسط','ثانوي'][students.length % 3]}
    ) RETURNING id, first_name, last_name, status`
  students.push(row)
}

// ─── 9. GROUPS ────────────────────────────────────────────────────────────────
console.log('📋 الأفواج...')
const groups = await sql`
  INSERT INTO groups (group_number, name, group_type, room_id, capacity, status) VALUES
  ('G01','فوج الفجر',  'حفظ',     ${rooms[0].id}, 10, 'open'),
  ('G02','فوج الضحى',  'حفظ',     ${rooms[1].id}, 10, 'open'),
  ('G03','فوج الظهر',  'تجويد',   ${rooms[2].id}, 12, 'open'),
  ('G04','فوج العصر',  'مبتدئين', ${rooms[3].id},  8, 'open'),
  ('G05','فوج المغرب', 'مراجعة',  ${rooms[4].id},  8, 'closed')
  RETURNING id, name`

// ─── 10. GROUP STUDENTS ───────────────────────────────────────────────────────
console.log('🔗 ربط الطلاب بالأفواج...')
const activeStudents = students.filter(s => s.status === 'active')
// G01: 0-4, G02: 5-9, G03: 10-14, G04: 15-17, G05: 18-22
const assign = [[0,5,0],[5,10,1],[10,15,2],[15,18,3],[18,23,4]]
for (const [from, to, gIdx] of assign) {
  for (const s of activeStudents.slice(from, to)) {
    await sql`INSERT INTO group_students (group_id, student_id, joined_date)
              VALUES (${groups[gIdx].id}, ${s.id}, '2024-09-01')
              ON CONFLICT DO NOTHING`
  }
}

// ─── 11. TEACHER GROUPS ───────────────────────────────────────────────────────
console.log('👨‍🏫 ربط المعلمين بالأفواج...')
await sql`INSERT INTO teacher_groups (teacher_id, group_id, subject_id) VALUES
  (${teachers[0].id}, ${groups[0].id}, ${subjects[0].id}),
  (${teachers[0].id}, ${groups[1].id}, ${subjects[0].id}),
  (${teachers[1].id}, ${groups[2].id}, ${subjects[1].id}),
  (${teachers[2].id}, ${groups[2].id}, ${subjects[0].id}),
  (${teachers[3].id}, ${groups[3].id}, ${subjects[0].id}),
  (${teachers[4].id}, ${groups[4].id}, ${subjects[2].id})`

// ─── 12. SCHEDULES ────────────────────────────────────────────────────────────
console.log('📅 الجداول الدراسية...')
const days = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء']
for (const day of days) {
  await sql`INSERT INTO schedules (day_of_week, start_time, end_time, group_id, subject_id, teacher_id, room_id) VALUES
    (${day},'08:00','09:30',${groups[0].id},${subjects[0].id},${teachers[0].id},${rooms[0].id}),
    (${day},'09:45','11:15',${groups[1].id},${subjects[0].id},${teachers[0].id},${rooms[1].id}),
    (${day},'14:00','15:30',${groups[2].id},${subjects[1].id},${teachers[1].id},${rooms[2].id}),
    (${day},'15:45','17:00',${groups[3].id},${subjects[0].id},${teachers[3].id},${rooms[3].id})`
}

// ─── 13. ATTENDANCE (30 days) ─────────────────────────────────────────────────
console.log('📋 الحضور والغياب (30 يوم)...')
const statuses = ['present','present','present','present','present','absent','late']
for (let d = 0; d < 30; d++) {
  const dateStr = daysAgo(d)
  const dow = new Date(dateStr).getDay()
  if (dow === 5 || dow === 4) continue // skip Fri+Thu
  for (const s of activeStudents) {
    const status = d === 0 ? rand(['present','present','absent']) : rand(statuses)
    await sql`INSERT INTO attendances (student_id, attendance_date, status, notes)
              VALUES (${s.id}, ${dateStr}, ${status},
                      ${status==='absent'?'غياب بدون عذر':status==='late'?'تأخر 15 دقيقة':null})
              ON CONFLICT DO NOTHING`
  }
}

// ─── 14. TEACHER ATTENDANCE ───────────────────────────────────────────────────
console.log('👨‍🏫 حضور المعلمين...')
for (let d = 0; d < 30; d++) {
  const dateStr = daysAgo(d)
  const dow = new Date(dateStr).getDay()
  if (dow === 5 || dow === 4) continue
  for (const t of teachers) {
    const status = rand(['present','present','present','absent','late'])
    await sql`INSERT INTO teacher_attendances (teacher_id, attendance_date, status, check_in_time, method)
              VALUES (${t.id}, ${dateStr}, ${status},
                      ${status==='present'?'07:55':status==='late'?'09:10':null}, 'manual')
              ON CONFLICT DO NOTHING`
  }
}

// ─── 15. FEE PAYMENTS ─────────────────────────────────────────────────────────
console.log('💰 مدفوعات الرسوم...')
for (const s of activeStudents.slice(0, 18)) {
  for (let m = 0; m < 3; m++) {
    await sql`INSERT INTO fee_payments (student_id, amount, payment_date, for_month)
              VALUES (${s.id}, '1500', ${daysAgo(m*30+5)}, ${monthStr(m)})`
  }
}

// ─── 16. SALARY PAYMENTS ──────────────────────────────────────────────────────
console.log('💵 رواتب المعلمين...')
for (const t of teachers) {
  for (let m = 0; m < 3; m++) {
    const bonus = m === 0 ? '2000' : '0'
    const net = String(parseInt(t.base_salary ?? 30000) + parseInt(bonus))
    await sql`INSERT INTO salary_payments (teacher_id, for_month, base_salary, bonus, deduction, net_salary, payment_date)
              VALUES (${t.id}, ${monthStr(m)}, ${t.base_salary}, ${bonus}, '0', ${net}, ${daysAgo(m*30+2)})`
  }
}

// ─── 17. EXPENSES & DONATIONS ─────────────────────────────────────────────────
console.log('🧾 المصروفات والتبرعات...')
await sql`INSERT INTO expenses (category, amount, expense_date, notes) VALUES
  ('صيانة', '8500',  ${daysAgo(45)}, 'صيانة مكيفات القاعات'),
  ('لوازم', '3200',  ${daysAgo(30)}, 'أقلام وأدوات مكتبية'),
  ('كهرباء','5600',  ${daysAgo(15)}, 'فاتورة كهرباء شهر نوفمبر'),
  ('نظافة', '1800',  ${daysAgo(10)}, 'مستلزمات النظافة'),
  ('طباعة', '950',   ${daysAgo(5)},  'طباعة شهادات الطلاب')`

await sql`INSERT INTO donations (donor_name, amount, donation_date, notes) VALUES
  ('أحمد بن علي البوسعيدي', '10000', ${daysAgo(60)}, 'تبرع لدعم مشروع القاعات الجديدة'),
  ('مجهول',                 '5000',  ${daysAgo(40)}, 'تبرع شهري'),
  ('عائلة الشيخ زايد',      '20000', ${daysAgo(20)}, 'تبرع بمناسبة الختم'),
  ('الحاج محمد بن صالح',   '3000',  ${daysAgo(5)},  'إعانة الطلاب المحتاجين')`

// ─── 18. MEMORIZATION SESSIONS ────────────────────────────────────────────────
console.log('📖 جلسات الحفظ...')
const [surah1] = await sql`SELECT id FROM surahs WHERE number=1 LIMIT 1`
const [surah2] = await sql`SELECT id FROM surahs WHERE number=2 LIMIT 1`
const [surah18] = await sql`SELECT id FROM surahs WHERE number=18 LIMIT 1`
const [surah36] = await sql`SELECT id FROM surahs WHERE number=36 LIMIT 1`
const [surah67] = await sql`SELECT id FROM surahs WHERE number=67 LIMIT 1`
const sessRatings = ['excellent','very_good','good','acceptable','weak']
const sessTypes   = ['new','review','big_review']
const surahPool = [surah1,surah2,surah18,surah36,surah67].filter(Boolean)
if (surahPool.length > 0) {
  for (let d = 0; d < 14; d++) {
    const dateStr = daysAgo(d)
    if ([5,4].includes(new Date(dateStr).getDay())) continue
    for (const s of activeStudents.slice(0, 18)) {
      const surah = rand(surahPool)
      await sql`INSERT INTO memorization_sessions
        (student_id, group_id, teacher_id, session_date, session_type, surah_id, from_ayah, to_ayah, rating)
        VALUES (${s.id}, ${groups[randInt(0,3)].id}, ${teachers[randInt(0,2)].id},
                ${dateStr}, ${rand(sessTypes)}, ${surah.id},
                ${randInt(1,5)}, ${randInt(6,12)}, ${rand(sessRatings)})`
    }
  }
}

// ─── 19. HOMEWORK ─────────────────────────────────────────────────────────────
console.log('📝 الواجبات...')
if (surahPool.length >= 2) {
  for (let i = 0; i < 3; i++) {
    await sql`INSERT INTO homework (group_id, is_group_homework, from_surah_id, to_surah_id, notes, assigned_by)
              VALUES (${groups[i].id}, true, ${surahPool[0].id}, ${surahPool[1].id},
                      'مراجعة الآيات المحددة وحفظها للجلسة القادمة', ${teachers[i].id})`
  }
  for (const s of activeStudents.slice(0, 8)) {
    await sql`INSERT INTO homework (student_id, is_group_homework, from_surah_id, to_surah_id, notes, assigned_by)
              VALUES (${s.id}, false, ${surahPool[0].id}, ${rand(surahPool).id},
                      'واجب فردي للمراجعة الشاملة', ${teachers[0].id})`
  }
}

// ─── 20. NOTIFICATIONS ────────────────────────────────────────────────────────
console.log('🔔 الإشعارات...')
const notifs = await sql`
  INSERT INTO notifications (title, body, sender_id, target_type, notification_type, is_read_by, created_at) VALUES
  (
    'موعد الاختبار الشهري',
    'يُعلَم جميع أولياء الأمور والطلاب أن الاختبار الشهري لشهر ديسمبر سيُقام يوم الأحد القادم في تمام الساعة التاسعة صباحاً.',
    ${adminUser.id}, 'all', 'manual', '[]', ${tsAgo(48)}
  ),(
    'عطلة بمناسبة المولد النبوي الشريف',
    'تعلن الإدارة عن تعليق الدراسة يومَي الخميس والجمعة المقبلَين. نسأل الله أن يجمعنا على حب نبيه ﷺ.',
    ${adminUser.id}, 'all', 'manual', '[]', ${tsAgo(120)}
  ),(
    'إشعار غياب تلقائي',
    'السلام عليكم. نعلمكم أن الطالب عبد الرحمن بن علي غائب عن الحصة اليوم. يرجى التواصل معنا.',
    ${adminUser.id}, 'specific', 'auto_absence', '[]', ${tsAgo(24)}
  ),(
    'تذكير بالرسوم الدراسية',
    'نذكّر أولياء الأمور بضرورة سداد رسوم الفصل الثاني قبل نهاية الشهر الجاري.',
    ${adminUser.id}, 'guardians', 'manual', '[]', ${tsAgo(192)}
  ),(
    'اجتماع المعلمين الدوري',
    'يُعقد اجتماع المعلمين يوم الأحد بعد صلاة العشاء في مكتب المدير. الحضور إلزامي.',
    ${adminUser.id}, 'teachers', 'manual', '[]', ${tsAgo(72)}
  ),(
    'تهانينا بمناسبة الختم',
    'تهنئ إدارة مؤسسة الفردوس الطالب يوسف موسى حسن بمناسبة ختم القرآن الكريم. جعله الله من أهل القرآن.',
    ${teacherUsers[0].id}, 'all', 'manual', '[]', ${tsAgo(168)}
  ),(
    'إشعار تأخر تلقائي',
    'السلام عليكم. نعلمكم أن الطالب محمد الأمين تأخر عن الحصة اليوم بمقدار 20 دقيقة.',
    ${adminUser.id}, 'specific', 'auto_late', '[]', ${tsAgo(12)}
  ),(
    'افتتاح دورة التجويد الصيفية',
    'يسعد إدارة مؤسسة الفردوس إعلانكم عن افتتاح دورة التجويد الصيفية ابتداءً من الأول من رمضان. التسجيل مفتوح.',
    ${adminUser.id}, 'all', 'manual', '[]', ${tsAgo(96)}
  )
  RETURNING id`

// update target_ids for specific notifications
await sql`UPDATE notifications SET target_ids=${JSON.stringify([guardianUsers[0].userId])} WHERE id=${notifs[2].id}`
await sql`UPDATE notifications SET target_ids=${JSON.stringify([guardianUsers[1]?.userId ?? guardianUsers[0].userId])} WHERE id=${notifs[6].id}`

// ─── 21. MESSAGES ─────────────────────────────────────────────────────────────
console.log('💬 الرسائل...')
const msgData = [
  {s:adminUser.id,       r:teacherUsers[0].id, c:'السلام عليكم أستاذ عبد الرحمن، أرجو مراجعة كشف الحضور لفوج الفجر.', h:72,  rd:true},
  {s:teacherUsers[0].id, r:adminUser.id,       c:'وعليكم السلام. تم المراجعة وسيتم تصحيح أي ملاحظات غداً إن شاء الله.', h:71,  rd:true},
  {s:adminUser.id,       r:teacherUsers[0].id, c:'جزاك الله خيراً، لا تنسَ الاجتماع يوم الأحد.',                      h:48,  rd:true},
  {s:teacherUsers[0].id, r:adminUser.id,       c:'بإذن الله سأكون حاضراً.',                                             h:47,  rd:true},
  {s:adminUser.id,       r:teacherUsers[0].id, c:'هل تحتاج أي مستلزمات لفوجك؟',                                        h:1,   rd:false},
  {s:adminUser.id,       r:teacherUsers[1].id, c:'أستاذ كريم، الجدول الجديد لفوج الظهر جاهز. هل يناسبك؟',             h:96,  rd:true},
  {s:teacherUsers[1].id, r:adminUser.id,       c:'جزاك الله خيراً، الوقت مناسب تماماً.',                               h:95,  rd:true},
  {s:teacherUsers[1].id, r:adminUser.id,       c:'الأستاذ المدير، هل يمكن توفير كتب تجويد إضافية؟',                   h:24,  rd:false},
  {s:teacherUsers[2].id, r:adminUser.id,       c:'السلام عليكم، أطلب صرف راتب شهر أكتوبر.',                           h:120, rd:true},
  {s:adminUser.id,       r:teacherUsers[2].id, c:'وعليكم السلام أستاذة فاطمة، سيتم الصرف خلال يومين.',                h:119, rd:true},
  {s:adminUser.id,       r:teacherUsers[3].id, c:'الشيخ سامي، بارك الله فيك على اهتمامك بالطلاب. نتائج فوجك ممتازة.', h:36,  rd:true},
  {s:teacherUsers[3].id, r:adminUser.id,       c:'جزاك الله خيراً، الحمد لله على توفيقه.',                             h:35,  rd:true},
  {s:guardianUsers[0].userId, r:adminUser.id,  c:'السلام عليكم، هل يمكن الاطلاع على نتائج ابني؟',                     h:48,  rd:true},
  {s:adminUser.id, r:guardianUsers[0].userId,  c:'وعليكم السلام، مرحباً بك. يمكنك الاطلاع عبر لوحة ولي الأمر.',      h:47,  rd:true},
  {s:guardianUsers[0].userId, r:adminUser.id,  c:'شكراً جزيلاً، وجزاكم الله خيراً.',                                  h:2,   rd:false},
]
for (const m of msgData) {
  await sql`INSERT INTO messages (sender_id, receiver_id, content, is_read, read_at, created_at)
            VALUES (${m.s}, ${m.r}, ${m.c}, ${m.rd},
                   ${m.rd ? tsAgo(m.h * 0.5) : null}, ${tsAgo(m.h)})`
}

// ─── 22. SCAN LOGS ────────────────────────────────────────────────────────────
console.log('📱 سجلات المسح...')
for (let d = 0; d < 7; d++) {
  const dateStr = daysAgo(d)
  if ([5,4].includes(new Date(dateStr).getDay())) continue
  for (const s of activeStudents.slice(0, 16)) {
    const h = String(7 + randInt(0, 2)).padStart(2,'0')
    const m = String(randInt(0,59)).padStart(2,'0')
    await sql`INSERT INTO scan_logs (student_id, scan_type, scan_date, scan_time)
              VALUES (${s.id}, ${rand(['barcode','qr'])}, ${dateStr}, ${h+':'+m})`
  }
}

// ─── 23. REGISTRATION REQUESTS ────────────────────────────────────────────────
console.log('📝 طلبات التسجيل...')
await sql`INSERT INTO registration_requests
  (first_name, last_name, gender, birth_date, birth_place, address, educational_level,
   guardian_name, guardian_phone, guardian_relation, guardian_email, notes, status, created_at, updated_at)
  VALUES
  ('محمد رضا','بن صالح العلوي','male','2012-03-15','الديبيلة','حي الياسمين، الديبيلة','ابتدائي',
   'صالح العلوي','0661201001','أب','saleh.alawi@gmail.com',
   'الطالب يحفظ جزء عمّ كاملاً ويرغب في الالتحاق بفوج الحفظ.',
   'pending', ${tsAgo(48)}, ${tsAgo(48)}),
  ('ليلى','بن حمزة زروق','female','2011-07-22','وهران','شارع الأمير، الديبيلة','متوسط',
   'حمزة زروق','0661201002','أب',null,
   'الطالبة انتقلت من مدرسة قرآنية أخرى وتملك شهادة إتمام الجزء الأول.',
   'pending', ${tsAgo(24)}, ${tsAgo(24)}),
  ('عثمان','بوزيد كريم','male','2013-11-05','الديبيلة','حي النخيل، الديبيلة','ابتدائي',
   'كريم بوزيد','0661201003','أب',null, null,
   'accepted', ${tsAgo(240)}, ${tsAgo(192)}),
  ('أنيسة','شريف لمين','female','2010-05-18','تلمسان','حي الزيتون، الديبيلة','متوسط',
   'لمين شريف','0661201004','أب','lamine.sharif@yahoo.fr',
   'تطلب الطالبة الانضمام لفوج التجويد.',
   'rejected', ${tsAgo(360)}, ${tsAgo(312)}),
  ('حسن','بن عمار بلقاسم','male','2012-09-30','الديبيلة','الطريق الوطني، الديبيلة','ابتدائي',
   'عمار بلقاسم','0661201005','أب',null,
   'يرغب الالتحاق بفوج المبتدئين.',
   'pending', ${tsAgo(4)}, ${tsAgo(4)})`

// ─── 24. ACTIVITY LOGS ────────────────────────────────────────────────────────
console.log('📜 سجل العمليات...')
await sql`INSERT INTO activity_logs (user_id, user_full_name, user_role, action, entity, entity_id, description, created_at) VALUES
  (${adminUser.id},'مدير النظام','admin','create','student', ${students[0].id}, ${'إضافة طالب: '+students[0].first_name+' '+students[0].last_name}, ${tsAgo(48)}),
  (${adminUser.id},'مدير النظام','admin','create','group',   ${groups[0].id},   ${'إنشاء فوج: '+groups[0].name}, ${tsAgo(120)}),
  (${teacherUsers[0].id},${teacherUsers[0].full_name},'teacher','update','attendance', 1, ${'تسجيل الحضور ليوم '+daysAgo(1)}, ${tsAgo(24)}),
  (${adminUser.id},'مدير النظام','admin','create','notification', ${notifs[0].id}, ${'إرسال إشعار: موعد الاختبار الشهري'}, ${tsAgo(48)}),
  (${adminUser.id},'مدير النظام','admin','update','settings', null, 'تحديث إعدادات النظام', ${tsAgo(72)})`

// ─── DONE ─────────────────────────────────────────────────────────────────────
console.log('')
console.log('✅ تمت إضافة البيانات التجريبية بنجاح!')
console.log('━'.repeat(55))
console.log('👥 الطلاب:          25 (16 نشط، 1 منتظر، 1 منسحب، 7 إناث)')
console.log('👨‍🏫 المعلمون:         5')
console.log('📋 الأفواج:          5 (4 مفتوحة، 1 مغلقة)')
console.log('🏫 القاعات:          5')
console.log('📚 المواد:           5')
console.log('👨‍👩‍👧 الأولياء:         8')
console.log(`📅 الجداول:         ${days.length * 4} حصة`)
console.log(`📋 الحضور:          ~${Math.ceil(activeStudents.length * 22)} سجل`)
console.log('🔔 الإشعارات:        8')
console.log(`💬 الرسائل:         ${msgData.length}`)
console.log('📝 طلبات التسجيل:   5 (3 معلّقة، 1 مقبولة، 1 مرفوضة)')
console.log(`📖 جلسات الحفظ:     ~${Math.ceil(activeStudents.slice(0,18).length * 10)} جلسة`)
console.log('━'.repeat(55))
console.log('🔐 بيانات الدخول:')
console.log('   admin                → admin123')
console.log('   sheikh.abdelrahman   → teacher123')
console.log('   karim.bouazizi       → teacher123')
console.log('   fatima.zahra         → teacher123')
console.log('   sheikh.sami          → teacher123')
console.log('   youssef.omar         → teacher123')
console.log('   guardian1/2/3        → guardian123')
console.log('━'.repeat(55))

await sql.end()
