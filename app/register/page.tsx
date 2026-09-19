'use client'
import { useState } from 'react'

type FormData = {
  firstName: string; lastName: string; gender: string
  birthDate: string; birthPlace: string; address: string
  phone: string; educationalLevel: string
  guardianName: string; guardianPhone: string; guardianRelation: string
  guardianEmail: string; notes: string
}

const INITIAL: FormData = {
  firstName: '', lastName: '', gender: '', birthDate: '', birthPlace: '',
  address: '', phone: '', educationalLevel: '',
  guardianName: '', guardianPhone: '', guardianRelation: '', guardianEmail: '', notes: '',
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function Field({ label, name, type = 'text', value, onChange, required = false }:
  { label: string; name: keyof FormData; type?: string; value: string; onChange: (k: keyof FormData, v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(name, e.target.value)}
        className={inputCls} required={required} />
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState('')

  function setField(k: keyof FormData, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/registration-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.status === 403) {
        const data = await res.json()
        if (data.error === 'registration_closed') { setClosed(true); return }
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'حدث خطأ، يرجى المحاولة مجدداً')
        return
      }
      setSubmitted(true)
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  if (closed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">التسجيل مغلق حالياً</h2>
          <p className="text-gray-500 text-sm">نظراً لاكتمال جميع الأفواج</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-3">تم إرسال طلب التسجيل بنجاح</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            طلبكم الآن في قائمة الانتظار وسيتم التواصل معكم من طرف الإدارة في أقرب وقت لتأكيد التسجيل.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-800">طلب تسجيل إلكتروني</h1>
          <p className="text-gray-500 text-sm mt-1">يرجى تعبئة جميع البيانات المطلوبة</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* بيانات الطالب */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">١</span>
              بيانات الطالب
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الإسم " name="firstName" value={form.firstName} onChange={setField} required />
              <Field label="اللقب" name="lastName" value={form.lastName} onChange={setField} required />
              <div>
                <label className={labelCls}>الجنس</label>
                <select value={form.gender} onChange={e => setField('gender', e.target.value)} className={inputCls}>
                  <option value="">-- اختر --</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <Field label="تاريخ الميلاد" name="birthDate" type="date" value={form.birthDate} onChange={setField} />
              <Field label="مكان الميلاد" name="birthPlace" value={form.birthPlace} onChange={setField} />
              <Field label="المستوى الدراسي" name="educationalLevel" value={form.educationalLevel} onChange={setField} />
              <div className="sm:col-span-2">
                <Field label="العنوان" name="address" value={form.address} onChange={setField} />
              </div>
              <Field label="رقم الهاتف" name="phone" type="tel" value={form.phone} onChange={setField} />
            </div>
          </div>

          {/* بيانات ولي الأمر */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">٢</span>
              بيانات ولي الأمر
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="اسم ولي الأمر" name="guardianName" value={form.guardianName} onChange={setField} required />
              <Field label="صلة القرابة" name="guardianRelation" value={form.guardianRelation} onChange={setField} />
              <Field label="رقم هاتف ولي الأمر" name="guardianPhone" type="tel" value={form.guardianPhone} onChange={setField} required />
              <Field label="البريد الإلكتروني" name="guardianEmail" type="email" value={form.guardianEmail} onChange={setField} />
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className={labelCls}>ملاحظات إضافية</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)}
              rows={3} className={inputCls + ' resize-none'} placeholder="أي معلومات إضافية..." />
          </div>

          {/* الوثائق المطلوبة */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-2">في حالة تم قبول التسجيل يتعين عليك إحضار الوثائق التالية:</p>
            <ul className="space-y-1 list-none">
              <li>• شهادة ميلاد</li>
              <li>• صورتين شمسيتين</li>
              <li>• <a href="https://docs.google.com/document/d/14UIWrWsx7ho7hVQgtkn__V8E_SaFyCmY/edit?usp=drive_link&ouid=101886799465417640898&rtpof=true&sd=true">تصريح أبوي (إضغط هنا لتحميل النموذج)</a></li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جاري الإرسال...</>
            ) : '📩 إرسال الطلب'}
          </button>
        </form>
      </div>
    </div>
  )
}
