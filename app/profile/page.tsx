'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type ProfileData = {
  id: number; role: string; username: string; fullName: string | null
  email: string | null; phone: string | null; profession: string | null
  educationLevel: string | null; status: string
}

const EDUCATION_LEVELS = [
  'ابتدائي', 'متوسط', 'ثانوي', 'تقني/تكوين مهني',
  'بكالوريوس', 'ليسانس', 'ماستر', 'دكتوراه', 'أخرى',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', profession: '', educationLevel: '',
  })
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/profile')
    if (!res.ok) { setLoading(false); return }
    const data: ProfileData = await res.json()
    setProfile(data)
    setForm({
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      profession: data.profession ?? '',
      educationLevel: data.educationLevel ?? '',
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('تم تحديث البيانات الشخصية بنجاح')
      load()
    } else {
      toast.error(data.error ?? 'فشل الحفظ')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقتين')
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('تم تغيير كلمة المرور بنجاح')
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      toast.error(data.error ?? 'فشل تغيير كلمة المرور')
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">جاري التحميل...</div>
  if (!profile) return <div className="text-center py-20 text-red-500">تعذّر تحميل بيانات الملف الشخصي</div>

  const roleLabel: Record<string, string> = { admin: 'مدير', teacher: 'معلم', guardian: 'ولي أمر' }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>👤</span> الملف الشخصي
      </h1>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {(profile.fullName ?? profile.username)[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{profile.fullName ?? profile.username}</h2>
          <p className="text-sm text-gray-500 font-mono">{profile.username}</p>
          <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {roleLabel[profile.role] ?? profile.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { key: 'info', label: '✏️ البيانات الشخصية' },
          { key: 'password', label: '🔒 تغيير كلمة المرور' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as 'info' | 'password')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-green-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <form onSubmit={handleSaveInfo} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
            <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="0555 000 000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المهنة</label>
            <input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="مثال: مهندس، معلم، طبيب..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المستوى التعليمي</label>
            <select value={form.educationLevel} onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">-- اختر المستوى --</option>
              {EDUCATION_LEVELS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60 mt-2">
            {saving ? 'جاري الحفظ...' : '💾 حفظ البيانات'}
          </button>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            ⚠️ بعد تغيير كلمة المرور ستحتاج إلى تسجيل الدخول مجدداً
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
            <input type="password" value={pwdForm.currentPassword}
              onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
              required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="أدخل كلمة مرورك الحالية" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
            <input type="password" value={pwdForm.newPassword}
              onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
              required minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input type="password" value={pwdForm.confirmPassword}
              onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="أعد إدخال كلمة المرور الجديدة" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60 mt-2">
            {saving ? 'جاري التغيير...' : '🔒 تغيير كلمة المرور'}
          </button>
        </form>
      )}
    </div>
  )
}
