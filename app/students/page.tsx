'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Student = {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: string | null
  status: string
  enrollmentDate: string | null
  phone: string | null
  guardianName: string | null
  guardianPhone: string | null
  educationalLevel: string | null
  address: string | null
  createdAt: string
}

type ImportResult = {
  imported: number
  errors: string[]
  message: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: 'نشط',              color: 'bg-green-500 text-white' },
  waiting:   { label: 'في الانتظار',      color: 'bg-yellow-400 text-gray-800' },
  withdrawn: { label: 'منسحب',            color: 'bg-red-500 text-white' },
  graduated: { label: 'متخرج',            color: 'bg-blue-500 text-white' },
}

/* ─────────────────────────────────────────────────────────────
   Import Modal
───────────────────────────────────────────────────────────── */
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'pick' | 'preview' | 'result'>('pick')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [downloadingTpl, setDownloadingTpl] = useState(false)

  /* drag & drop */
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) pickFile(f)
    else toast.error('يُقبل ملف Excel فقط (.xlsx / .xls)')
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
  }
  function pickFile(f: File) { setFile(f); setStep('preview') }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/students/import', { method: 'POST', body: fd })
    const data = await res.json()
    setResult(data)
    setStep('result')
    setImporting(false)
    if (data.success && data.imported > 0) onSuccess()
  }

  async function handleDownloadTemplate() {
    setDownloadingTpl(true)
    const res = await fetch('/api/students/import')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'students_template.xlsx'; a.click()
    URL.revokeObjectURL(url)
    setDownloadingTpl(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-l from-green-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center text-white text-lg flex-shrink-0">📥</div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">استيراد الطلاب من Excel</h2>
              <p className="text-xs text-gray-400">يدعم الصيغ .xlsx و .xls</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xl transition">×</button>
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium overflow-x-auto flex-shrink-0">
          {(['pick', 'preview', 'result'] as const).map((s, i) => {
            const labels = ['اختيار الملف', 'مراجعة', 'النتيجة']
            const done = ['pick','preview','result'].indexOf(step) > i
            const active = step === s
            return (
              <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {i > 0 && <div className={`w-4 sm:w-8 h-0.5 rounded ${done || active ? 'bg-green-500' : 'bg-gray-200'}`} />}
                <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full transition-all text-[11px] sm:text-xs
                  ${active ? 'bg-green-700 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                  <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold
                    ${active ? 'bg-white/20' : ''}`}>
                    {done ? '✓' : i + 1}
                  </span>
                  {labels[i]}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Body ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">

          {/* STEP 1: pick */}
          {step === 'pick' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all select-none
                  ${dragging
                    ? 'border-green-500 bg-green-50 scale-[1.01]'
                    : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'}`}
              >
                <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">{dragging ? '📂' : '📊'}</div>
                <p className="font-semibold text-gray-700 text-xs sm:text-sm">
                  {dragging ? 'أفلت الملف هنا' : 'اسحب ملف Excel هنا أو انقر للاختيار'}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1">.xlsx — .xls &nbsp;|&nbsp; الحجم الأقصى 10 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              {/* Template download */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
                <span className="text-xl sm:text-2xl mt-0.5">💡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-800 mb-0.5">هل تستخدم الاستيراد للمرة الأولى؟</p>
                  <p className="text-[11px] sm:text-xs text-blue-600 mb-2">حمّل القالب الجاهز، أدخل بيانات طلابك فيه، ثم ارفعه هنا.</p>
                  <button
                    onClick={e => { e.stopPropagation(); handleDownloadTemplate() }}
                    disabled={downloadingTpl}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60 transition">
                    ⬇️ {downloadingTpl ? 'جاري التحميل...' : 'تحميل قالب الاستيراد (.xlsx)'}
                  </button>
                </div>
              </div>

              {/* Columns guide */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
                  الأعمدة المطلوبة في ملف الاستيراد
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x-0 divide-gray-100 text-xs">
                  {[
                    { col: 'الاسم الأول',       req: true },
                    { col: 'اللقب',               req: true },
                    { col: 'الجنس',               req: false },
                    { col: 'تاريخ الميلاد',       req: false },
                    { col: 'رقم الهاتف',          req: false },
                    { col: 'اسم الولي',           req: false },
                    { col: 'رقم هاتف ولي الأمر', req: false },
                    { col: 'المستوى الدراسي',     req: false },
                    { col: 'العنوان',              req: false },
                    { col: 'تاريخ التسجيل',       req: false },
                    { col: 'الحالة',              req: false },
                    { col: 'ملاحظات',             req: false },
                  ].map(({ col, req }) => (
                    <div key={col} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 border-b border-gray-100">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-700 text-[11px] sm:text-xs truncate">{col}</span>
                      {req && <span className="text-red-400 text-[9px] sm:text-[10px] font-bold mr-auto flex-shrink-0">مطلوب</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: preview */}
          {step === 'preview' && file && (
            <div className="space-y-4">
              {/* File card */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-700 rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl flex-shrink-0">
                  📊
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate text-xs sm:text-sm">{file.name}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500">{fmtSize(file.size)} &nbsp;·&nbsp; {file.type || 'application/excel'}</p>
                </div>
                <button
                  onClick={() => { setFile(null); setStep('pick') }}
                  className="text-xs text-red-500 hover:underline border border-red-200 px-2 py-1 rounded-lg flex-shrink-0">
                  تغيير
                </button>
              </div>

              {/* Checklist */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                <p className="font-semibold text-yellow-800 flex items-center gap-2">⚠️ قبل الاستيراد تأكد من:</p>
                {[
                  'الصف الأول يحتوي على رؤوس الأعمدة بالعربية (كما في القالب)',
                  'عمودا "الاسم الأول" و"اللقب" مملوءان لكل طالب',
                  'الجنس مكتوب بـ "ذكر" أو "أنثى"',
                  'الحالة مكتوبة بـ "نشط" أو "في الانتظار" أو "منسحب" أو "متخرج"',
                  'التواريخ بصيغة YYYY-MM-DD (مثال: 2005-03-15)',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-yellow-700 text-xs">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-70 transition">
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الاستيراد…
                  </>
                ) : (
                  <>📥 ابدأ الاستيراد</>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {/* Big result badge */}
              <div className={`rounded-2xl p-4 sm:p-5 text-center border-2 ${
                result.imported > 0
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-200'}`}>
                <div className="text-4xl sm:text-5xl mb-2">{result.imported > 0 ? '🎉' : '⚠️'}</div>
                <p className="text-xl sm:text-2xl font-extrabold text-green-700 mb-1">{result.imported}</p>
                <p className="font-semibold text-gray-700 text-xs sm:text-sm">طالب تم استيراده بنجاح</p>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-b border-red-200">
                    <span className="text-red-600 font-bold text-sm">⚠️</span>
                    <span className="text-red-700 font-semibold text-xs sm:text-sm">{result.errors.length} صف بها أخطاء (لم تُستورد)</span>
                  </div>
                  <ul className="divide-y divide-red-100 max-h-40 overflow-y-auto text-xs text-red-700">
                    {result.errors.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 px-4 py-2">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length === 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  <span>✅</span> لا توجد أخطاء — تم استيراد جميع الصفوف بنجاح!
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <button onClick={onClose}
                  className="w-full sm:flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl text-sm">
                  إغلاق
                </button>
                {result.errors.length > 0 && (
                  <button onClick={() => { setFile(null); setResult(null); setStep('pick') }}
                    className="w-full sm:flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm">
                    إعادة الاستيراد
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────── */
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)

  // State لتتبع كارت الطالب المفتوح في واجهة الموبايل
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null)

  const toggleExpand = (id: number) => {
    setExpandedStudentId(prev => (prev === id ? null : id))
  }

  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: '', birthDate: '', phone: '',
    guardianName: '', guardianPhone: '', educationalLevel: '',
    enrollmentDate: '', status: 'waiting', address: '', notes: '',
  })

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (genderFilter) params.set('gender', genderFilter)
    const res = await fetch(`/api/students?${params}`)
    const data = await res.json()
    setStudents(data)
    setLoading(false)
  }, [search, statusFilter, genderFilter])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  function openAdd() {
    setEditStudent(null)
    setForm({ firstName: '', lastName: '', gender: '', birthDate: '', phone: '', guardianName: '', guardianPhone: '', educationalLevel: '', enrollmentDate: '', status: 'waiting', address: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(s: Student) {
    setEditStudent(s)
    setForm({
      firstName: s.firstName, lastName: s.lastName, gender: s.gender ?? '',
      birthDate: s.birthDate ?? '', phone: s.phone ?? '',
      guardianName: s.guardianName ?? '', guardianPhone: s.guardianPhone ?? '',
      educationalLevel: s.educationalLevel ?? '', enrollmentDate: s.enrollmentDate ?? '',
      status: s.status, address: s.address ?? '', notes: '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editStudent ? `/api/students/${editStudent.id}` : '/api/students'
    const method = editStudent ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast.success(editStudent ? 'تم تحديث بيانات الطالب' : 'تم إضافة الطالب بنجاح')
      setShowModal(false)
      fetchStudents()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleExport() {
    toast.info('جاري تحضير ملف التصدير…')
    const res = await fetch('/api/students/export')
    if (!res.ok) { toast.error('فشل التصدير'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير البيانات بنجاح')
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم حذف الطالب'); fetchStudents() }
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openAdd}
            className="flex-1 sm:flex-none justify-center bg-green-700 hover:bg-green-800 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition">
            + إضافة طالب
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 sm:flex-none justify-center border border-green-600 text-green-700 hover:bg-green-50 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition">
            📥 استيراد من Excel
          </button>
          <button onClick={handleExport}
            className="flex-1 sm:flex-none justify-center border border-blue-600 text-blue-700 hover:bg-blue-50 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition">
            📤 تصدير إلى Excel
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-between md:justify-start">
          <span className="flex items-center gap-2">👨‍🎓 الطلاب</span>
          <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-normal md:hidden">
            العدد: {students.length}
          </span>
        </h1>
      </div>

      {/* Count (Desktop) */}
      <div className="hidden md:flex justify-end mb-3">
        <span className="bg-gray-700 text-white px-4 py-1 rounded-full text-sm flex items-center gap-2">
          👥 إجمالي الطلاب: {students.length}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="sm:col-span-2 relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم أو رقم الطالب…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-9 text-right text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-right focus:outline-none bg-white">
            <option value="">الجنس — الكل</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-right focus:outline-none bg-white">
            <option value="">الحالة — الكل</option>
            <option value="active">نشط</option>
            <option value="waiting">في الانتظار</option>
            <option value="withdrawn">منسحب</option>
            <option value="graduated">متخرج</option>
          </select>
        </div>
        <button onClick={fetchStudents}
          className="mt-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition">
          تصفية
        </button>
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap gap-2 sm:gap-3 items-center">
        <span className="text-gray-600 text-xs sm:text-sm font-medium w-full sm:w-auto">ℹ️ دليل الحالات:</span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Object.entries(statusConfig).map(([key, val]) => (
            <span key={key} className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium ${val.color}`}>
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content Area: Cards for Mobile, Table for Desktop */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">جاري التحميل…</div>
        ) : (
          <>
            {/* ── Desktop Table (md and larger) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 text-right text-gray-600">رقم التسجيل</th>
                    <th className="p-3 text-right text-gray-600">اسم الطالب</th>
                    <th className="p-3 text-right text-gray-600">الجنس</th>
                    <th className="p-3 text-right text-gray-600">المستوى الدراسي</th>
                    <th className="p-3 text-right text-gray-600">الحالة</th>
                    <th className="p-3 text-right text-gray-600">تاريخ التسجيل</th>
                    <th className="p-3 text-right text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono">{s.studentNumber}</span>
                      </td>
                      <td className="p-3 font-medium text-gray-800">{s.firstName} {s.lastName}</td>
                      <td className="p-3 text-gray-600">{s.gender === 'male' ? 'ذكر' : s.gender === 'female' ? 'أنثى' : '—'}</td>
                      <td className="p-3 text-gray-600">{s.educationalLevel || '—'}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[s.status]?.color ?? 'bg-gray-200 text-gray-700'}`}>
                          {statusConfig[s.status]?.label ?? s.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{s.enrollmentDate ?? '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(s.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs">🗑️</button>
                          <button onClick={() => openEdit(s)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs">✏️</button>
                          <Link href={`/students/${s.id}`} className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded text-xs">👁️</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards (smaller than md) ── */}
            <div className="block md:hidden divide-y divide-gray-100">
              {students.map(s => {
                const isExpanded = expandedStudentId === s.id

                return (
                  <div key={s.id} className="transition-all duration-200">
                    
                    {/* الشريط العلوي للبطاقة (يحتوي على رقم التسجيل، الاسم وتحته تاريخ الميلاد بلون باهت، والمثلث أقصى اليسار) */}
                    <div 
                      onClick={() => toggleExpand(s.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono flex-shrink-0">
                          {s.studentNumber}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-800 text-sm truncate">
                            {s.firstName} {s.lastName}
                          </h3>
                          <p className="text-[11px] text-gray-400 font-normal">
                            {s.birthDate ? `تاريخ الميلاد: ${s.birthDate}` : 'تاريخ الميلاد: غير محدد'}
                          </p>
                        </div>
                      </div>

                      {/* مثلث أقصى اليسار */}
                      <button 
                        type="button"
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs flex-shrink-0 transition-transform duration-200"
                        aria-label="عرض التفاصيل"
                      >
                        <span className={`inline-block transition-transform duration-200 ${isExpanded ? 'rotate-180 text-green-700' : ''}`}>
                          ▼
                        </span>
                      </button>
                    </div>

                    {/* التفاصيل والأزرار (تظهر عند الضغط فقط) */}
                    {isExpanded && (
                      <div className="px-3.5 pb-4 space-y-3 bg-gray-50/50 pt-1 border-t border-gray-100/60">
                        
                        {/* شبكة التفاصيل */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          <div>
                            <span className="text-gray-400 block text-[10px] mb-0.5">الحالة</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig[s.status]?.color ?? 'bg-gray-200 text-gray-700'}`}>
                              {statusConfig[s.status]?.label ?? s.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] mb-0.5">الجنس</span>
                            <span>{s.gender === 'male' ? 'ذكر' : s.gender === 'female' ? 'أنثى' : '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] mb-0.5">المستوى الدراسي</span>
                            <span className="truncate block">{s.educationalLevel || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] mb-0.5">تاريخ التسجيل</span>
                            <span>{s.enrollmentDate ?? '—'}</span>
                          </div>
                        </div>

                        {/* أزرار الإجراءات (معاينة، تعديل، حذف) */}
                        <div className="flex items-center gap-2 pt-1">
                          <Link 
                            href={`/students/${s.id}`} 
                            className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1 font-medium text-center transition"
                          >
                            👁️ معاينة
                          </Link>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEdit(s) }} 
                            className="flex-1 justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs flex items-center gap-1 font-medium transition"
                          >
                            ✏️ تعديل
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} 
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-xs flex items-center gap-1 font-medium transition"
                          >
                            🗑️ حذف
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )
              })}
            </div>

            {!loading && students.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">لا يوجد طلاب</div>
            )}
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { fetchStudents(); }}
        />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">{editStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الإسم *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">اللقب *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none bg-white">
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                  <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">تاريخ التسجيل</label>
                  <input type="date" value={form.enrollmentDate} onChange={e => setForm(f => ({ ...f, enrollmentDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">اسم الولي</label>
                  <input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">هاتف الولي</label>
                  <input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                    placeholder="0612345678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none font-mono" />
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">سيُنشأ حساب ولي الأمر تلقائياً</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">المستوى الدراسي</label>
                  <input value={form.educationalLevel} onChange={e => setForm(f => ({ ...f, educationalLevel: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none" />
                </div>
                {editStudent && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none bg-white">
                      <option value="waiting">في الانتظار</option>
                      <option value="active">نشط</option>
                      <option value="withdrawn">منسحب</option>
                      <option value="graduated">متخرج</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="المدينة، الحي، الشارع…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none resize-none" />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="w-full sm:flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-xs sm:text-sm">
                  إلغاء
                </button>
                <button type="submit" className="w-full sm:flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg text-xs sm:text-sm">
                  💾 حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}