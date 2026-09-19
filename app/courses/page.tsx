'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Course = {
  id: number
  name: string
  description: string | null
  educationLevel: string | null
  startDate: string | null
  endDate: string | null
  capacity: number | null
  price: number | null
  status: string
  notes: string | null
  enrolledCount: number
  pendingRegistrations: number
}
type Student = { id: number; studentNumber: string; firstName: string; lastName: string }
type Enrollment = { id: number; studentId: number; studentNumber: string | null; firstName: string | null; lastName: string | null; enrolledAt: string | null; notes: string | null }
type Registration = { id: number; firstName: string; lastName: string; phone: string | null; guardianName: string | null; guardianPhone: string | null; educationLevel: string | null; notes: string | null; status: string; createdAt: string | null }
type CourseDetail = { course: Course; enrolled: Enrollment[]; registrations: Registration[] }

const EDUCATION_LEVELS = ['ابتدائي', 'متوسط', 'ثانوي', 'جامعي', 'غير ذلك']
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:      { label: 'مفتوح',    color: '#16a34a', bg: '#f0fdf4' },
  closed:    { label: 'مغلق',     color: '#dc2626', bg: '#fef2f2' },
  cancelled: { label: 'ملغى',     color: '#6b7280', bg: '#f9fafb' },
}
const REG_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'معلّق',     color: '#d97706' },
  accepted: { label: 'مقبول',    color: '#16a34a' },
  rejected: { label: 'مرفوض',   color: '#dc2626' },
}
const EMPTY_FORM = { name: '', description: '', educationLevel: '', startDate: '', endDate: '', capacity: '', price: '', status: 'open', notes: '' }

