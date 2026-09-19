'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Setting = { key: string; value: string | null }

type ArchiveRow = {
  id: number
  academicYear: string | null
  seasonStart: string | null
  seasonEnd: string | null
  totalPoints: number | null
  totalPresent: number | null
  totalAbsent: number | null
  totalLate: number | null
  totalExcused: number | null
  memoSessionsCount: number | null
  archivedAt: string | null
  studentId: number
  studentNumber: string | null
  firstName: string
  lastName: string
  studentStatus: string | null
  groupName: string | null
}

const DEFAULT_SETTINGS: Record<string, string> = {
  // Landing page
  landing_enabled: 'false',
  landing_title: 'منصة الفردوس',
  landing_subtitle: 'منصة إدارة المدارس القرآنية',
  landing_description: 'نظام متكامل لإدارة الطلاب والمعلمين والحضور والغياب والمتابعة الأكاديمية في المدارس القرآنية',
  landing_show_stats: 'true',
  landing_stat1_label: 'طالب مسجّل', landing_stat1_value: '374+',
  landing_stat2_label: 'معلم متخصص', landing_stat2_value: '12',
  landing_stat3_label: 'فوج دراسي', landing_stat3_value: '14',
  landing_feature1_title: 'إدارة الطلاب', landing_feature1_desc: 'تسجيل وتتبع بيانات الطلاب وأولياء أمورهم بسهولة تامة', landing_feature1_icon: '👨‍🎓',
  landing_feature2_title: 'الحضور والغياب', landing_feature2_desc: 'تحضير يدوي، QR، وباركود مع إشعارات فورية لأولياء الأمور', landing_feature2_icon: '📋',
  landing_feature3_title: 'تقييم الحفظ', landing_feature3_desc: 'تسجيل ومتابعة تقدم الطالب في حفظ وتجويد القرآن الكريم', landing_feature3_icon: '📖',
  landing_feature4_title: 'إدارة مالية', landing_feature4_desc: 'متابعة الرسوم والرواتب والمصروفات بشفافية كاملة', landing_feature4_icon: '💰',
  landing_show_register_btn: 'true',
  landing_register_btn_text: 'طلب التسجيل',
  landing_login_btn_text: 'دخول المنصة',
  landing_footer_text: 'جميع الحقوق محفوظة',
  // School
  school_name: 'مؤسسة الفردوس للتعليم القرآني فرع الديبيلة',
  academic_year: '2025/2026',
  academic_season_start: '2025-09-01',
  contact_email: 'admin@quran.com',
  contact_phone: '0555000000',
  country_code: '+213',
  default_student_fee: '1500',
  default_teacher_salary: '30000',
  default_admin_salary: '40000',
  msg_absent: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا للتوضيح.',
  msg_late: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.',
  primary_color: '#1a5c35',
  auto_attendance: 'true',
  teacher_late_threshold: '40',
  rating_excellent_points: '5',
  rating_very_good_points: '4',
  rating_good_points: '3',
  rating_acceptable_points: '2',
  rating_weak_points: '1',
  holiday_mode: 'false',
  online_registration: 'true',
  course_registration_enabled: 'true',
  schedule_sync_enabled: 'false',
  schedule_sync_late_minutes: '15',
  schedule_sync_absent_minutes: '40',
  schedule_sync_notify_late: 'true',
  schedule_sync_notify_absent: 'true',
  auto_withdraw_absences: '5',
  // Idle display (شاشة الخمول)
  idle_display_enabled: 'true',
  idle_display_timeout_seconds: '10',
  adhan_sound_enabled: 'true',
  adhan_audio_url: '/audio/adhan.mp3',
}

function F({
  label, k, type = 'text', rows, settings, setSettings,
}: {
  label: string; k: string; type?: string; rows?: number;
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {rows ? (
        <textarea value={settings[k] ?? ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))}
          rows={rows} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
      ) : (
        <input type={type} value={settings[k] ?? ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
      )}
    </div>
  )
}



