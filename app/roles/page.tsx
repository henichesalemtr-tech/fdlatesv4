'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Role = { id: number; name: string; label: string | null; permissions: string | null; createdAt: string | null }

// ── الصلاحيات الحقيقية المطابقة لما ينفّذه النظام فعلاً ──────────────────────
const PERMISSION_GROUPS = [
  {
    group: 'الطلاب',
    icon: '👨‍🎓',
    items: [
      { key: 'students.view',   label: 'عرض قائمة الطلاب وملفاتهم' },
      { key: 'students.create', label: 'إضافة طلاب جدد' },
      { key: 'students.edit',   label: 'تعديل بيانات الطلاب' },
      { key: 'students.delete', label: 'حذف الطلاب' },
      { key: 'students.import', label: 'استيراد الطلاب من Excel' },
      { key: 'students.export', label: 'تصدير بيانات الطلاب' },
    ],
  },
  {
    group: 'المعلمين',
    icon: '👨‍🏫',
    items: [
      { key: 'teachers.view',   label: 'عرض قائمة المعلمين وملفاتهم' },
      { key: 'teachers.create', label: 'إضافة معلمين جدد' },
      { key: 'teachers.edit',   label: 'تعديل بيانات المعلمين' },
      { key: 'teachers.delete', label: 'حذف المعلمين' },
    ],
  },
  {
    group: 'الأفواج والجداول',
    icon: '📚',
    items: [
      { key: 'groups.view',        label: 'عرض الأفواج والطلاب فيها' },
      { key: 'groups.manage',      label: 'إنشاء وتعديل وحذف الأفواج' },
      { key: 'groups.assign',      label: 'إضافة وإزالة طلاب من الأفواج' },
      { key: 'schedules.view',     label: 'عرض الجداول الدراسية' },
      { key: 'schedules.manage',   label: 'إنشاء وتعديل وحذف الجداول' },
      { key: 'rooms.manage',       label: 'إدارة القاعات الدراسية' },
    ],
  },
  {
    group: 'الحضور والغياب',
    icon: '📋',
    items: [
      { key: 'attendance.view',        label: 'عرض سجلات الحضور والغياب' },
      { key: 'attendance.record',      label: 'تسجيل حضور الطلاب يدوياً' },
      { key: 'attendance.barcode',     label: 'استخدام التحضير بالباركود (للمدير فقط)' },
      { key: 'attendance.qr',          label: 'استخدام التحضير بـ QR (كاميرا)' },
      { key: 'attendance.scan_monitor',label: 'متابعة عمليات المسح اليومي' },
      { key: 'teacher_attendance.manage', label: 'تسجيل ومتابعة حضور المعلمين' },
    ],
  },
  {
    group: 'حفظ القرآن',
    icon: '📖',
    items: [
      { key: 'memorization.view',   label: 'عرض جلسات الحفظ والمراجعة' },
      { key: 'memorization.record', label: 'تسجيل جلسات الحفظ وتقييم الطلاب' },
      { key: 'memorization.homework', label: 'تعيين الواجبات القرآنية' },
    ],
  },
  {
    group: 'الإشعارات والرسائل',
    icon: '🔔',
    items: [
      { key: 'notifications.view',          label: 'عرض الإشعارات الواردة والصادرة' },
      { key: 'notifications.send',          label: 'إرسال إشعارات للمستخدمين' },
      { key: 'notifications.send_absence',  label: 'إرسال تنبيهات الغياب والتأخر' },
      { key: 'messages.view',               label: 'عرض المحادثات والرسائل الخاصة' },
      { key: 'messages.send',               label: 'إرسال رسائل خاصة' },
      { key: 'messages.broadcast',          label: 'إرسال رسائل جماعية لجميع المستخدمين' },
    ],
  },
  {
    group: 'أولياء الأمور',
    icon: '👨‍👩‍👦',
    items: [
      { key: 'guardians.view',   label: 'عرض قائمة أولياء الأمور' },
      { key: 'guardians.manage', label: 'إضافة وتعديل وحذف أولياء الأمور' },
      { key: 'guardians.link',   label: 'ربط ولي الأمر بحساب مستخدم' },
    ],
  },
  {
    group: 'المالية والرسوم',
    icon: '💰',
    items: [
      { key: 'finance.view',      label: 'عرض السجلات المالية والتقارير' },
      { key: 'finance.fees',      label: 'تسجيل وتعديل رسوم الطلاب' },
      { key: 'finance.salaries',  label: 'صرف وإدارة رواتب المعلمين' },
      { key: 'finance.expenses',  label: 'تسجيل وإدارة المصاريف' },
      { key: 'finance.donations', label: 'تسجيل وإدارة التبرعات' },
    ],
  },
  {
    group: 'التقارير والطباعة',
    icon: '📊',
    items: [
      { key: 'reports.view',        label: 'عرض تقارير الحضور والحفظ والأداء' },
      { key: 'reports.print',       label: 'طباعة وتصدير التقارير' },
      { key: 'reports.cards',       label: 'طباعة بطاقات الطلاب' },
    ],
  },
  {
    group: 'طلبات التسجيل',
    icon: '📝',
    items: [
      { key: 'registration.view',   label: 'عرض طلبات التسجيل الإلكترونية' },
      { key: 'registration.manage', label: 'قبول أو رفض طلبات التسجيل' },
    ],
  },
  {
    group: 'إدارة النظام',
    icon: '⚙️',
    items: [
      { key: 'settings.manage',      label: 'تعديل إعدادات النظام العامة' },
      { key: 'settings.notifications', label: 'إدارة إعدادات الإشعارات الفورية (Push)' },
      { key: 'settings.barcode',     label: 'إدارة إعدادات صفحة الباركود' },
      { key: 'users.manage',         label: 'إضافة وتعديل وحذف المستخدمين' },
      { key: 'roles.manage',         label: 'إنشاء وتعديل الأدوار والصلاحيات' },
      { key: 'activity_logs.view',   label: 'عرض سجل عمليات النظام' },
      { key: 'settings.activity_logs', label: 'الوصول إلى صفحة سجل العمليات' },
      { key: 'backup.manage',        label: 'إنشاء واستعادة النسخ الاحتياطية' },
      { key: 'courses.manage',       label: 'إدارة الدورات التعليمية وطلبات التسجيل' },
    ],
  },
]

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items)

