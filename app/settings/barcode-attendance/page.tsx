/* eslint-disable react-hooks/static-components -- helper components use controlled inputs only */
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Setting = { key: string; value: string | null }

const DEFAULTS: Record<string, string> = {
  barcode_page_title: 'تحضير الباركود',
  barcode_page_subtitle: 'منصة الفردوس',
  barcode_show_group: 'true',
  barcode_show_student_number: 'true',
  barcode_show_time: 'true',
  barcode_show_stats: 'true',
  barcode_allow_manual_input: 'true',
  barcode_hide_duplicate_from_log: 'true',
  barcode_scan_sound: 'true',
  barcode_success_color: '#22c55e',
  barcode_duplicate_color: '#f59e0b',
  barcode_error_color: '#ef4444',
  barcode_log_show_errors: 'true',
  barcode_excel_export: 'true',
  barcode_excel_include_errors: 'true',
  barcode_scanner_gap_ms: '200',
  barcode_min_code_length: '3',
}

type Section = 'display' | 'behavior' | 'colors' | 'excel' | 'scanner'

const sections: { key: Section; label: string; icon: string; desc: string }[] = [
  { key: 'display',  label: 'العرض والواجهة',    icon: '🖥️', desc: 'ما يظهر على الشاشة' },
  { key: 'behavior', label: 'سلوك المسح',         icon: '⚡', desc: 'كيفية عمل الماسح' },
  { key: 'colors',   label: 'الألوان',            icon: '🎨', desc: 'ألوان حالات المسح' },
  { key: 'excel',    label: 'تصدير Excel',        icon: '📊', desc: 'إعدادات ملف التصدير' },
  { key: 'scanner',  label: 'إعدادات الماسح',     icon: '📡', desc: 'ضبط حساسية الماسح' },
]