export default function CoursesPage() {
  const [courses, setCourses]         = useState<Course[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editCourse, setEditCourse]   = useState<Course | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [viewDetail, setViewDetail]   = useState<CourseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [regEnabled, setRegEnabled]   = useState<boolean | null>(null)
  const [togglingReg, setTogglingReg] = useState(false)

  async function fetchCourses() {
    setLoading(true)
    const r = await fetch('/api/courses')
    if (r.ok) setCourses(await r.json())
    setLoading(false)
  }

  async function fetchRegSetting() {
    const r = await fetch('/api/settings')
    if (r.ok) {
      const data = await r.json()
      const val = data.find((s: { key: string; value: string }) => s.key === 'course_registration_enabled')
      setRegEnabled(val ? val.value !== 'false' : true)
    }
  }

  useEffect(() => { fetchCourses(); fetchRegSetting() }, [])

  function openCreate() {
    setEditCourse(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(c: Course) {
    setEditCourse(c)
    setForm({
      name: c.name,
      description: c.description ?? '',
      educationLevel: c.educationLevel ?? '',
      startDate: c.startDate ?? '',
      endDate: c.endDate ?? '',
      capacity: c.capacity?.toString() ?? '',
      price: c.price?.toString() ?? '',
      status: c.status,
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  async function saveCourse() {
    if (!form.name.trim()) { toast.error('اسم الدورة مطلوب'); return }
    setSaving(true)
    try {
      const url = editCourse ? `/api/courses/${editCourse.id}` : '/api/courses'
      const method = editCourse ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!r.ok) { const e = await r.json(); toast.error(e.error ?? 'خطأ في الحفظ'); return }
      toast.success(editCourse ? 'تم تعديل الدورة' : 'تم إنشاء الدورة')
      setShowModal(false)
      fetchCourses()
      if (viewDetail && editCourse?.id === viewDetail.course.id) openDetail(viewDetail.course.id)
    } finally { setSaving(false) }
  }

  async function deleteCourse(id: number) {
    if (!confirm('هل تريد حذف هذه الدورة؟')) return
    const r = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('تم الحذف'); fetchCourses(); if (viewDetail?.course.id === id) setViewDetail(null) }
    else { const e = await r.json(); toast.error(e.error ?? 'خطأ في الحذف') }
  }

  async function openDetail(courseId: number) {
    setDetailLoading(true)
    const [detailRes, studentsRes] = await Promise.all([
      fetch(`/api/courses/${courseId}`),
      fetch('/api/students'),
    ])
    if (detailRes.ok) setViewDetail(await detailRes.json())
    if (studentsRes.ok) setAllStudents(await studentsRes.json())
    setDetailLoading(false)
    setEnrollStudentId('')
    setStudentSearch('')
  }

  async function enrollStudent() {
    if (!enrollStudentId || !viewDetail) return
    const r = await fetch(`/api/courses/${viewDetail.course.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: parseInt(enrollStudentId) }),
    })
    if (r.ok) { toast.success('تم تسجيل الطالب'); openDetail(viewDetail.course.id) }
    else { const e = await r.json(); toast.error(e.error ?? 'خطأ') }
    setEnrollStudentId('')
    setStudentSearch('')
  }

  async function unenrollStudent(enrollmentId: number) {
    if (!viewDetail) return
    if (!confirm('هل تريد إزالة هذا الطالب من الدورة؟')) return
    const r = await fetch(`/api/courses/${viewDetail.course.id}/students?enrollmentId=${enrollmentId}`, { method: 'DELETE' })
    if (r.ok) { toast.success('تم إزالة الطالب'); openDetail(viewDetail.course.id) }
    else toast.error('خطأ في الإزالة')
  }

  async function updateRegistration(regId: number, status: string) {
    if (!viewDetail) return
    const r = await fetch(`/api/courses/${viewDetail.course.id}/registrations/${regId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (r.ok) { toast.success('تم تحديث الحالة'); openDetail(viewDetail.course.id) }
    else toast.error('خطأ في التحديث')
  }

  async function deleteRegistration(regId: number) {
    if (!viewDetail) return
    if (!confirm('هل تريد حذف هذا الطلب؟')) return
    const r = await fetch(`/api/courses/${viewDetail.course.id}/registrations/${regId}`, { method: 'DELETE' })
    if (r.ok) { toast.success('تم الحذف'); openDetail(viewDetail.course.id) }
    else toast.error('خطأ في الحذف')
  }

  function printRegistrations() {
    if (!viewDetail) return
    const { course, enrolled, registrations } = viewDetail

    // Section 1: enrolled students (added from platform search)
    const enrolledRows = enrolled.map((e, i) => `
      <tr>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${i + 1}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb">${(e.firstName ?? '') + ' ' + (e.lastName ?? '')}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${e.studentNumber ?? '—'}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">—</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;direction:ltr;text-align:left">—</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center;color:#16a34a;font-weight:600">مسجّل</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString('ar-DZ') : '—'}</td>
      </tr>
    `).join('')

    // Section 2: external registration requests
    const regRows = registrations.map((r, i) => `
      <tr>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${enrolled.length + i + 1}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb">${r.firstName} ${r.lastName}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">—</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${r.educationLevel ?? '—'}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;direction:ltr;text-align:left">${r.guardianPhone ?? '—'}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${REG_STATUS[r.status]?.label ?? r.status}</td>
        <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-DZ') : '—'}</td>
      </tr>
    `).join('')

    const totalCount = enrolled.length + registrations.length

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>قائمة المسجلين – ${course.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; color: #1a5c35; }
    .sub { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    .section-title { font-size: 13px; font-weight: 700; color: #1a5c35; margin: 16px 0 6px; border-right: 4px solid #1a5c35; padding-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead { background: #1a5c35; color: #fff; }
    thead th { padding: 8px 10px; font-weight: 600; border: 1px solid #1a5c35; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tfoot td { padding: 8px 10px; font-size: 11px; color: #6b7280; border-top: 2px solid #e5e7eb; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>📋 قائمة المسجلين – ${course.name}</h1>
  <p class="sub">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-DZ')} · إجمالي: ${totalCount} (${enrolled.length} طالب منصة + ${registrations.length} طلب خارجي)</p>
  ${enrolled.length > 0 ? `
  <div class="section-title">👥 طلاب المنصة المسجّلون (${enrolled.length})</div>
  <table>
    <thead><tr>
      <th>#</th><th>الاسم الكامل</th><th>رقم الطالب</th><th>المستوى</th><th>هاتف ولي الأمر</th><th>الحالة</th><th>تاريخ التسجيل</th>
    </tr></thead>
    <tbody>${enrolledRows}</tbody>
  </table>` : ''}
  ${registrations.length > 0 ? `
  <div class="section-title">📝 طلبات التسجيل الخارجية (${registrations.length})</div>
  <table>
    <thead><tr>
      <th>#</th><th>الاسم الكامل</th><th>رقم الطالب</th><th>المستوى الدراسي</th><th>هاتف ولي الأمر</th><th>الحالة</th><th>تاريخ الطلب</th>
    </tr></thead>
    <tbody>${regRows}</tbody>
  </table>` : ''}
  <tfoot><tr><td colspan="7">منصة الفردوس لتعليم القرآن الكريم</td></tr></tfoot>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.print() }
  }

  async function toggleRegEnabled() {
    setTogglingReg(true)
    const newVal = !regEnabled
    const r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ key: 'course_registration_enabled', value: newVal ? 'true' : 'false' }]),
    })
    if (r.ok) { setRegEnabled(newVal); toast.success(newVal ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام') }
    else toast.error('خطأ في تغيير الإعداد')
    setTogglingReg(false)
  }

  const filteredStudentsForEnroll = allStudents
    .filter(s => {
      if (!viewDetail) return false
      const enrolledIds = viewDetail.enrolled.map(e => e.studentId)
      if (enrolledIds.includes(s.id)) return false
      const q = studentSearch.toLowerCase()
      if (!q) return true
      return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
    })
    .slice(0, 20)

  return (
    <div className="max-w-5xl mx-auto py-6 px-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 الدورات التعليمية</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة الدورات وطلبات التسجيل</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleRegEnabled}
            disabled={togglingReg}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              regEnabled
                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
            }`}
          >
            {regEnabled ? '✅ التسجيل العام مفعّل' : '🔒 التسجيل العام مغلق'}
          </button>
          <button
            onClick={openCreate}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            + إنشاء دورة
          </button>
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📚</div>
          <p>لا توجد دورات بعد</p>
          <button onClick={openCreate} className="mt-4 bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm">+ إنشاء دورة</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map(c => {
            const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.open
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{c.name}</h2>
                    {c.educationLevel && <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">{c.educationLevel}</span>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap shrink-0"
                    style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                {c.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{c.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  {c.startDate && <span>📅 {c.startDate}</span>}
                  {c.endDate && <span>🏁 {c.endDate}</span>}
                  {c.capacity != null && <span>👥 {c.enrolledCount}/{c.capacity}</span>}
                  {c.price != null && c.price > 0 && <span>💰 {c.price} دج</span>}
                  {c.pendingRegistrations > 0 && (
                    <span className="text-amber-600 font-medium">🔔 {c.pendingRegistrations} طلب معلّق</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openDetail(c.id)}
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium transition-colors"
                  >👁️ عرض</button>
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
                  >✏️ تعديل</button>
                  <button
                    onClick={() => deleteCourse(c.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm transition-colors"
                  >🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{editCourse ? '✏️ تعديل الدورة' : '+ إنشاء دورة جديدة'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الدورة *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="مثال: دورة تجويد القرآن"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="وصف مختصر للدورة..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المستوى الدراسي</label>
                  <select
                    value={form.educationLevel}
                    onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">— اختر —</option>
                    {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="open">مفتوح</option>
                    <option value="closed">مغلق</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطاقة الاستيعابية</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="مثال: 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر (دج)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCourse}
                disabled={saving}
                className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
              >{saving ? 'جاري الحفظ...' : '💾 حفظ'}</button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detailLoading || viewDetail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full" /></div>
            ) : viewDetail && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{viewDetail.course.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{viewDetail.enrolled.length} طالب مسجّل · {viewDetail.registrations.filter(r => r.status === 'pending').length} طلب معلّق</p>
                  </div>
                  <button onClick={() => setViewDetail(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>

                <div className="p-5 space-y-6">
                  {/* Enrolled Students */}
                  <section>
                    <h3 className="font-semibold text-gray-800 mb-3">👥 الطلاب المسجّلون ({viewDetail.enrolled.length})</h3>
                    {/* Enroll new student */}
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 relative">
                        <input
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                          placeholder="ابحث عن طالب لإضافته..."
                        />
                        {studentSearch && filteredStudentsForEnroll.length > 0 && (
                          <div className="absolute top-full right-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                            {filteredStudentsForEnroll.map(s => (
                              <button
                                key={s.id}
                                onClick={() => { setEnrollStudentId(s.id.toString()); setStudentSearch(`${s.firstName} ${s.lastName}`) }}
                                className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm"
                              >
                                {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">({s.studentNumber})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={enrollStudent}
                        disabled={!enrollStudentId}
                        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm"
                      >+ إضافة</button>
                    </div>
                    {viewDetail.enrolled.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">لا يوجد طلاب مسجّلون</p>
                    ) : (
                      <div className="divide-y border border-gray-100 rounded-xl overflow-hidden">
                        {viewDetail.enrolled.map(e => (
                          <div key={e.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                            <div>
                              <span className="font-medium text-sm">{e.firstName} {e.lastName}</span>
                              {e.studentNumber && <span className="text-xs text-gray-400 mr-2">({e.studentNumber})</span>}
                            </div>
                            <button
                              onClick={() => unenrollStudent(e.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >إزالة</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Registration Requests */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">📋 طلبات التسجيل ({viewDetail.registrations.length})</h3>
                      {(viewDetail.registrations.length > 0 || viewDetail.enrolled.length > 0) && (
                        <button
                          onClick={printRegistrations}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors"
                        >
                          🖨️ طباعة / PDF
                        </button>
                      )}
                    </div>
                    {viewDetail.registrations.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">لا توجد طلبات</p>
                    ) : (
                      <div className="space-y-2">
                        {viewDetail.registrations.map(r => {
                          const rs = REG_STATUS[r.status] ?? REG_STATUS.pending
                          return (
                            <div key={r.id} className="border border-gray-100 rounded-xl p-4 bg-white">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{r.firstName} {r.lastName}</p>
                                  <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                                    {r.phone && <span>📞 {r.phone}</span>}
                                    {r.guardianName && <span>👤 {r.guardianName}</span>}
                                    {r.guardianPhone && <span>📱 {r.guardianPhone}</span>}
                                    {r.educationLevel && <span>🎓 {r.educationLevel}</span>}
                                  </div>
                                  {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                                </div>
                                <span className="text-xs font-medium shrink-0" style={{ color: rs.color }}>{rs.label}</span>
                              </div>
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {r.status !== 'accepted' && (
                                  <button
                                    onClick={() => updateRegistration(r.id, 'accepted')}
                                    className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                                  >✅ قبول</button>
                                )}
                                {r.status !== 'rejected' && (
                                  <button
                                    onClick={() => updateRegistration(r.id, 'rejected')}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium"
                                  >❌ رفض</button>
                                )}
                                {r.status !== 'pending' && (
                                  <button
                                    onClick={() => updateRegistration(r.id, 'pending')}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium"
                                  >↩️ معلّق</button>
                                )}
                                <button
                                  onClick={() => deleteRegistration(r.id)}
                                  className="text-red-400 hover:text-red-600 text-xs mr-auto"
                                >حذف</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
