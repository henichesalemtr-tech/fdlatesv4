'use client'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

type SeedResult = {
  counts?: {
    students: number; teachers: number; groups: number
    rooms: number; subjects: number; schedules: number
  }
}

type RestoreResult = {
  counts?: Record<string, number>
}

export default function BackupPage() {
  const [downloading, setDownloading]     = useState(false)
  const [restoring, setRestoring]         = useState(false)
  const [seeding, setSeeding]             = useState(false)
  const [clearing, setClearing]           = useState(false)
  const [seedResult, setSeedResult]       = useState<SeedResult | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [confirmClear, setConfirmClear]   = useState(false)
  const [confirmSeed, setConfirmSeed]     = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [pendingFile, setPendingFile]     = useState<File | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  /* ── Download backup ───────────────────────────────────────── */
  async function downloadBackup() {
    setDownloading(true)
    toast.info('جاري تحضير النسخة الاحتياطية...')
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) { toast.error('فشل تحضير النسخة'); setDownloading(false); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `ferdous_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تنزيل النسخة الاحتياطية بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء التنزيل')
    }
    setDownloading(false)
  }

  /* ── File selected → ask for confirmation ──────────────────── */
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) { toast.error('يرجى اختيار ملف JSON فقط'); return }
    setPendingFile(file)
    setConfirmRestore(true)
    if (restoreRef.current) restoreRef.current.value = ''
  }

  /* ── Execute restore ───────────────────────────────────────── */
  async function handleRestore() {
    if (!pendingFile) return
    setConfirmRestore(false)
    setRestoring(true)
    setRestoreResult(null)
    toast.info('جاري استعادة البيانات... قد يستغرق ذلك دقيقة')
    try {
      const text = await pendingFile.text()
      let parsed: unknown
      try { parsed = JSON.parse(text) } catch {
        toast.error('ملف JSON غير صالح أو تالف')
        setRestoring(false)
        return
      }
      const res  = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setRestoreResult(data)
        toast.success('✅ تمت استعادة البيانات بنجاح')
      } else {
        toast.error(data.error ?? 'فشلت الاستعادة')
      }
    } catch {
      toast.error('حدث خطأ غير متوقع أثناء الاستعادة')
    }
    setPendingFile(null)
    setRestoring(false)
  }

  /* ── Clear all ─────────────────────────────────────────────── */
  async function handleClear() {
    setConfirmClear(false)
    setClearing(true)
    setSeedResult(null)
    toast.info('جاري مسح جميع البيانات...')
    try {
      const res  = await fetch('/api/backup/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) })
      const data = await res.json()
      if (data.success) toast.success('✅ تم مسح جميع البيانات بنجاح')
      else toast.error(data.error ?? 'فشل المسح')
    } catch { toast.error('حدث خطأ أثناء المسح') }
    setClearing(false)
  }

  /* ── Seed demo ─────────────────────────────────────────────── */
  async function handleSeed() {
    setConfirmSeed(false)
    setSeeding(true)
    setSeedResult(null)
    toast.info('جاري توليد البيانات التجريبية... قد يستغرق ذلك دقيقة')
    try {
      const res  = await fetch('/api/backup/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) })
      const data = await res.json()
      if (data.success) { setSeedResult(data); toast.success('✅ تم استيراد البيانات التجريبية بنجاح') }
      else toast.error(data.error ?? 'فشل الاستيراد')
    } catch { toast.error('حدث خطأ أثناء الاستيراد') }
    setSeeding(false)
  }

  const busy = downloading || restoring || seeding || clearing

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>💾</span> النسخ الاحتياطي واستعادة البيانات
      </h1>

      {/* ── Backup + Restore row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Backup card */}
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💾</div>
            <div>
              <h2 className="font-bold text-gray-800">حفظ نسخة احتياطية</h2>
              <p className="text-xs text-gray-500">تصدير جميع بيانات النظام بصيغة JSON</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            تشمل النسخة الاحتياطية: الطلاب، المعلمون، الأفواج، القاعات، الجداول، الحضور والغياب، جلسات الحفظ، الواجبات، حضور المعلمين، طلبات التسجيل، والبيانات المالية.
          </p>
          <div className="bg-green-50 rounded-lg p-3 mb-4 text-xs text-green-700">
            ✅ يُنصح بأخذ نسخة احتياطية أسبوعياً على الأقل وحفظها في مكان آمن
          </div>
          <button onClick={downloadBackup} disabled={busy}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {downloading
              ? <><span className="animate-spin">⏳</span> جاري التحضير...</>
              : <><span>⬇️</span> تنزيل النسخة الاحتياطية الآن</>}
          </button>
        </div>

        {/* Restore card */}
        <div className="bg-white rounded-xl border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">🔄</div>
            <div>
              <h2 className="font-bold text-gray-800">استعادة من نسخة احتياطية</h2>
              <p className="text-xs text-gray-500">رفع ملف JSON لاستعادة البيانات</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            الاستعادة من نسخة احتياطية تستبدل البيانات الحالية بالبيانات المحفوظة.
          </p>
          <div className="bg-orange-50 rounded-lg p-3 mb-4 text-xs text-orange-700">
            ⚠️ تأكد من أخذ نسخة احتياطية من البيانات الحالية أولاً قبل الاستعادة
          </div>

          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleFileSelected} />

          <button
            onClick={() => restoreRef.current?.click()}
            disabled={busy}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {restoring
              ? <><span className="animate-spin inline-block">⏳</span> جاري الاستعادة...</>
              : <><span>📂</span> اختيار ملف النسخة الاحتياطية</>}
          </button>

          {/* Restore result */}
          {restoreResult?.counts && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                <span>✅</span> تمت الاستعادة بنجاح
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.entries(restoreResult.counts).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-2 border border-green-100">
                    <p className="text-lg font-bold text-green-700">{v}</p>
                    <p className="text-xs text-gray-500">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm restore modal ── */}
      {confirmRestore && pendingFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">⚠️</div>
              <div>
                <h2 className="font-bold text-gray-800">تأكيد الاستعادة</h2>
                <p className="text-xs text-gray-500">{pendingFile.name}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ تحذير مهم</p>
              <ul className="text-xs space-y-1 mt-2">
                <li>• سيتم <strong>مسح جميع البيانات الحالية</strong> (طلاب، معلمون، أفواج، مالية)</li>
                <li>• سيتم استبدالها بالبيانات من الملف المحدد</li>
                <li>• <strong>لا يمكن التراجع عن هذه العملية</strong></li>
                <li>• سيُحتفظ بحسابات المديرين الحاليين</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRestore}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                ✅ نعم، استعادة البيانات
              </button>
              <button onClick={() => { setConfirmRestore(false); setPendingFile(null) }}
                className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Demo Data ── */}
      <div className="bg-white rounded-xl border border-purple-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">🧪</div>
          <div>
            <h2 className="font-bold text-gray-800">البيانات التجريبية</h2>
            <p className="text-xs text-gray-500">ملء النظام ببيانات وهمية للاختبار أو مسح الكل</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Seed */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><span>✨</span> استيراد بيانات وهمية</h3>
            <ul className="text-xs text-purple-700 space-y-1 mb-3">
              <li>• <strong>40 طالب</strong> مع بيانات كاملة وحسابات أولياء الأمور</li>
              <li>• <strong>6 معلمين</strong> مع حسابات تسجيل دخول (teacher01–06 / teacher123)</li>
              <li>• <strong>6 أفواج</strong> + 5 قاعات + 5 مواد دراسية</li>
              <li>• <strong>سجل حضور كامل</strong> لآخر 30 يوماً</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
              ⚠️ سيتم مسح جميع البيانات الحالية واستبدالها بالبيانات التجريبية
            </div>
            {!confirmSeed ? (
              <button onClick={() => setConfirmSeed(true)} disabled={busy}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
                ✨ استيراد البيانات التجريبية
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-red-600 font-medium">هل أنت متأكد؟ سيتم مسح جميع البيانات الحالية!</p>
                <div className="flex gap-2">
                  <button onClick={handleSeed} disabled={seeding}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                    {seeding ? '⏳ جاري الاستيراد...' : '✅ نعم، استيراد'}
                  </button>
                  <button onClick={() => setConfirmSeed(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">إلغاء</button>
                </div>
              </div>
            )}
          </div>

          {/* Clear */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2"><span>🗑️</span> مسح جميع البيانات</h3>
            <ul className="text-xs text-red-700 space-y-1 mb-3">
              <li>• حذف جميع الطلاب وبياناتهم</li>
              <li>• حذف المعلمين والأفواج والقاعات</li>
              <li>• حذف سجلات الحضور والمالية</li>
              <li>• الإبقاء على حسابات المديرين وإعدادات النظام</li>
            </ul>
            <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3 text-xs text-red-700">
              ⛔ هذا الإجراء لا يمكن التراجع عنه — تأكد من أخذ نسخة احتياطية أولاً
            </div>
            {!confirmClear ? (
              <button onClick={() => setConfirmClear(true)} disabled={busy}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
                🗑️ مسح جميع البيانات
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-red-600 font-medium">هل أنت متأكد تماماً؟ لا يمكن التراجع!</p>
                <div className="flex gap-2">
                  <button onClick={handleClear} disabled={clearing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                    {clearing ? '⏳ جاري المسح...' : '✅ نعم، مسح الكل'}
                  </button>
                  <button onClick={() => setConfirmClear(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {seedResult?.counts && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><span>✅</span> تم استيراد البيانات التجريبية بنجاح</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { icon: '👨‍🎓', label: 'طالب',  value: seedResult.counts.students },
                { icon: '👨‍🏫', label: 'معلم',  value: seedResult.counts.teachers },
                { icon: '📚',  label: 'فوج',   value: seedResult.counts.groups },
                { icon: '🏛',  label: 'قاعة',  value: seedResult.counts.rooms },
                { icon: '📖',  label: 'مادة',  value: seedResult.counts.subjects },
                { icon: '📅',  label: 'جدول',  value: seedResult.counts.schedules },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-lg p-3 text-center border border-green-100">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-2xl font-bold text-green-700">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <strong>بيانات تسجيل الدخول للمعلمين:</strong> teacher01 / teacher123 … teacher06 / teacher123
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-700 mb-4">📋 محتوى النسخة الاحتياطية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '👨‍🎓', label: 'بيانات الطلاب',       desc: 'أسماء، أرقام تسجيل، حالات' },
            { icon: '👨‍🏫', label: 'بيانات المعلمين',     desc: 'معلومات المعلمين والأفواج' },
            { icon: '📋',  label: 'سجل الحضور',         desc: 'جميع سجلات الحضور والغياب' },
            { icon: '📖',  label: 'جلسات الحفظ',         desc: 'تقييمات الحفظ والواجبات' },
            { icon: '🧑‍🏫', label: 'حضور المعلمين',       desc: 'سجلات حضور وغياب المعلمين' },
            { icon: '📝',  label: 'طلبات التسجيل',       desc: 'جميع طلبات القبول والحالات' },
            { icon: '💰',  label: 'البيانات المالية',    desc: 'الرسوم، الرواتب، المصروفات' },
            { icon: '📅',  label: 'الجداول الدراسية',   desc: 'جميع الحصص المبرمجة' },
            { icon: '🏛',  label: 'القاعات والأفواج',    desc: 'بيانات القاعات والمجموعات' },
            { icon: '⚙️',  label: 'إعدادات النظام',     desc: 'إعدادات المؤسسة والرسائل' },
            { icon: '👥',  label: 'حسابات المستخدمين',  desc: 'جميع الأدوار بدون كلمات المرور' },
            { icon: '🔐',  label: 'الأدوار والصلاحيات', desc: 'تعريفات الأدوار المخصصة' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
