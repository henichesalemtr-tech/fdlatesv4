'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

const DAY_LABELS: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
}
const MONTHS: Record<string, string> = {
  '01':'جانفي','02':'فيفري','03':'مارس','04':'أفريل','05':'ماي','06':'جوان',
  '07':'جويلية','08':'أوت','09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر',
}
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return `${MONTHS[mo] ?? mo} ${y}`
}

type Teacher = {
  id: number; teacherNumber: string | null; fullName: string; qualification: string | null
  phone: string | null; email: string | null; hireDate: string | null
  baseSalary: string | null; status: string
}
type Schedule = {
  id: number; dayOfWeek: string | null; startTime: string | null; endTime: string | null
  groupName: string | null; groupNumber: string | null; subjectName: string | null; roomName: string | null
}
type SalaryRecord = {
  month: string; sessionCount: number; pricePerSession: number
  calculatedSalary: string; paidSalary: string | null; paymentId: number | null; isPaid: boolean
}
type SalarySetting = { id: number; month: string | null; pricePerSession: string | null }
type Attendance  = { present: number; absent: number; late: number }

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [teacher, setTeacher]           = useState<Teacher | null>(null)
  const [scheduleList, setScheduleList] = useState<Schedule[]>([])
  const [monthlySalary, setMonthlySalary] = useState<SalaryRecord[]>([])
  const [attendance, setAttendance]     = useState<Attendance>({ present: 0, absent: 0, late: 0 })
  const [loading, setLoading]           = useState(true)
  const [priceInput, setPriceInput]     = useState('')
  const [savingPrice, setSavingPrice]   = useState(false)
  const [payingMonth, setPayingMonth]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/teachers/detail?id=${id}`)
    if (!res.ok) { toast.error('فشل تحميل بيانات المعلم'); setLoading(false); return }
    const data = await res.json()
    setTeacher(data.teacher)
    setScheduleList(data.schedules ?? [])
    setMonthlySalary(data.monthlySalary ?? [])
    setAttendance(data.attendance ?? { present: 0, absent: 0, late: 0 })
    setPriceInput(data.salarySettings?.[0]?.pricePerSession ?? '0')
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function savePricePerSession() {
    setSavingPrice(true)
    const res = await fetch('/api/finance/salaries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: parseInt(id), pricePerSession: priceInput }),
    })
    if (res.ok) { toast.success('تم حفظ سعر الحصة'); load() }
    else toast.error('فشل الحفظ')
    setSavingPrice(false)
  }

  async function markPaid(month: string, amount: string) {
    setPayingMonth(month)
    const res = await fetch('/api/finance/salaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: parseInt(id), forMonth: month,
        baseSalary: amount, bonus: '0', deduction: '0',
        paymentDate: new Date().toISOString().split('T')[0],
      }),
    })
    if (res.ok) { toast.success('تم تسجيل الدفع'); load() }
    else toast.error('فشل تسجيل الدفع')
    setPayingMonth(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!teacher) return <div className="text-center py-20 text-red-500">لم يُعثر على المعلم</div>

  return (
    <div dir="rtl" className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/teachers"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0">
          →
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ملف المعلم</h1>
      </div>

      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {teacher.fullName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{teacher.fullName}</h2>
                <p className="text-sm text-gray-400 font-mono mt-0.5">{teacher.teacherNumber ?? '—'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {teacher.status === 'active' ? '● نشط' : '● غير نشط'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-sm text-gray-600">
              {teacher.qualification && (
                <span className="flex items-center gap-1">🎓 <span>{teacher.qualification}</span></span>
              )}
              {teacher.phone && (
                <a href={`tel:${teacher.phone}`} className="flex items-center gap-1 hover:text-green-700">
                  📞 <span className="font-mono">{teacher.phone}</span>
                </a>
              )}
              {teacher.email && (
                <span className="flex items-center gap-1 min-w-0">
                  📧 <span className="truncate">{teacher.email}</span>
                </span>
              )}
              {teacher.hireDate && (
                <span className="flex items-center gap-1">📅 <span>{teacher.hireDate}</span></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Attendance stats ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'أيام الحضور', value: attendance.present, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'أيام التأخر', value: attendance.late,    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'أيام الغياب', value: attendance.absent,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 sm:p-4 text-center border"
            style={{ background: s.bg, borderColor: s.border }}>
            <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Schedules ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-bold text-gray-800">الجداول الزمنية</h3>
          {scheduleList.length > 0 && (
            <span className="mr-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {scheduleList.length} حصة
            </span>
          )}
        </div>

        {scheduleList.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">لا توجد جداول مرتبطة بهذا المعلم</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="text-right px-4 py-2.5 font-semibold">اليوم</th>
                    <th className="text-right px-4 py-2.5 font-semibold">الوقت</th>
                    <th className="text-right px-4 py-2.5 font-semibold">الفوج</th>
                    <th className="text-right px-4 py-2.5 font-semibold">المادة</th>
                    <th className="text-right px-4 py-2.5 font-semibold">القاعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scheduleList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-green-800">
                        {DAY_LABELS[s.dayOfWeek ?? ''] ?? s.dayOfWeek ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {s.startTime ?? '—'} — {s.endTime ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {s.groupName ?? '—'}
                        {s.groupNumber && <span className="text-gray-400 text-xs mr-1">({s.groupNumber})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.subjectName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.roomName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {scheduleList.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-xs font-bold">
                      {(DAY_LABELS[s.dayOfWeek ?? ''] ?? '—').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">
                        {s.groupName ?? '—'}
                        {s.groupNumber && <span className="text-gray-400 text-xs mr-1">({s.groupNumber})</span>}
                      </span>
                      <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                        {s.startTime ?? '—'}–{s.endTime ?? '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {s.subjectName && <span>📖 {s.subjectName}</span>}
                      {s.roomName    && <span>🏛 {s.roomName}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Salary price setting ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💰</span>
          <h3 className="font-bold text-gray-800">إعداد سعر الحصة</h3>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1.5">سعر الحصة الواحدة (دج)</label>
            <input
              type="number"
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              placeholder="مثال: 500"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={savePricePerSession}
            disabled={savingPrice}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex-shrink-0">
            {savingPrice
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'حفظ'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          الراتب المستحق = عدد الحصص في الشهر × سعر الحصة الواحدة
        </p>
      </div>

      {/* ── Monthly salary ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-bold text-gray-800">الراتب الشهري</h3>
        </div>

        {monthlySalary.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">لا توجد حصص مسجلة لهذا المعلم بعد</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-right px-4 py-2.5 font-semibold">الشهر</th>
                    <th className="text-center px-3 py-2.5 font-semibold">الحصص</th>
                    <th className="text-center px-3 py-2.5 font-semibold">سعر الحصة</th>
                    <th className="text-center px-3 py-2.5 font-semibold">المستحق</th>
                    <th className="text-center px-3 py-2.5 font-semibold">المدفوع</th>
                    <th className="text-center px-3 py-2.5 font-semibold">الحالة</th>
                    <th className="text-center px-3 py-2.5 font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlySalary.map(m => (
                    <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{fmtMonth(m.month)}</td>
                      <td className="px-3 py-3 text-center font-bold text-green-700">{m.sessionCount}</td>
                      <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.pricePerSession.toLocaleString()} دج</td>
                      <td className="px-3 py-3 text-center font-bold text-blue-700">
                        {parseFloat(m.calculatedSalary).toLocaleString()} دج
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">
                        {m.isPaid ? `${parseFloat(m.paidSalary ?? '0').toLocaleString()} دج` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          m.isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {m.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {!m.isPaid && (
                          <button
                            onClick={() => markPaid(m.month, m.calculatedSalary)}
                            disabled={payingMonth === m.month}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors whitespace-nowrap">
                            {payingMonth === m.month
                              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                              : 'تسجيل دفع'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {monthlySalary.map(m => (
                <div key={m.month} className="px-4 py-3.5">
                  {/* Month + status */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-bold text-gray-800">{fmtMonth(m.month)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      m.isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {m.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">الحصص</div>
                      <div className="font-bold text-green-700 text-sm">{m.sessionCount}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">المستحق</div>
                      <div className="font-bold text-blue-700 text-sm">
                        {parseFloat(m.calculatedSalary).toLocaleString()}
                        <span className="text-xs font-normal"> دج</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">المدفوع</div>
                      <div className={`font-bold text-sm ${m.isPaid ? 'text-green-700' : 'text-gray-400'}`}>
                        {m.isPaid
                          ? <>{parseFloat(m.paidSalary ?? '0').toLocaleString()} <span className="text-xs font-normal">دج</span></>
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Pay button */}
                  {!m.isPaid && (
                    <button
                      onClick={() => markPaid(m.month, m.calculatedSalary)}
                      disabled={payingMonth === m.month}
                      className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {payingMonth === m.month
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري التسجيل...</>
                        : <>💸 تسجيل دفع {parseFloat(m.calculatedSalary).toLocaleString()} دج</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