export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('school')
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupReport, setCleanupReport] = useState<{ deletedFiles: number; freedMB: string } | null>(null)
  const [showCleanupModal, setShowCleanupModal] = useState(false)

  const [archiving, setArchiving] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveResult, setArchiveResult] = useState<{
    archivedCount: number; prevAcademicYear: string; newAcademicYear: string; seasonEnd: string;
  } | null>(null)

  // Season archive report sub-tab
  const [seasonTab, setSeasonTab] = useState<'archive' | 'records'>('archive')
  const [records, setRecords] = useState<ArchiveRow[] | null>(null)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsQuery, setRecordsQuery] = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Setting[]) => {
      const map = { ...DEFAULT_SETTINGS }
      data.forEach(s => { if (s.key && s.value) map[s.key] = s.value })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  async function save(key: string, value: string) {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await Promise.all(Object.entries(settings).map(([key, value]) => save(key, value)))
    toast.success('تم حفظ الإعدادات بنجاح')
    setSaving(false)
  }

  async function handleCleanup() {
    setCleanupLoading(true)
    try {
      const res = await fetch('/api/admin/cleanup-temp', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCleanupReport(data)
        setShowCleanupModal(true)
      } else {
        toast.error(data.error ?? 'فشل التنظيف')
      }
    } catch {
      toast.error('حدث خطأ أثناء التنظيف')
    } finally {
      setCleanupLoading(false)
    }
  }




  async function handleArchiveSeason() {
    setArchiving(true)
    try {
      const res = await fetch('/api/academic-year/archive', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setArchiveResult(data)
        setShowArchiveModal(true)
        // Refresh local settings so counters labels and year update.
        setSettings(s => ({ ...s, academic_year: data.newAcademicYear, academic_season_start: data.newSeasonStart }))
        toast.success('تمت أرشفة الموسم الدراسي بنجاح')
      } else {
        toast.error(data.error ?? 'فشلت أرشفة الموسم الدراسي')
      }
    } catch {
      toast.error('حدث خطأ أثناء أرشفة الموسم الدراسي')
    } finally {
      setArchiving(false)
    }
  }

  async function loadRecords() {
    setRecordsLoading(true)
    try {
      const q = recordsQuery.trim() ? `?query=${encodeURIComponent(recordsQuery.trim())}` : ''
      const res = await fetch(`/api/academic-year/archive-report${q}`)
      const data = await res.json()
      if (res.ok) {
        setRecords(data.rows ?? [])
      } else {
        toast.error(data.error ?? 'فشل استرجاع سجلّ المواسم المؤرشفة')
      }
    } catch {
      toast.error('حدث خطأ أثناء استرجاع السجل')
    } finally {
      setRecordsLoading(false)
    }
  }

  const sections = [
    { key: 'school', label: '🏫 بيانات المدرسة', icon: '🏫' },
    { key: 'financial', label: '💰 الإعدادات المالية', icon: '💰' },
    { key: 'messages', label: '📱 رسائل التواصل', icon: '📱' },
    { key: 'evaluation', label: '⭐ نقاط التقييم', icon: '⭐' },
    { key: 'academic', label: '📅 الموسم الدراسي والأرشفة', icon: '📅' },
    { key: 'system', label: '⚙️ إعدادات النظام', icon: '⚙️' },
    { key: 'idle', label: '🖥️ شاشة الخمول', icon: '🖥️' },
    { key: 'landing', label: '🌐 صفحة الهبوط', icon: '🌐' },
  ]

  // Quick-links to dedicated settings sub-pages
  const subPages = [
    { href: '/settings/notifications', icon: '🔔', label: 'إعدادات الإشعارات التلقائية', desc: 'قوالب الغياب والتأخر، قنوات الإرسال' },
    { href: '/settings/barcode-attendance', icon: '📟', label: 'إعدادات تحضير الباركود', desc: 'واجهة، ألوان، ماسح، Excel' },
    { href: '/', icon: '🌐', label: 'معاينة صفحة الهبوط', desc: 'عرض الصفحة كما تظهر للزوار' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>⚙️</span> إعدادات النظام
      </h1>

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-right transition-colors border-b border-gray-100 last:border-0 ${
                  activeSection === s.key ? 'bg-green-50 text-green-700 font-bold border-r-4 border-r-green-600' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span>{s.icon}</span> {s.label.replace(/^[^\s]+\s/, '')}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1">
          <form onSubmit={handleSave}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {activeSection === 'school' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">🏫 بيانات المدرسة</h2>
                  <F label="اسم المدرسة / المؤسسة" k="school_name" settings={settings} setSettings={setSettings} />
                  <div className="grid grid-cols-2 gap-4">
                    <F label="البريد الإلكتروني للتواصل" k="contact_email" type="email" settings={settings} setSettings={setSettings} />
                    <F label="رقم الهاتف للتواصل" k="contact_phone" settings={settings} setSettings={setSettings} />
                  </div>
                  <F label="السنة الدراسية الحالية" k="academic_year" settings={settings} setSettings={setSettings} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اللون الرئيسي للنظام</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.primary_color ?? '#1a5c35'} onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer" />
                      <input value={settings.primary_color ?? '#1a5c35'} onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-32 focus:outline-none" placeholder="#1a5c35" />
                      <div className="flex gap-2">
                        {['#1a5c35', '#0d6efd', '#6f42c1', '#dc3545', '#fd7e14'].map(c => (
                          <button key={c} type="button" onClick={() => setSettings(s => ({ ...s, primary_color: c }))}
                            className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'financial' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">💰 الإعدادات المالية الافتراضية</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <F label="رسوم الطالب الافتراضية (دج)" k="default_student_fee" type="number" settings={settings} setSettings={setSettings} />
                    <F label="راتب المعلم الافتراضي (دج)" k="default_teacher_salary" type="number" settings={settings} setSettings={setSettings} />
                    <F label="راتب الإداري الافتراضي (دج)" k="default_admin_salary" type="number" settings={settings} setSettings={setSettings} />
                  </div>
                </>
              )}

              {activeSection === 'messages' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">📱 إعدادات رسائل التواصل</h2>
                  <F label="رمز الدولة (لمنسق الهاتف)" k="country_code" settings={settings} setSettings={setSettings} />
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    المتغيرات المتاحة: <code className="bg-blue-100 px-1 rounded">&#123;student_name&#125;</code> اسم الطالب، <code className="bg-blue-100 px-1 rounded">&#123;date&#125;</code> التاريخ، <code className="bg-blue-100 px-1 rounded">&#123;time&#125;</code> الوقت
                  </div>
                  <F label="رسالة الغياب (واتساب/SMS)" k="msg_absent" rows={3} settings={settings} setSettings={setSettings} />
                  <F label="رسالة التأخر (واتساب/SMS)" k="msg_late" rows={3} settings={settings} setSettings={setSettings} />
                  <div className="pt-2 border-t border-gray-100">
                    <Link href="/settings/notifications"
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group">
                      <span className="text-2xl">🔔</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800">إعدادات الإشعارات التلقائية</p>
                        <p className="text-xs text-green-600">تخصيص قوالب إشعارات الغياب والتأخر وقنوات الإرسال</p>
                      </div>
                      <svg className="text-green-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </Link>
                  </div>
                </>
              )}

              {activeSection === 'evaluation' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">⭐ نقاط التقييم والإعدادات المرتبطة</h2>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 mb-2">
                    تُستخدم هذه النقاط في حساب أفضل الطلاب بالصفحة الرئيسية للوحة التحكم.
                    الدرجة الكلية = مجموع نقاط التقييمات − (عدد الغيابات × 2)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="نقاط تقييم: ممتاز" k="rating_excellent_points" type="number" settings={settings} setSettings={setSettings} />
                    <F label="نقاط تقييم: جيد جداً" k="rating_very_good_points" type="number" settings={settings} setSettings={setSettings} />
                    <F label="نقاط تقييم: جيد" k="rating_good_points" type="number" settings={settings} setSettings={setSettings} />
                    <F label="نقاط تقييم: مقبول" k="rating_acceptable_points" type="number" settings={settings} setSettings={setSettings} />
                    <F label="نقاط تقييم: ضعيف" k="rating_weak_points" type="number" settings={settings} setSettings={setSettings} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-3">🕐 إعدادات حضور المعلمين</h3>
                    <F label="الفارق الزمني لتسجيل المعلم غائباً (بالدقائق)" k="teacher_late_threshold" type="number" settings={settings} setSettings={setSettings} />
                    <p className="text-xs text-gray-400 mt-1">
                      إذا لم يسجّل المعلم حضوره خلال هذه المدة من بداية حصته المجدولة، يُسجَّل غائباً تلقائياً.
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'academic' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">📅 الموسم الدراسي والأرشفة</h2>

                  {/* sub-tab switch */}
                  <div className="flex gap-2 border-b border-gray-200 pb-3">
                    <button type="button" onClick={() => setSeasonTab('archive')}
                      className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${seasonTab === 'archive' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      🎓 الأرشفة
                    </button>
                    <button type="button" onClick={() => { setSeasonTab('records'); if (records === null) loadRecords() }}
                      className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${seasonTab === 'records' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      📚 سجلّ المواسم المؤرشفة
                    </button>
                  </div>

                  {seasonTab === 'archive' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <F label="السنة الدراسية الحالية" k="academic_year" settings={settings} setSettings={setSettings} />
                        <F label="تاريخ بداية الموسم الحالي" k="academic_season_start" settings={settings} setSettings={setSettings} />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-semibold text-blue-800">كيف يعمل الموسم الدراسي؟</p>
                        <ul className="text-xs text-blue-700 space-y-1 list-disc pr-4">
                          <li>تعتمد عدادات النقاط والغياب والتأخر والمشطوب على سجلّات هذا الموسم فقط (من تاريخ البداية فصاعداً).</li>
                          <li>عند بدء موسم جديد تُؤرشف أرقام الموسم المنتهي لكل طالب ويُصفَّر العدّاد، دون أي حذف للتاريخ.</li>
                          <li>سجلّات الحفظ والتسميع تبقى <span className="font-bold">دائمة ولا تُمس</span> وترافق كل طالب حتى نهاية مساره.</li>
                          <li>يمكنك في أي وقت مراجعة أرشيف المواسم من التبويب <span className="font-bold">«سجلّ المواسم المؤرشفة»</span>.</li>
                        </ul>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <button type="button" onClick={() => setShowArchiveModal(true)} disabled={archiving}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 disabled:opacity-50 transition-colors">
                          {archiving ? 'جاري الأرشفة…' : '🎓 أرشفة الموسم الحالي وبدء موسم جديد'}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                          قبل تنفيذ الأرشفة، يُنصح بأخذ نسخة احتياطية من النظام (قسم النسخ الاحتياطي) لضمان حفظ سجلّات الموسم.
                        </p>
                      </div>
                    </>
                  )}

                  {seasonTab === 'records' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        عرض المواسم الدراسية المؤرشفة لكل طالب (النقاط + الحضور/الغياب + جلسات الحفظ). يمكنك البحث بالاسم أو رقم التسجيل.
                      </p>

                      <div className="flex gap-2">
                        <input value={recordsQuery}
                          onKeyDown={e => { if (e.key === 'Enter') loadRecords() }}
                          onChange={e => setRecordsQuery(e.target.value)}
                          placeholder="بحث: الاسم أو رقم التسجيل…"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                        <button type="button" onClick={loadRecords} disabled={recordsLoading}
                          className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50">
                          {recordsLoading ? '…' : 'بحث'}
                        </button>
                      </div>

                      {recordsLoading ? (
                        <p className="text-sm text-gray-400 text-center py-6">جاري التحميل…</p>
                      ) : records === null ? (
                        <p className="text-sm text-gray-400 text-center py-6">اضغط على تبويب السجلّ أو زر البحث لعرض البيانات.</p>
                      ) : records.length === 0 ? (
                        <p className="text-sm text-amber-600 text-center py-6">
                          لا توجد مواسم مؤرشفة بعد — تُؤرشف السجلّات عند الضغط على زر «أرشفة الموسم الحالي وبدء موسم جديد».
                        </p>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                          <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="px-3 py-2 font-semibold">الطالب</th>
                                <th className="px-3 py-2 font-semibold">الموسم</th>
                                <th className="px-3 py-2 font-semibold">الفترة</th>
                                <th className="px-3 py-2 font-semibold">النقاط</th>
                                <th className="px-3 py-2 font-semibold">حضور</th>
                                <th className="px-3 py-2 font-semibold">غياب</th>
                                <th className="px-3 py-2 font-semibold">تأخر</th>
                                <th className="px-3 py-2 font-semibold">عذر</th>
                                <th className="px-3 py-2 font-semibold">جلسات الحفظ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {records.map(r => (
                                <tr key={r.id} className="hover:bg-green-50/40">
                                  <td className="px-3 py-2">
                                    <div className="font-semibold text-gray-800">{r.firstName} {r.lastName}</div>
                                    <div className="text-xs text-gray-400">{r.studentNumber || ''}{r.groupName ? ` — ${r.groupName}` : ''}</div>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.academicYear || '—'}</td>
                                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                    {r.seasonStart || '—'} ← {r.seasonEnd || '—'}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-green-700">{r.totalPoints ?? 0}</td>
                                  <td className="px-3 py-2 text-gray-700">{r.totalPresent ?? 0}</td>
                                  <td className="px-3 py-2 text-red-600">{r.totalAbsent ?? 0}</td>
                                  <td className="px-3 py-2 text-amber-600">{r.totalLate ?? 0}</td>
                                  <td className="px-3 py-2 text-gray-700">{r.totalExcused ?? 0}</td>
                                  <td className="px-3 py-2 text-gray-700">{r.memoSessionsCount ?? 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeSection === 'system' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">⚙️ إعدادات النظام</h2>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <F label="الشطب التلقائي بعد عدد الغيابات" k="auto_withdraw_absences" type="number" settings={settings} setSettings={setSettings} />
                    <p className="text-xs text-amber-700">
                      عند وصول الطالب إلى هذا العدد من الغيابات يتم تحويل حالته تلقائياً من &quot;نشط&quot; إلى &quot;مشطوب&quot;. القيمة الافتراضية 5.
                    </p>
                  </div>

                  {/* وضع العطلة */}
                  <div className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${settings.holiday_mode === 'true' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <span>🏖️</span> وضع العطلة
                        {settings.holiday_mode === 'true' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">مفعّل</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">عند التفعيل يتوقف النظام عن إرسال أي إشعارات تلقائية (غياب/تأخر)</p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, holiday_mode: s.holiday_mode === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.holiday_mode === 'true' ? 'bg-orange-400' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.holiday_mode === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* التحضير التلقائي */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><span>📷</span> التحضير التلقائي بالـ QR</p>
                      <p className="text-xs text-gray-500">تفعيل/تعطيل خاصية مسح بطاقة الطالب لتسجيل الحضور</p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, auto_attendance: s.auto_attendance === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.auto_attendance === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.auto_attendance === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* التسجيل عبر الإنترنت */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <span>📝</span> التسجيل عبر الإنترنت
                      </p>
                      <p className="text-xs text-gray-500">
                        السماح للعائلات بإرسال طلبات تسجيل من صفحة{' '}
                        <a href="/register" target="_blank" className="text-green-700 underline hover:text-green-900">/register</a>
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, online_registration: s.online_registration === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.online_registration === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.online_registration === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* استمارة التسجيل في الدورات */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <span>📚</span> استمارة التسجيل في الدورات
                        {settings.course_registration_enabled === 'true' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">مفتوحة</span>}
                        {settings.course_registration_enabled !== 'true' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">مغلقة</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        السماح للعائلات بالتسجيل في الدورات من صفحة{' '}
                        <a href="/coursereg" target="_blank" className="text-green-700 underline hover:text-green-900">/coursereg</a>
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, course_registration_enabled: s.course_registration_enabled === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.course_registration_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.course_registration_enabled === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* ───── مزامنة التحضير مع الجدول ───── */}
                  <div className={`border rounded-xl p-4 transition-colors ${settings.schedule_sync_enabled === 'true' ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                          <span>🔄</span> مزامنة التحضير مع الجدول الدراسي
                          {settings.schedule_sync_enabled === 'true' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">مفعّلة</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          عند تفعيلها: كل طالب لم يُسجَّل حضوره بالمسح خلال مدة محددة من بدء الحصة
                          يُعدّ <strong>متأخراً</strong> ثم <strong>غائباً</strong> تلقائياً، مع إمكانية التحكم بإشعار كل حالة على حدة أدناه.
                        </p>
                      </div>
                      <button type="button"
                        onClick={() => setSettings(s => ({ ...s, schedule_sync_enabled: s.schedule_sync_enabled === 'true' ? 'false' : 'true' }))}
                        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${settings.schedule_sync_enabled === 'true' ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.schedule_sync_enabled === 'true' ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    {settings.schedule_sync_enabled === 'true' && (
                      <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-blue-200">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            ⏱️ مدة التأخر (بالدقائق)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="1" max="120"
                              value={settings.schedule_sync_late_minutes}
                              onChange={e => setSettings(s => ({ ...s, schedule_sync_late_minutes: e.target.value }))}
                              className="w-full border border-yellow-300 bg-yellow-50 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">دقيقة</span>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">بعد هذه المدة من بدء الحصة يُعتبر الطالب <strong>متأخراً</strong></p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            🚫 مدة الغياب (بالدقائق)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="1" max="240"
                              value={settings.schedule_sync_absent_minutes}
                              onChange={e => setSettings(s => ({ ...s, schedule_sync_absent_minutes: e.target.value }))}
                              className="w-full border border-red-300 bg-red-50 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-red-300"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">دقيقة</span>
                          </div>
                          <p className="text-xs text-red-700 mt-1">بعد هذه المدة يُعتبر الطالب <strong>غائباً</strong> ويُرسل إشعار</p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                            <span>ℹ️</span>
                            <span>يجب أن يكون للفوج جدول حصص محدد ليوم الأسبوع الحالي حتى تعمل المزامنة. يتم التحقق تلقائياً كل دقيقة أثناء جلسة المسح.</span>
                          </div>
                        </div>

                        {/* ───── إشعارات التأخر والغياب — كل واحد يُفعَّل/يُعطَّل على حدة ───── */}
                        <div className="col-span-2 pt-3 border-t border-blue-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">🔔 إشعارات المزامنة التلقائية لأولياء الأمور</p>
                          <p className="text-xs text-gray-500 mb-3">
                            تخفيض حالة الطالب إلى متأخر/غائب يبقى يعمل دائماً وفق المدد أعلاه. هذان الخياران يتحكمان فقط في إرسال إشعار لولي الأمر عند كل حالة، بشكل مستقل عن الآخر.
                          </p>

                          <div className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50/60 rounded-lg mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                <span>⏰</span> إشعار التأخر
                                {settings.schedule_sync_notify_late === 'true'
                                  ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">مفعّل</span>
                                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">معطّل</span>}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">إرسال إشعار لولي الأمر عند تحويل الطالب إلى &quot;متأخر&quot; تلقائياً</p>
                            </div>
                            <button type="button"
                              onClick={() => setSettings(s => ({ ...s, schedule_sync_notify_late: s.schedule_sync_notify_late === 'true' ? 'false' : 'true' }))}
                              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.schedule_sync_notify_late === 'true' ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.schedule_sync_notify_late === 'true' ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-3 border border-red-200 bg-red-50/60 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                <span>🚫</span> إشعار الغياب
                                {settings.schedule_sync_notify_absent === 'true'
                                  ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">مفعّل</span>
                                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">معطّل</span>}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">إرسال إشعار لولي الأمر عند تحويل الطالب إلى &quot;غائب&quot; تلقائياً</p>
                            </div>
                            <button type="button"
                              onClick={() => setSettings(s => ({ ...s, schedule_sync_notify_absent: s.schedule_sync_notify_absent === 'true' ? 'false' : 'true' }))}
                              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.schedule_sync_notify_absent === 'true' ? 'bg-red-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.schedule_sync_notify_absent === 'true' ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* تنظيف الملفات المؤقتة */}
                  <div className="mt-2 p-4 border border-dashed border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-2"><span>🗑️</span> تنظيف الملفات المؤقتة</p>
                        <p className="text-xs text-gray-500 mt-0.5">حذف ملفات /tmp و .next/cache لتحرير مساحة التخزين على الخادم</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCleanup}
                        disabled={cleanupLoading}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
                      >
                        {cleanupLoading ? (
                          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري التنظيف...</>
                        ) : (
                          <><span>🧹</span> تنظيف الآن</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* رابط طلبات التسجيل */}
                  <div className="pt-2 border-t border-gray-100">
                    <Link href="/dashboard/registration-requests"
                      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group">
                      <span className="text-2xl">📋</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-800">إدارة طلبات التسجيل الإلكتروني</p>
                        <p className="text-xs text-blue-600">مراجعة وقبول أو رفض طلبات التسجيل الواردة</p>
                      </div>
                      <svg className="text-blue-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </Link>
                  </div>
                </>
              )}
              {activeSection === 'idle' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">🖥️ شاشة الخمول وأذان الصلاة</h2>
                  <p className="text-sm text-gray-500 -mt-2">
                    إعدادات شاشة الباركود/الخمول: عرض أوقات الصلاة وعدّاد الإقامة وتشغيل صوت الأذان عند حلول وقت الصلاة.
                  </p>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">تفعيل شاشة الخمول</p>
                      <p className="text-xs text-gray-500">عرض أوقات الصلاة تلقائياً عند عدم استخدام الجهاز</p>
                    </div>
                    <input type="checkbox" checked={(settings.idle_display_enabled ?? 'true') === 'true'}
                      onChange={e => setSettings(s => ({ ...s, idle_display_enabled: e.target.checked ? 'true' : 'false' }))}
                      className="w-5 h-5 accent-green-600" />
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مدة الانتظار قبل ظهور شاشة الخمول (بالثواني)</label>
                    <input type="number" min="1" max="120" value={settings.idle_display_timeout_seconds ?? '10'}
                      onChange={e => setSettings(s => ({ ...s, idle_display_timeout_seconds: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <p className="text-xs text-gray-500 mt-1">عدد ثواني عدم النشاط قبل عرض شاشة أوقات الصلاة.</p>
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">تشغيل صوت الأذان</p>
                      <p className="text-xs text-gray-500">تشغيل الأذان تلقائياً عند حلول وقت كل صلاة</p>
                    </div>
                    <input type="checkbox" checked={(settings.adhan_sound_enabled ?? 'true') === 'true'}
                      onChange={e => setSettings(s => ({ ...s, adhan_sound_enabled: e.target.checked ? 'true' : 'false' }))}
                      className="w-5 h-5 accent-green-600" />
                  </label>

                  <F label="رابط / مسار ملف الأذان (MP3)" k="adhan_audio_url" settings={settings} setSettings={setSettings} />
                </>
              )}

              {activeSection === 'landing' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3 flex items-center justify-between">
                    <span>🌐 صفحة الهبوط العامة</span>
                    <a href="/" target="_blank" rel="noreferrer"
                      className="text-xs font-normal text-green-700 underline hover:text-green-900 flex items-center gap-1">
                      معاينة الصفحة ↗
                    </a>
                  </h2>

                  {/* Enable toggle */}
                  <div className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${settings.landing_enabled === 'true' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <div>
                      <p className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>🌐</span> تفعيل صفحة الهبوط
                        {settings.landing_enabled === 'true' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">مفعّلة</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        عند التفعيل تظهر صفحة ترحيبية عند زيارة الرابط الرئيسي بدلاً من صفحة تسجيل الدخول المباشرة
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, landing_enabled: s.landing_enabled === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${settings.landing_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.landing_enabled === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Hero text */}
                  <div className="pt-2">
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">📝 نصوص القسم الرئيسي</h3>
                    <div className="space-y-3">
                      <F label="عنوان المنصة (الرئيسي)" k="landing_title" settings={settings} setSettings={setSettings} />
                      <F label="العنوان الفرعي" k="landing_subtitle" settings={settings} setSettings={setSettings} />
                      <F label="وصف المنصة" k="landing_description" rows={3} settings={settings} setSettings={setSettings} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-700 text-sm">📊 الإحصائيات</h3>
                      <button type="button"
                        onClick={() => setSettings(s => ({ ...s, landing_show_stats: s.landing_show_stats === 'true' ? 'false' : 'true' }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${settings.landing_show_stats === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.landing_show_stats === 'true' ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {settings.landing_show_stats === 'true' && (
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(n => (
                          <div key={n} className="space-y-2 bg-gray-50 rounded-lg p-3">
                            <input value={settings[`landing_stat${n}_value`] ?? ''} onChange={e => setSettings(s => ({ ...s, [`landing_stat${n}_value`]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
                              placeholder="374+" />
                            <input value={settings[`landing_stat${n}_label`] ?? ''} onChange={e => setSettings(s => ({ ...s, [`landing_stat${n}_label`]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                              placeholder="تسمية" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-700 text-sm mb-3">✨ بطاقات المميزات (4 بطاقات)</h3>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                          <div className="flex items-center gap-2 mb-2">
                            <input value={settings[`landing_feature${n}_icon`] ?? ''} onChange={e => setSettings(s => ({ ...s, [`landing_feature${n}_icon`]: e.target.value }))}
                              className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-center text-xl focus:outline-none" placeholder="🎓" />
                            <input value={settings[`landing_feature${n}_title`] ?? ''} onChange={e => setSettings(s => ({ ...s, [`landing_feature${n}_title`]: e.target.value }))}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
                              placeholder={`عنوان الميزة ${n}`} />
                          </div>
                          <input value={settings[`landing_feature${n}_desc`] ?? ''} onChange={e => setSettings(s => ({ ...s, [`landing_feature${n}_desc`]: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                            placeholder={`وصف الميزة ${n}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buttons & footer */}
                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-700 text-sm mb-3">🔘 نصوص الأزرار والتذييل</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <F label="نص زر الدخول" k="landing_login_btn_text" settings={settings} setSettings={setSettings} />
                      <F label="نص زر التسجيل" k="landing_register_btn_text" settings={settings} setSettings={setSettings} />
                      <div className="col-span-2">
                        <F label="نص التذييل" k="landing_footer_text" settings={settings} setSettings={setSettings} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">إظهار زر طلب التسجيل</p>
                        <p className="text-xs text-gray-400">يظهر في شريط التنقل وقسم CTA</p>
                      </div>
                      <button type="button"
                        onClick={() => setSettings(s => ({ ...s, landing_show_register_btn: s.landing_show_register_btn === 'true' ? 'false' : 'true' }))}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${settings.landing_show_register_btn === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.landing_show_register_btn === 'true' ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button type="submit" disabled={saving}
              className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
              {saving ? 'جاري الحفظ...' : '💾 حفظ وتطبيق الإعدادات'}
            </button>
          </form>
        </div>
      </div>

      {/* Sub-pages quick links */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">إعدادات متخصصة</h2>
        <div className="flex flex-wrap gap-3">
          {subPages.map(p => (
            <Link key={p.href} href={p.href}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">{p.label}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
              <svg className="mr-1 text-gray-300 group-hover:text-green-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Archive confirm modal */}
      {showArchiveModal && !archiveResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-5xl mb-3 text-center">🎓</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">تأكيد أرشفة الموسم الدراسي وبدء موسم جديد</h3>
            <p className="text-gray-500 text-sm mb-4 text-right">
              سيتم أرشفة أرقام الموسم الحالي (<span className="font-bold text-gray-700">{settings.academic_year || '—'}</span>) لكل طالب، ثم
              تصفير عدادات النقاط والغياب لبدء موسم جديد. سجلّات الحفظ والتسميع <span className="font-bold text-gray-700">لا تُمسّ وتبقى دائمة</span>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">تنبيه هام</p>
              <p>• أخذ نسخة احتياطية قبل التنفيذ أمر موصى به.</p>
              <p>• لا يمكن التراجع عن تصفير العدّادات، لكن أرشيف الموسم محفوظ في الجدول.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowArchiveModal(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm">
                إلغاء
              </button>
              <button onClick={handleArchiveSeason} disabled={archiving}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {archiving ? 'جاري الأرشفة…' : 'تأكيد الأرشفة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive result modal */}
      {showArchiveModal && archiveResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">تمت الأرشفة بنجاح</h3>
            <p className="text-gray-500 text-sm mb-5">بدأ موسم دراسي جديد، وصُفِّرت العدّادات مع حفظ الأرشيف.</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{archiveResult.archivedCount}</p>
                <p className="text-xs text-green-600 mt-0.5">طالب مؤرشف</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm font-bold text-blue-700 leading-tight">{archiveResult.newAcademicYear}</p>
                <p className="text-xs text-blue-600 mt-0.5">الموسم الجديد</p>
              </div>
            </div>
            <button onClick={() => setShowArchiveModal(false)}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl text-sm">
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* Cleanup report modal */}
      {showCleanupModal && cleanupReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">تم التنظيف بنجاح</h3>
            <p className="text-gray-500 text-sm mb-5">تقرير عملية تنظيف الملفات المؤقتة</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{cleanupReport.deletedFiles}</p>
                <p className="text-xs text-green-600 mt-0.5">ملف محذوف</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-2xl font-bold text-blue-700">{cleanupReport.freedMB} MB</p>
                <p className="text-xs text-blue-600 mt-0.5">مساحة محررة</p>
              </div>
            </div>
            <button
              onClick={() => setShowCleanupModal(false)}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl text-sm">
              حسناً
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
