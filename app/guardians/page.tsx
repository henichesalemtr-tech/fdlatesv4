'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type GuardianUser = {
  id: number
  username: string
  fullName: string | null
  phone: string | null
  profession: string | null
  status: string
  createdAt: string
  students: {
    id: number
    studentNumber: string
    firstName: string
    lastName: string
    status: string
  }[]
}

const studentStatusLabel: Record<string, string> = {
  active: 'نشط', waiting: 'انتظار', withdrawn: 'منسحب', graduated: 'متخرج',
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<GuardianUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  const fetchGuardians = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/guardians?${params}`)
    const data = await res.json()
    setGuardians(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchGuardians() }, [fetchGuardians])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/guardians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('تم إنشاء حساب ولي الأمر بنجاح — كلمة المرور هي رقم هاتفه')
      setShowModal(false)
      setForm({ fullName: '', phone: '' })
      fetchGuardians()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`هل تريد حذف حساب ولي الأمر "${name}"؟ سيتم إلغاء ربطه بأبنائه.`)) return
    const res = await fetch(`/api/guardians/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('تم حذف حساب ولي الأمر')
      fetchGuardians()
    }
  }

  function toggleCard(id: number) {
    setExpandedCard(expandedCard === id ? null : id)
  }

  // تجهيز نص الرسالة الثابت
  function getMessageBody(phone: string) {
    const cleanPhone = phone.replace(/\s+/g, '')
    return `السلام عليكم ورحمة الله وبركاته،
مرحبًا بكم في منصة الفردوس
فيما يلي بيانات الدخول إلى بوابة الاولياء:
🔹 رابط المنصة: ferdaous-debila.com
🔹 اسم المستخدم: ${cleanPhone}
🔹 كلمة المرور: ${cleanPhone}

تنبيه أمني: حفاظًا على خصوصية حسابكم، يُرجى تغيير كلمة المرور فور تسجيل الدخول لأول مرة.`
  }

  // دالة تحويل الرقم لإضافة رمز البلد الجزائر (+213) لرابط الواتساب فقط
  function formatPhoneForWhatsApp(phone: string) {
    let clean = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) {
      clean = '213' + clean.slice(1)
    }
    return clean
  }

  // رابط واتساب
  function getWhatsAppLink(phone: string | null) {
    if (!phone) return '#'
    const waPhone = formatPhoneForWhatsApp(phone)
    const message = getMessageBody(phone)
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
  }

  // رابط الرسائل النصية SMS
  function getSmsLink(phone: string | null) {
    if (!phone) return '#'
    const cleanPhone = phone.replace(/\s+/g, '')
    const message = getMessageBody(phone)
    return `sms:${cleanPhone}?body=${encodeURIComponent(message)}`
  }

  return (
    <div dir="rtl" className="w-full max-w-full overflow-x-hidden p-2 sm:p-4">
      {/* Top Action Bar */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition-colors border border-gray-200"
        >
          <span>➔</span>
          <span>الرجوع إلى لوحة التحكم</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto transition-colors"
        >
          <span>+</span> إضافة ولي أمر
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-between sm:justify-start">
          <span className="flex items-center gap-2">
            <span>👪</span> أولياء الأمور
          </span>
        </h1>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 text-xs sm:text-sm text-blue-700">
        <strong>ملاحظة:</strong> يتم إنشاء حسابات أولياء الأمور تلقائياً عند إضافة طالب جديد برقم هاتف ولي أمره. كلمة المرور هي رقم الهاتف.
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button onClick={fetchGuardians} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            بحث
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-end mb-3">
        <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-2">
          <span>👪</span> إجمالي أولياء الأمور: {guardians.length}
        </span>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : guardians.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">👪</p>
            <p>لا يوجد أولياء أمور مسجلون</p>
            <p className="text-xs mt-2 text-gray-400">يتم إضافتهم تلقائياً عند تسجيل الطلاب برقم هاتف ولي الأمر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-right text-gray-600">الاسم</th>
                  <th className="p-3 text-right text-gray-600">اسم المستخدم</th>
                  <th className="p-3 text-right text-gray-600">المهنة</th>
                  <th className="p-3 text-right text-gray-600">الأبناء المرتبطون</th>
                  <th className="p-3 text-right text-gray-600">الحالة</th>
                  <th className="p-3 text-right text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guardians.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">{g.fullName ?? '-'}</td>
                    <td className="p-3">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{g.username}</span>
                    </td>
                    <td className="p-3">
                      {g.profession
                        ? <span className="text-gray-700 text-sm">{g.profession}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="p-3">
                      {g.students.length === 0 ? (
                        <span className="text-gray-400 text-xs">لا يوجد أبناء مرتبطون</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {g.students.map(s => (
                            <span key={s.id} className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                              {s.firstName} {s.lastName}
                              <span className="text-gray-500 mr-1">({studentStatusLabel[s.status] ?? s.status})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {g.status === 'active' ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(g.id, g.fullName ?? g.username)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <p>جاري التحميل...</p>
          </div>
        ) : guardians.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">👪</p>
            <p>لا يوجد أولياء أمور مسجلون</p>
            <p className="text-xs mt-2 text-gray-400">يتم إضافتهم تلقائياً عند تسجيل الطلاب برقم هاتف ولي الأمر</p>
          </div>
        ) : (
          guardians.map(g => {
            const isExpanded = expandedCard === g.id
            return (
              <div
                key={g.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                {/* Card Header */}
                <div
                  onClick={() => toggleCard(g.id)}
                  className="p-3 flex items-center justify-between cursor-pointer select-none gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg shrink-0">
                      👤
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-xs sm:text-sm truncate">
                        {g.fullName ?? 'بدون اسم'}
                      </p>
                      <p className="font-mono text-[11px] text-gray-500 truncate">
                        {g.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                      g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {g.status === 'active' ? 'نشط' : 'معطّل'}
                    </span>
                    <span className={`text-gray-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                    {g.profession && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                        <span className="text-blue-500 text-xs">💼</span>
                        <span className="text-xs text-blue-800 font-medium">{g.profession}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-2">الأبناء المرتبطون ({g.students.length}):</p>
                      {g.students.length === 0 ? (
                        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 text-center">لا يوجد أبناء مرتبطون</p>
                      ) : (
                        <div className="space-y-1.5">
                          {g.students.map(s => (
                            <div key={s.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs font-medium text-gray-800">{s.firstName} {s.lastName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-green-200 text-green-700 font-medium">
                                {studentStatusLabel[s.status] ?? s.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* الأزرار الاربعة (اتصال - واتساب - SMS - حذف) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {g.phone && (
                        <>
                          {/* زر الاتصال */}
                          <a
                            href={`tel:${g.phone}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>📞</span>
                            <span>اتصال</span>
                          </a>

                          {/* زر الواتساب برمز الدولة التلقائي */}
                          <a
                            href={getWhatsAppLink(g.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>💬</span>
                            <span>واتساب</span>
                          </a>

                          {/* زر رسالة SMS */}
                          <a
                            href={getSmsLink(g.phone)}
                            className="bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>✉️</span>
                            <span>رسالة SMS</span>
                          </a>
                        </>
                      )}

                      {/* زر الحذف */}
                      <button
                        onClick={() => handleDelete(g.id, g.fullName ?? g.username)}
                        className={`${g.phone ? '' : 'col-span-2'} bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors`}
                      >
                        <span>🗑️</span>
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">إضافة ولي أمر</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">رقم الهاتف * (يُستخدم كاسم مستخدم وكلمة مرور)</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0612345678"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono"
                  required
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                سيتم إنشاء حساب بـ: اسم المستخدم = رقم الهاتف / كلمة المرور = رقم الهاتف
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-lg text-xs sm:text-sm transition-colors">
                  💾 إنشاء الحساب
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-2 rounded-lg text-xs sm:text-sm transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
