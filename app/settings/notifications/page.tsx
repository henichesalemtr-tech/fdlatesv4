/* eslint-disable react-hooks/static-components -- helper components use controlled inputs only */
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Setting = { key: string; value: string | null }

const DEFAULTS = {
  notif_absent_title:   'إشعار غياب — {student_name}',
  notif_absent_body:    'السلام عليكم ورحمة الله.\nنُعلمكم بأن ابنكم/ابنتكم {student_name} ({student_number}) تغيّب(ت) عن الحصة بتاريخ {date}.\nيرجى التواصل مع الإدارة إذا لزم الأمر.\nجزاكم الله خيراً.',
  notif_late_title:     'إشعار تأخر — {student_name}',
  notif_late_body:      'السلام عليكم ورحمة الله.\nنُعلمكم بأن ابنكم/ابنتكم {student_name} ({student_number}) تأخر(ت) عن الحصة بتاريخ {date}.\nنرجو الحرص على الالتزام بالمواعيد.',
  notif_absent_enabled: 'true',
  notif_late_enabled:   'true',
  notif_push_enabled:   'true',
  notif_inapp_enabled:  'true',
}

const VARS = [
  { code: '{student_name}',   desc: 'اسم الطالب كاملاً' },
  { code: '{student_number}', desc: 'رقم تسجيل الطالب' },
  { code: '{date}',           desc: 'تاريخ الغياب/التأخر' },
  { code: '{guardian_name}',  desc: 'اسم ولي الأمر' },
]

/* ── Preview: replace variables with demo values ── */
function preview(text: string) {
  return text
    .replace(/\{student_name\}/g, 'محمد بن علي')
    .replace(/\{student_number\}/g, 'FD0012')
    .replace(/\{date\}/g, new Date().toLocaleDateString('ar-DZ'))
    .replace(/\{guardian_name\}/g, 'الحاج بن علي')
    .replace(/\n/g, '<br/>')
}