// الصلاحيات الافتراضية للمعلم
const TEACHER_DEFAULT_PERMS = [
  'groups.view', 'attendance.view', 'attendance.record', 'attendance.qr',
  'memorization.view', 'memorization.record', 'memorization.homework',
  'notifications.view', 'notifications.send', 'notifications.send_absence',
  'messages.view', 'messages.send',
]

// الصلاحيات الافتراضية للمدير (كل الصلاحيات)
const ADMIN_DEFAULT_PERMS = ALL_PERMISSIONS.map(p => p.key)

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  /**
   * Task 6 — after any role / permission change we must invalidate every
   * cached view of the user's identity: server components (sidebar, dashboard,
   * navigation) via router.refresh(), plus any stale cached permissions kept
   * in the browser.
   */
  function refreshApp() {
    try {
      localStorage.removeItem('permissions')
      localStorage.removeItem('userRole')
      sessionStorage.removeItem('permissions')
    } catch { /* ignore */ }
    router.refresh()
  }

  const [editing, setEditing] = useState<Role | null>(null)
  const [formName, setFormName] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formPerms, setFormPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/roles')
    const data = await res.json()
    setRoles(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(role: Role) {
    setEditing(role)
    setFormName(role.name)
    setFormLabel(role.label ?? '')
    try { setFormPerms(JSON.parse(role.permissions ?? '[]')) }
    catch { setFormPerms([]) }
    setShowForm(true)
  }

  function startNew() {
    setEditing(null)
    setFormName('')
    setFormLabel('')
    setFormPerms([])
    setShowForm(true)
  }

  function togglePerm(key: string) {
    setFormPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  function toggleGroup(keys: string[]) {
    const allSelected = keys.every(k => formPerms.includes(k))
    if (allSelected) setFormPerms(prev => prev.filter(p => !keys.includes(p)))
    else setFormPerms(prev => [...new Set([...prev, ...keys])])
  }

  async function handleSave() {
    if (!formName.trim()) { toast.error('اسم الدور مطلوب'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/roles', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing?.id, name: formName, label: formLabel, permissions: formPerms }),
      })
      if (res.ok) {
        toast.success(editing ? 'تم تعديل الدور بنجاح' : 'تم إنشاء الدور بنجاح')
        refreshApp()
        setShowForm(false)
        load()
      } else {
        toast.error('حدث خطأ أثناء الحفظ')
      }
    } catch { toast.error('حدث خطأ في الاتصال') }
    setSaving(false)
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`هل تريد حذف دور "${name}"؟`)) return
    const res = await fetch('/api/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('تم الحذف'); refreshApp(); load() }
    else toast.error('حدث خطأ')
  }

  const totalCount = ALL_PERMISSIONS.length

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🔐</span> الأدوار والصلاحيات
        </h1>
        <button onClick={startNew}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2">
          + إضافة دور جديد
        </button>
      </div>

      {/* بطاقة توضيحية */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ ملاحظة حول الأدوار</p>
        <p className="text-blue-700 leading-relaxed">
          الأدوار الرئيسية في النظام هي: <strong>مدير (admin)</strong> و<strong>معلم (teacher)</strong> و<strong>ولي أمر (guardian)</strong>.
          يمكنك إنشاء أدوار إضافية مخصصة وتحديد صلاحياتها. الصلاحيات المدرجة هنا تعكس الوظائف الفعلية المتاحة في النظام.
        </p>
      </div>

      {/* نموذج الإضافة / التعديل */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[94vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-800 text-base">
                {editing ? `تعديل دور: ${editing.label ?? editing.name}` : 'إضافة دور جديد'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* الاسمان */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">اسم الدور (برمجي)</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder="مثال: supervisor"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <p className="text-xs text-gray-400 mt-1">حروف إنجليزية وأرقام وشرطات فقط</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">اسم الدور (للعرض)</label>
                  <input value={formLabel} onChange={e => setFormLabel(e.target.value)}
                    placeholder="مثال: مشرف"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* أزرار الاختيار السريع */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">اختيار سريع</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setFormPerms(ADMIN_DEFAULT_PERMS)}
                    className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100">
                    📋 صلاحيات المدير الكاملة
                  </button>
                  <button type="button" onClick={() => setFormPerms(TEACHER_DEFAULT_PERMS)}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                    📋 صلاحيات المعلم الافتراضية
                  </button>
                  <button type="button" onClick={() => setFormPerms(ALL_PERMISSIONS.map(p => p.key))}
                    className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                    تحديد الكل
                  </button>
                  <button type="button" onClick={() => setFormPerms([])}
                    className="text-xs bg-gray-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    إلغاء الكل
                  </button>
                </div>
              </div>

              {/* قائمة الصلاحيات مجمّعة */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">الصلاحيات</label>
                  <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                    {formPerms.length} / {totalCount} محددة
                  </span>
                </div>
                <div className="space-y-3">
                  {PERMISSION_GROUPS.map(group => {
                    const groupKeys = group.items.map(i => i.key)
                    const selectedCount = groupKeys.filter(k => formPerms.includes(k)).length
                    const allSelected = selectedCount === groupKeys.length
                    const someSelected = selectedCount > 0 && !allSelected
                    return (
                      <div key={group.group} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKeys)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-right transition-colors
                            ${allSelected ? 'bg-green-50 text-green-800' : someSelected ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700'}`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{group.icon}</span>
                            <span>{group.group}</span>
                            <span className={`text-xs font-normal px-2 py-0.5 rounded-full
                              ${allSelected ? 'bg-green-200 text-green-700' : someSelected ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                              {selectedCount}/{groupKeys.length}
                            </span>
                          </span>
                          <span className="text-xs text-gray-400">{allSelected ? '✅ كل الصلاحيات' : someSelected ? 'جزئي' : 'اضغط للتحديد'}</span>
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 divide-gray-100">
                          {group.items.map((perm, idx) => (
                            <label key={perm.key}
                              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs sm:text-sm hover:bg-gray-50 transition-colors
                                ${idx % 2 === 0 ? '' : 'sm:border-r border-gray-100'}`}>
                              <input type="checkbox"
                                checked={formPerms.includes(perm.key)}
                                onChange={() => togglePerm(perm.key)}
                                className="rounded text-green-600 flex-shrink-0" />
                              <span className="text-gray-700 leading-tight">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-600 px-5 py-2 rounded-xl text-sm">
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {editing ? '💾 حفظ التعديلات' : '✅ إنشاء الدور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <div className="text-5xl mb-3">🔐</div>
          <p className="text-gray-500 font-medium">لا توجد أدوار مخصصة بعد</p>
          <p className="text-gray-400 text-sm mt-1">أضف دوراً جديداً لتخصيص الصلاحيات</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {roles.map(role => {
            let perms: string[] = []
            try { perms = JSON.parse(role.permissions ?? '[]') } catch { perms = [] }

            // تجميع الصلاحيات حسب القسم للعرض
            const groupedPerms = PERMISSION_GROUPS
              .map(g => ({
                ...g,
                selected: g.items.filter(i => perms.includes(i.key)),
              }))
              .filter(g => g.selected.length > 0)

            return (
              <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                      🔐
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-base">{role.label ?? role.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{role.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {perms.length} / {totalCount} صلاحية
                    </span>
                    <button onClick={() => startEdit(role)}
                      className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm">
                      تعديل
                    </button>
                    <button onClick={() => handleDelete(role.id, role.name)}
                      className="border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm">
                      حذف
                    </button>
                  </div>
                </div>

                {groupedPerms.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">لا توجد صلاحيات محددة لهذا الدور</p>
                ) : (
                  <div className="space-y-2.5">
                    {groupedPerms.map(g => (
                      <div key={g.group}>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                          <span>{g.icon}</span> {g.group}
                          <span className="font-normal text-gray-400">({g.selected.length}/{g.items.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.selected.map(p => (
                            <span key={p.key}
                              className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-100">
                              {p.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
