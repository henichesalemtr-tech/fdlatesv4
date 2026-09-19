export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { students, groupStudents, groups, attendances, feePayments, memorizationSessions, homework, surahs } from '@/db/schemas/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'نشط',      color: '#16a34a', bg: '#f0fdf4' },
  waiting:   { label: 'في الانتظار', color: '#d97706', bg: '#fffbeb' },
  withdrawn: { label: 'منسحب',    color: '#dc2626', bg: '#fef2f2' },
  graduated: { label: 'متخرج',    color: '#2563eb', bg: '#eff6ff' },
}

const RATING_LABELS: Record<string, string> = {
  excellent: 'ممتاز', very_good: 'جيد جداً', good: 'جيد', acceptable: 'مقبول', weak: 'ضعيف'
}
const RATING_COLORS: Record<string, string> = {
  excellent: '#16a34a', very_good: '#2563eb', good: '#7c3aed', acceptable: '#d97706', weak: '#dc2626'
}
const SESSION_TYPE_LABELS: Record<string, string> = {
  new: 'حفظ جديد', review: 'مراجعة', big_review: 'مراجعة كبرى', exam: 'اختبار', other: 'غير ذلك'
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string; groupId?: string }>
}) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const fromPage = sp.from ?? null
  const fromGroupId = sp.groupId ?? null
  const [student] = await db.select().from(students).where(eq(students.id, parseInt(id))).limit(1)
  if (!student) notFound()

  // Get groups
  const studentGroups = await db
    .select({ group: groups })
    .from(groupStudents)
    .leftJoin(groups, eq(groupStudents.groupId, groups.id))
    .where(eq(groupStudents.studentId, student.id))

  // Attendance stats
  const [attStats] = await db
    .select({
      total: count(),
      present: sql<number>`count(case when status = 'present' then 1 end)`,
      absent: sql<number>`count(case when status = 'absent' then 1 end)`,
      late: sql<number>`count(case when status = 'late' then 1 end)`,
    })
    .from(attendances)
    .where(eq(attendances.studentId, student.id))

  // Memorization sessions (last 10)
  const memSessions = await db
    .select({
      id: memorizationSessions.id,
      sessionDate: memorizationSessions.sessionDate,
      sessionType: memorizationSessions.sessionType,
      fromAyah: memorizationSessions.fromAyah,
      toAyah: memorizationSessions.toAyah,
      rating: memorizationSessions.rating,
      notes: memorizationSessions.notes,
      surahName: surahs.name,
    })
    .from(memorizationSessions)
    .leftJoin(surahs, eq(memorizationSessions.surahId, surahs.id))
    .where(eq(memorizationSessions.studentId, student.id))
    .orderBy(desc(memorizationSessions.sessionDate))
    .limit(10)

  // Current homework
  const [currentHw] = await db
    .select({
      id: homework.id,
      notes: homework.notes,
      isGroupHomework: homework.isGroupHomework,
      fromSurahId: homework.fromSurahId,
      toSurahId: homework.toSurahId,
      fromSurahName: surahs.name,
    })
    .from(homework)
    .leftJoin(surahs, eq(homework.fromSurahId, surahs.id))
    .where(eq(homework.studentId, student.id))
    .orderBy(desc(homework.assignedAt))
    .limit(1)

  let toSurahName: string | null = null
  if (currentHw?.toSurahId) {
    const [ts] = await db.select().from(surahs).where(eq(surahs.id, currentHw.toSurahId)).limit(1)
    toSurahName = ts?.name ?? null
  }

  // Payments
  const payments = await db
    .select()
    .from(feePayments)
    .where(eq(feePayments.studentId, student.id))
    .orderBy(desc(feePayments.paymentDate))
    .limit(6)

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount ?? '0'), 0)

  // Memorization rating distribution
  const ratingDistribution: Record<string, number> = {}
  for (const s of memSessions) {
    if (s.rating) ratingDistribution[s.rating] = (ratingDistribution[s.rating] ?? 0) + 1
  }

  const attendanceRate = attStats.total > 0
    ? Math.round((Number(attStats.present) / Number(attStats.total)) * 100) : 0

  const statusCfg = STATUS_CONFIG[student.status] ?? { label: student.status, color: '#6b7280', bg: '#f9fafb' }

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={
              fromPage === 'ranking' && fromGroupId
                ? `/ranking?groupId=${fromGroupId}`
                : fromPage === 'groups' && fromGroupId
                  ? `/groups?openGroup=${fromGroupId}`
                  : '/students'
            }
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            → {fromPage === 'ranking' ? 'الترتيب' : fromPage === 'groups' ? 'الفوج' : 'قائمة الطلاب'}
          </Link>
          <Link href={`/students/${id}/print`} target="_blank"
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            🖨️ طباعة الملف
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">ملف الطالب</h1>
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-800 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg">
            {student.firstName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}33` }}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm font-mono">{student.studentNumber}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-gray-400 text-xs block">الجنس</span><span className="text-gray-800">{student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">تاريخ الميلاد</span><span className="text-gray-800">{student.birthDate ?? '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">الهاتف</span><span className="text-gray-800 font-mono">{student.phone ?? '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">ولي الأمر</span><span className="text-gray-800">{student.guardianName ?? '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">المستوى الدراسي</span><span className="text-gray-800">{student.educationalLevel ?? '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">تاريخ التسجيل</span><span className="text-gray-800">{student.enrollmentDate ?? '-'}</span></div>
              <div><span className="text-gray-400 text-xs block">العنوان</span><span className="text-gray-800">{student.address ?? '-'}</span></div>
            </div>
            {student.notes && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700">
                <span className="text-yellow-600 font-medium text-xs block mb-1">ملاحظات</span>
                {student.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{attStats.total}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي الحصص</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{attendanceRate}%</div>
          <div className="text-xs text-gray-500 mt-1">نسبة الحضور</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{memSessions.length}</div>
          <div className="text-xs text-gray-500 mt-1">جلسات الحفظ</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{totalPaid.toLocaleString('ar')}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي الدفوعات (د.ج)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Memorization + Homework */}
        <div className="lg:col-span-2 space-y-5">
          {/* Current homework */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              🏠 الواجب المنزلي الحالي
            </h3>
            {currentHw ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                {currentHw.isGroupHomework && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mb-2 inline-block">واجب الفوج</span>
                )}
                <div className="text-gray-700">
                  من سورة <strong>{currentHw.fromSurahName}</strong>
                  {toSurahName && <> إلى سورة <strong>{toSurahName}</strong></>}
                </div>
                {currentHw.notes && (
                  <div className="text-gray-500 text-sm mt-2">{currentHw.notes}</div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-3">لا يوجد واجب محدد حالياً</p>
            )}
          </div>

          {/* Memorization sessions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                📖 سجل جلسات الحفظ
              </h3>
              {Object.keys(ratingDistribution).length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(ratingDistribution).map(([r, n]) => (
                    <span key={r} className="text-white text-xs px-2 py-0.5 rounded-full"
                      style={{ background: RATING_COLORS[r] ?? '#9ca3af' }}>
                      {RATING_LABELS[r] ?? r}: {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {memSessions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">لا توجد جلسات مسجلة بعد</p>
            ) : (
              <div className="space-y-2">
                {memSessions.map(sess => (
                  <div key={sess.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: RATING_COLORS[sess.rating ?? ''] ?? '#9ca3af' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">{sess.sessionDate}</span>
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded">
                          {SESSION_TYPE_LABELS[sess.sessionType] ?? sess.sessionType}
                        </span>
                        {sess.rating && (
                          <span className="text-xs text-white px-2 py-0.5 rounded-full"
                            style={{ background: RATING_COLORS[sess.rating] }}>
                            {RATING_LABELS[sess.rating]}
                          </span>
                        )}
                      </div>
                      {sess.surahName && (
                        <div className="text-sm text-gray-700 mt-0.5">
                          سورة <strong>{sess.surahName}</strong>
                          {sess.fromAyah && ` — من الآية ${sess.fromAyah} إلى ${sess.toAyah}`}
                        </div>
                      )}
                      {sess.notes && <div className="text-xs text-gray-400 mt-0.5">{sess.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-4">📊 إحصاء الحضور والغياب</h3>
            <div className="flex gap-4">
              {[
                { label: 'حاضر', value: attStats.present, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'غائب', value: attStats.absent, color: '#dc2626', bg: '#fef2f2' },
                { label: 'متأخر', value: attStats.late, color: '#d97706', bg: '#fffbeb' },
              ].map(s => (
                <div key={s.label} className="flex-1 rounded-lg p-3 text-center border"
                  style={{ background: s.bg, borderColor: s.color + '33' }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{Number(s.value)}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Groups */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-3">👥 الأفواج المرتبطة</h3>
            {studentGroups.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">لم يتم إدراجه في فوج بعد</p>
            ) : (
              <div className="space-y-2">
                {studentGroups.map(sg => sg.group && (
                  <div key={sg.group.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-gray-800">{sg.group.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{sg.group.groupNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-3">💳 آخر الدفوعات</h3>
            {payments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">لا توجد دفوعات</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                    <div>
                      <div className="font-medium text-gray-800">{p.forMonth ?? '-'}</div>
                      <div className="text-xs text-gray-400">{p.paymentDate ?? '-'}</div>
                    </div>
                    <span className="font-bold text-green-700">{parseFloat(p.amount ?? '0').toLocaleString('ar')} د.ج</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-gray-600">المجموع المدفوع</span>
                  <span className="text-green-700">{totalPaid.toLocaleString('ar')} د.ج</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