export default function NotificationSettingsPage() {
  const [s, setS] = useState<Record<string, string>>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'absent' | 'late' | 'channels'>('absent')
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Setting[]) => {
      const map = { ...DEFAULTS }
      data.forEach(item => { if (item.key in DEFAULTS && item.value) map[item.key as keyof typeof DEFAULTS] = item.value })
      setS(map)
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await Promise.all(
      Object.entries(s).map(([key, value]) =>
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
      )
    )
    toast.success('✅ تم حفظ إعدادات الإشعارات بنجاح')
    setSaving(false)
  }

  function toggle(key: string) {
    setS(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }))
  }

  const Toggle = ({ k, label, desc }: { k: string; label: string; desc: string }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => toggle(k)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${s[k] === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${s[k] === 'true' ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400">جاري التحميل...</div>
  )

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          ← الإعدادات
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>🔔</span> إعدادات الإشعارات التلقائية
        </h1>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700 flex gap-3">
        <span className="text-lg flex-shrink-0">ℹ️</span>
        <div>
          <p className="font-semibold mb-1">كيف تعمل الإشعارات التلقائية؟</p>
          <p className="text-xs leading-relaxed">
            عند تسجيل غياب أو تأخر الطالب من صفحة الحضور، يمكن إرسال إشعار تلقائي لولي أمره عبر
            <strong> الإشعارات الداخلية</strong> و<strong>إشعارات المتصفح (Web Push)</strong>.
            يمكنك هنا تخصيص نص العنوان والرسالة باستخدام المتغيرات المتاحة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right: form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {[
              { key: 'absent',   label: '🔴 إشعار الغياب' },
              { key: 'late',     label: '🟡 إشعار التأخر' },
              { key: 'channels', label: '📡 قنوات الإرسال' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-600 text-green-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{tab.label}</button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

            {/* ── Absent tab ── */}
            {activeTab === 'absent' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                    قالب إشعار الغياب
                  </h2>
                  <Toggle k="notif_absent_enabled" label="" desc="" />
                </div>

                {s.notif_absent_enabled !== 'true' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    ⚠️ إشعارات الغياب معطّلة حالياً — لن يُرسَل أي إشعار عند تسجيل الغياب
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    عنوان الإشعار
                    <span className="text-xs text-gray-400 font-normal mr-2">يظهر كعنوان الإشعار في المتصفح</span>
                  </label>
                  <input
                    value={s.notif_absent_title}
                    onChange={e => setS(p => ({ ...p, notif_absent_title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="عنوان إشعار الغياب"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    نص الرسالة
                    <span className="text-xs text-gray-400 font-normal mr-2">نص الإشعار الكامل</span>
                  </label>
                  <textarea
                    value={s.notif_absent_body}
                    onChange={e => setS(p => ({ ...p, notif_absent_body: e.target.value }))}
                    rows={5}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                    placeholder="نص رسالة الغياب..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setS(p => ({ ...p, notif_absent_title: DEFAULTS.notif_absent_title, notif_absent_body: DEFAULTS.notif_absent_body }))}
                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  ↩️ إعادة تعيين للنص الافتراضي
                </button>
              </>
            )}

            {/* ── Late tab ── */}
            {activeTab === 'late' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                    قالب إشعار التأخر
                  </h2>
                  <Toggle k="notif_late_enabled" label="" desc="" />
                </div>

                {s.notif_late_enabled !== 'true' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    ⚠️ إشعارات التأخر معطّلة حالياً
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان الإشعار</label>
                  <input
                    value={s.notif_late_title}
                    onChange={e => setS(p => ({ ...p, notif_late_title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="عنوان إشعار التأخر"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">نص الرسالة</label>
                  <textarea
                    value={s.notif_late_body}
                    onChange={e => setS(p => ({ ...p, notif_late_body: e.target.value }))}
                    rows={5}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                    placeholder="نص رسالة التأخر..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setS(p => ({ ...p, notif_late_title: DEFAULTS.notif_late_title, notif_late_body: DEFAULTS.notif_late_body }))}
                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  ↩️ إعادة تعيين للنص الافتراضي
                </button>
              </>
            )}

            {/* ── Channels tab ── */}
            {activeTab === 'channels' && (
              <>
                <h2 className="text-base font-bold text-gray-800">📡 قنوات إرسال الإشعارات</h2>
                <p className="text-xs text-gray-500 -mt-2">
                  اختر القنوات التي ترسل عبرها الإشعارات التلقائية لأولياء الأمور
                </p>
                <div className="space-y-3">
                  <Toggle
                    k="notif_inapp_enabled"
                    label="الإشعارات الداخلية (داخل التطبيق)"
                    desc="تُحفَظ في قائمة إشعارات ولي الأمر داخل لوحة التحكم"
                  />
                  <Toggle
                    k="notif_push_enabled"
                    label="إشعارات المتصفح (Web Push)"
                    desc="تصل للجهاز مباشرة حتى لو كان المتصفح مغلقاً — تتطلب تفعيل الإشعارات من المتصفح"
                  />
                </div>
                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-700">
                  <p className="font-semibold mb-1">💡 ملاحظة</p>
                  <p>لكي تصل إشعارات المتصفح، يجب على ولي الأمر تفعيل الإشعارات من صفحة لوحة تحكمه (زر &quot;تفعيل إشعارات النظام&quot;).</p>
                </div>
              </>
            )}

          </div>

          {/* Variables reference */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>📌</span> المتغيرات المتاحة في القوالب
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {VARS.map(v => (
                <div key={v.code} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <code className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono text-green-700">{v.code}</code>
                  <span className="text-xs text-gray-500">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> جاري الحفظ...</>
              : '💾 حفظ الإعدادات'
            }
          </button>
        </div>

        {/* Left: live preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <span>👁️</span> معاينة مباشرة
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setPreviewMode(false)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${!previewMode ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-400 hover:bg-gray-100'}`}>
                  غياب
                </button>
                <button onClick={() => setPreviewMode(true)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${previewMode ? 'bg-yellow-100 text-yellow-700 font-semibold' : 'text-gray-400 hover:bg-gray-100'}`}>
                  تأخر
                </button>
              </div>
            </div>

            {/* Browser notification mockup */}
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-gray-800 px-3 py-1.5 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-gray-400 text-xs mr-2">إشعار المتصفح</span>
              </div>
              <div className="bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">🔔</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 leading-tight mb-1">
                      {preview(!previewMode ? s.notif_absent_title : s.notif_late_title)}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: preview((!previewMode ? s.notif_absent_body : s.notif_late_body).slice(0, 100) + '...') }} />
                  </div>
                </div>
              </div>
            </div>

            {/* In-app notification mockup */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">إشعار داخلي (لوحة التحكم)</p>
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm">🔔</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 mb-0.5"
                      dangerouslySetInnerHTML={{ __html: preview(!previewMode ? s.notif_absent_title : s.notif_late_title) }} />
                    <p className="text-xs text-gray-400 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: preview((!previewMode ? s.notif_absent_body : s.notif_late_body).split('\n')[0]) }} />
                    <p className="text-xs text-gray-300 mt-1">الآن</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status summary */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500">حالة الإشعارات</p>
              {[
                { label: 'إشعار الغياب', enabled: s.notif_absent_enabled === 'true', color: 'red' },
                { label: 'إشعار التأخر', enabled: s.notif_late_enabled === 'true', color: 'yellow' },
                { label: 'إشعارات داخلية', enabled: s.notif_inapp_enabled === 'true', color: 'blue' },
                { label: 'Web Push', enabled: s.notif_push_enabled === 'true', color: 'green' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {item.enabled ? '✅ مفعّل' : '⏸ معطّل'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