export default function BarcodSettingsPage() {
  const [cfg, setCfg] = useState<Record<string, string>>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState<Section>('display')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Setting[]) => {
      const map = { ...DEFAULTS }
      data.forEach(s => { if (s.key && s.value != null) map[s.key] = s.value })
      setCfg(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) => setCfg(prev => ({ ...prev, [k]: v }))
  const toggle = (k: string) => set(k, cfg[k] === 'true' ? 'false' : 'true')
  const on = (k: string) => cfg[k] === 'true'

  async function handleSave() {
    setSaving(true)
    const keys = Object.keys(DEFAULTS)
    await Promise.all(keys.map(k =>
      fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, value: cfg[k] ?? '' }),
      })
    ))
    toast.success('✅ تم حفظ إعدادات صفحة الباركود')
    setSaving(false)
  }

  async function handleReset() {
    setCfg({ ...DEFAULTS })
    toast.info('تم إعادة التعيين — اضغط حفظ للتطبيق')
  }

  /* ── shared field components ── */
  const Toggle = ({ k, label, desc }: { k: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-medium text-gray-800 text-sm">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => toggle(k)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${on(k) ? 'bg-green-500' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on(k) ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  )

  const Field = ({ k, label, desc, type = 'text' }: { k: string; label: string; desc?: string; type?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {desc && <p className="text-xs text-gray-400 mb-1.5">{desc}</p>}
      <input type={type} value={cfg[k] ?? ''} onChange={e => set(k, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
    </div>
  )

  const ColorField = ({ k, label, desc }: { k: string; label: string; desc?: string }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input type="color" value={cfg[k] ?? '#22c55e'} onChange={e => set(k, e.target.value)}
          className="w-10 h-9 rounded border border-gray-300 cursor-pointer p-0.5" />
        <input value={cfg[k] ?? ''} onChange={e => set(k, e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono w-24 focus:outline-none focus:ring-1 focus:ring-green-400" />
        <div className="w-7 h-7 rounded-full border-2 border-white shadow-md" style={{ background: cfg[k] }} />
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/settings" className="hover:text-green-600 transition-colors">⚙️ الإعدادات</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">تحضير الباركود</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📟</span> إعدادات صفحة تحضير الباركود
          </h1>
          <p className="text-gray-500 text-sm mt-1">تخصيص واجهة وسلوك صفحة <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/barcode-attendance</code></p>
        </div>
        <Link href="/barcode-attendance"
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-green-600 text-green-700 hover:bg-green-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 0 0 4 4 0 0 1 1-2.83"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          معاينة الصفحة
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActive(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-right transition-colors border-b border-gray-100 last:border-0 ${
                  active === s.key
                    ? 'bg-green-50 text-green-700 font-bold border-r-4 border-r-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span className="text-base">{s.icon}</span>
                <div className="min-w-0">
                  <p className="truncate">{s.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

            {/* ── Display ── */}
            {active === 'display' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center gap-2">🖥️ إعدادات العرض والواجهة</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field k="barcode_page_title" label="عنوان الصفحة" desc="يظهر في الهيدر العلوي" />
                  <Field k="barcode_page_subtitle" label="النص الفرعي" desc="تحت العنوان الرئيسي" />
                </div>
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-semibold text-gray-600">عناصر شاشة نتيجة المسح</p>
                  <Toggle k="barcode_show_group"          label="إظهار اسم الفوج"           desc="يظهر اسم فوج الطالب تحت اسمه" />
                  <Toggle k="barcode_show_student_number" label="إظهار رقم الطالب"          desc="الرقم التعريفي للطالب" />
                  <Toggle k="barcode_show_time"           label="إظهار وقت المسح"           desc="الوقت الذي سُجّل فيه الحضور" />
                  <Toggle k="barcode_show_stats"          label="إظهار شريط الإحصائيات"     desc="الأعداد أعلى شاشة المسح" />
                </div>
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-semibold text-gray-600">سجل المسح (الشريط الجانبي)</p>
                  <Toggle k="barcode_hide_duplicate_from_log" label="إخفاء المكررات من السجل"  desc="لا تضاف المسوحات المكررة للقائمة" />
                  <Toggle k="barcode_log_show_errors"         label="إظهار الأخطاء في السجل"  desc="عرض الأرقام غير الموجودة في السجل" />
                </div>
              </>
            )}

            {/* ── Behavior ── */}
            {active === 'behavior' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center gap-2">⚡ سلوك المسح</h2>
                <div className="space-y-3">
                  <Toggle k="barcode_allow_manual_input" label="السماح بالإدخال اليدوي"   desc="عرض خانة إدخال رقم الطالب يدوياً" />
                  <Toggle k="barcode_scan_sound"         label="صوت عند المسح"             desc="تشغيل نغمة عند كل مسح ناجح" />
                </div>
              </>
            )}

            {/* ── Colors ── */}
            {active === 'colors' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center gap-2">🎨 ألوان حالات المسح</h2>
                <div className="space-y-4">
                  <ColorField k="barcode_success_color"   label="لون الحضور الناجح ✅"    desc="عند تسجيل حضور الطالب بنجاح" />
                  <div className="border-t border-gray-100" />
                  <ColorField k="barcode_duplicate_color" label="لون المسح المكرر ⚠️"     desc="عند إعادة مسح طالب مسجّل مسبقاً" />
                  <div className="border-t border-gray-100" />
                  <ColorField k="barcode_error_color"     label="لون الخطأ ❌"             desc="عند مسح رقم غير موجود في النظام" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mt-2">
                  <p className="text-xs text-gray-500 mb-3 font-medium">معاينة الألوان</p>
                  <div className="flex gap-3">
                    {[
                      { k: 'barcode_success_color',   label: '✅ حاضر' },
                      { k: 'barcode_duplicate_color', label: '⚠️ مكرر' },
                      { k: 'barcode_error_color',     label: '❌ خطأ' },
                    ].map(c => (
                      <div key={c.k} className="flex-1 rounded-xl py-4 flex flex-col items-center gap-1 text-sm font-bold text-white"
                        style={{ background: cfg[c.k], opacity: 0.9 }}>
                        <span className="text-xl">{c.label.split(' ')[0]}</span>
                        <span className="text-xs">{c.label.split(' ')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Excel ── */}
            {active === 'excel' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center gap-2">📊 إعدادات تصدير Excel</h2>
                <div className="space-y-3">
                  <Toggle k="barcode_excel_export"          label="تفعيل زر تصدير Excel"     desc="إظهار زر التصدير في سجل المسح" />
                  <Toggle k="barcode_excel_include_errors"  label="تضمين سجلات الأخطاء"     desc="إضافة قسم الأرقام الخاطئة في الملف" />
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-1">
                  <p className="font-semibold">📋 محتوى ملف Excel</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-green-700">
                    <li>عنوان الجلسة والتاريخ</li>
                    <li>ملخص إحصائي (حاضرون / أخطاء / إجمالي)</li>
                    <li>جدول الطلاب الحاضرين: الرقم، الاسم، الفوج، وقت المسح</li>
                    {on('barcode_excel_include_errors') && <li>قسم الأرقام غير المعروفة باللون الأحمر</li>}
                  </ul>
                </div>
              </>
            )}

            {/* ── Scanner ── */}
            {active === 'scanner' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center gap-2">📡 إعدادات الماسح</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
                  ⚠️ هذه إعدادات تقنية متقدمة — لا تعدّلها إلا إذا كان الماسح لا يعمل بشكل صحيح.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field k="barcode_scanner_gap_ms"    label="الفاصل الزمني بين المفاتيح (ms)"  type="number"
                    desc="الوقت الأقصى بين ضربات المفاتيح من الماسح (افتراضي: 200)" />
                  <Field k="barcode_min_code_length"   label="الحد الأدنى لطول الكود"           type="number"
                    desc="الحد الأدنى لعدد الأحرف حتى يُعالَج الكود (افتراضي: 3)" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1 mt-2">
                  <p className="font-semibold text-gray-700">كيف تعمل هذه الإعدادات؟</p>
                  <p>الماسح يرسل أحرف الباركود بسرعة متتالية ثم يرسل Enter. إذا تجاوز الوقت بين حرفين <strong>{cfg.barcode_scanner_gap_ms}ms</strong> يبدأ كود جديد. إذا كان طول الكود أقل من <strong>{cfg.barcode_min_code_length}</strong> أحرف يُتجاهل.</p>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
                : <><span>💾</span> حفظ الإعدادات</>}
            </button>
            <button onClick={handleReset} type="button"
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              إعادة التعيين
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
