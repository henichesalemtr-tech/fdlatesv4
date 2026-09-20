'use client'
import { useState, useEffect } from 'react'

type Course = {
  id: number
  name: string
  description: string | null
  educationLevel: string | null
  startDate: string | null
  endDate: string | null
  capacity: number | null
  price: number | null
}

const EDUCATION_LEVELS = [
  'أولى ابتدائي', 'ثانية ابتدائي', 'ثالثة ابتدائي', 'رابعة ابتدائي', 'خامسة ابتدائي',
  'أولى متوسط', 'ثانية متوسط', 'ثالثة متوسط', 'رابعة متوسط',
  'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي',
  'جامعي', 'غير ذلك',
]
const EMPTY_FORM = {
  firstName: '', lastName: '', guardianName: '', guardianPhone: '', educationLevel: '', notes: ''
}

export default function CourseRegPage() {
  const [loading, setLoading]       = useState(true)
  const [enabled, setEnabled]       = useState(true)
  const [courses, setCourses]       = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/coursereg')
      .then(r => r.json())
      .then(data => {
        setEnabled(data.enabled)
        setCourses(data.courses ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function submit() {
    if (!selectedCourse) { setError('الرجاء اختيار الدورة'); return }
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('الاسم واللقب مطلوبان'); return }
    setError(null)
    setSubmitting(true)
    try {
      const r = await fetch('/api/coursereg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, courseId: selectedCourse.id }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'خطأ في الإرسال'); return }
      setSubmitted(true)
    } catch { setError('حدث خطأ، الرجاء المحاولة مجدداً') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div dir="rtl" className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">تم استلام طلبك</h1>
          <p className="text-gray-600 mb-1">
            تم تسجيل طلبك في دورة: <strong>{selectedCourse?.name}</strong>
          </p>
          <p className="text-sm text-gray-400 mt-4">سيتم التواصل معك قريباً لتأكيد التسجيل</p>
          <button
            onClick={() => { setSubmitted(false); setSelectedCourse(null); setForm(EMPTY_FORM) }}
            className="mt-6 bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
          >تسجيل جديد</button>
        </div>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div dir="rtl" className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">التسجيل مغلق حالياً</h1>
          <p className="text-gray-500 text-sm">يرجى التواصل مع إدارة منصة الفردوس للمزيد من المعلومات</p>
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">لا توجد دورات متاحة</h1>
          <p className="text-gray-500 text-sm">لا توجد دورات مفتوحة للتسجيل في الوقت الحالي</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-700 rounded-2xl text-white text-3xl mb-4 shadow-lg">
            📚
          </div>
          <h1 className="text-3xl font-bold text-green-800">منصة الفردوس</h1>
          <p className="text-gray-600 mt-2">استمارة التسجيل في الدورات التعليمية</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Course Selection */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">🎯 اختر الدورة</h2>
            <div className="space-y-2">
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(selectedCourse?.id === c.id ? null : c)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    selectedCourse?.id === c.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-100 bg-gray-50 hover:border-green-200 hover:bg-green-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {c.educationLevel && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c.educationLevel}</span>
                        )}
                        {c.startDate && (
                          <span className="text-xs text-gray-400">📅 {c.startDate}</span>
                        )}
                        {c.price != null && c.price > 0 && (
                          <span className="text-xs text-gray-400">💰 {c.price} دج</span>
                        )}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                      selectedCourse?.id === c.id ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {selectedCourse?.id === c.id && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Registration Form */}
          <div className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">📝 بيانات المتقدم</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الأول *</label>
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="الاسم الأول"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللقب *</label>
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="اللقب"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المستوى الدراسي</label>
                <select
                  value={form.educationLevel}
                  onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— اختر المستوى —</option>
                  {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم ولي الأمر</label>
                <input
                  value={form.guardianName}
                  onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="اسم ولي الامر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف ولي الأمر *</label>
                <input
                  type="tel"
                  value={form.guardianPhone}
                  onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  ⚠️ {error}
                </div>
              )}
              <button
                onClick={submit}
                disabled={submitting || !selectedCourse}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold text-base transition-colors shadow-sm"
              >
                {submitting ? 'جاري الإرسال...' : ' إرسال طلب التسجيل'}
              </button>
              {!selectedCourse && (
                <p className="text-center text-xs text-gray-400">يرجى اختيار الدورة أولاً</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">جميع الحقوق محفوظة — مؤسسة الفردوس فرع الدبيلة © 2026 </p>
      </div>
    </div>
  )
}
