'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), { ssr: false })

type NotificationItem = {
  id: number; title: string; body: string
  targetType: string; targetIds: string | null
  notificationType: string; createdAt: string; isRead: boolean
  senderName: string | null; senderUsername: string | null
  receptionAccounts: number; receptionDevices: number
}
type GuardianOption = { id: number; fullName: string | null; username: string; role: string; studentNames?: string }
type UserOption = { id: number; fullName: string | null; username: string; role: string }

const targetTypeLabels: Record<string, string> = {
  all: 'الجميع', teachers: 'المعلمون', guardians: 'أولياء الأمور', specific: 'محددون',
}

export default function NotificationsPage() {
  const [role, setRole] = useState<'admin' | 'teacher' | ''>('')
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'all'>('manual')
  const [viewMode, setViewMode] = useState<'received' | 'sent' | 'auto'>('received')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [myGuardians, setMyGuardians] = useState<GuardianOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [form, setForm] = useState({
    title: '', body: '', targetType: 'all', selectedIds: [] as number[], sendPush: true,
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setRole(d.role) }).catch(() => {})
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (viewMode === 'received') params.set('forMe', '1')
    if (activeTab === 'manual' || activeTab === 'auto') params.set('type', activeTab)
    if (search) params.set('search', search)
    const res = await fetch(`/api/notifications?${params}`)
    const data = await res.json()
    setNotifications(Array.isArray(data) ? data : [])
    setSelectedIds([])
    setLoading(false)
  }, [viewMode, activeTab, search])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function openModal() {
    if (role === 'teacher') {
      const res = await fetch('/api/notifications/my-guardians')
      const data = await res.json()
      setMyGuardians(Array.isArray(data) ? data : [])
      setForm({ title: '', body: '', targetType: 'myGuardians', selectedIds: [], sendPush: true })
    } else {
      const res = await fetch('/api/users')
      const data = await res.json()
      setAllUsers(Array.isArray(data) ? data : [])
      setForm({ title: '', body: '', targetType: 'all', selectedIds: [], sendPush: true })
    }
    setShowModal(true)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    const res = await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, body: form.body,
        targetType: form.targetType,
        targetIds: form.targetType === 'specific' ? form.selectedIds : null,
        notificationType: 'manual',
      }),
    })
    if (res.ok) {
      const n = await res.json().catch(() => null)
      // Web Push is triggered server-side when the notification is saved.
      if (form.sendPush && n?.push?.sent > 0) toast.success(`✅ وصل الإشعار لـ ${n.push.sent} جهاز`)
    }
    if (res.ok) {
      toast.success('تم إرسال الإشعار بنجاح')
      setShowModal(false)
      fetchNotifications()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'حدث خطأ أثناء الإرسال')
    }
    setSending(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('هل تريد حذف هذا الإشعار؟')) return
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchNotifications() }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    if (!confirm(`هل تريد حذف ${selectedIds.length} إشعار؟`)) return
    setBulkDeleting(true)
    const res = await fetch('/api/notifications', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    })
    if (res.ok) {
      const d = await res.json()
      toast.success(`تم حذف ${d.deleted} إشعار`)
      fetchNotifications()
    } else { toast.error('حدث خطأ في الحذف') }
    setBulkDeleting(false)
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selectedIds.length === notifications.length) setSelectedIds([])
    else setSelectedIds(notifications.map(n => n.id))
  }

  function toggleId(id: number) {
    setForm(f => ({
      ...f, selectedIds: f.selectedIds.includes(id)
        ? f.selectedIds.filter(x => x !== id) : [...f.selectedIds, id],
    }))
  }

  const teachers = allUsers.filter(u => u.role === 'teacher')
  const guardians = allUsers.filter(u => u.role === 'guardian')
  const adminTargetOptions = [
    { value: 'all', label: 'الجميع', desc: 'كل المعلمين وأولياء الأمور' },
    { value: 'teachers', label: 'المعلمون', desc: `${teachers.length} معلم` },
    { value: 'guardians', label: 'أولياء الأمور', desc: `${guardians.length} ولي أمر` },
    { value: 'specific', label: 'محددون', desc: 'اختر يدوياً' },
  ]
  const teacherTargetOptions = [
    { value: 'myGuardians', label: 'أولياء فوجي', desc: `${myGuardians.length} ولي أمر` },
    { value: 'specific', label: 'محددون', desc: 'اختر من فوجك' },
  ]
  const targetOptions = role === 'teacher' ? teacherTargetOptions : adminTargetOptions

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">🔔 الإشعارات</h1>
        <button onClick={openModal}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors">
          📤 إرسال إشعار
        </button>
      </div>

      {/* Push Enable */}
      <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">📱 إشعارات المتصفح</p>
        <PushEnableButton />
      </div>

      {/* View Mode tabs (received / sent) */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['received', 'sent'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${viewMode === v ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {v === 'received' ? '📥 الواردة' : '📤 المرسلة'}
          </button>
        ))}
      </div>

      {/* Type Tabs (auto / manual) */}
      <div className="flex gap-2 mb-4">
        {[{ v: 'manual' as const, label: '💬 الإشعارات العامة' }, { v: 'auto' as const, label: '🤖 الغياب والتأخر' }].map(t => (
          <button key={t.v} onClick={() => setActiveTab(t.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t.v ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Bulk Delete */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الإشعارات..."
            className="w-full border border-gray-300 rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">
            🗑 حذف ({selectedIds.length})
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
          جاري التحميل...
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-4xl mb-3">🔕</div>
          <p className="text-gray-400 text-sm">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <label className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={selectedIds.length === notifications.length && notifications.length > 0}
              onChange={toggleSelectAll} className="w-4 h-4 accent-green-600 rounded" />
            تحديد الكل
          </label>

          {notifications.map(n => (
            <div key={n.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 shadow-sm transition-all ${selectedIds.includes(n.id) ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:shadow-md'}`}>
              <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => toggleSelect(n.id)}
                className="w-4 h-4 accent-green-600 mt-1 flex-shrink-0 rounded" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{n.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mt-0.5">{n.body}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${n.isRead ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
                      {n.isRead ? 'مقروء' : 'جديد'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-3 mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {n.senderName && (
                    <span className="text-xs text-gray-400">من: {n.senderName}</span>
                  )}
                  <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                    {targetTypeLabels[n.targetType] ?? n.targetType}
                  </span>
                  {/* Reception Counter */}
                  {viewMode === 'sent' && (n.receptionAccounts > 0 || n.receptionDevices > 0) && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      ✅ {n.receptionAccounts} حساب · {n.receptionDevices} جهاز
                    </span>
                  )}
                </div>
              </div>
              {(role === 'admin' || viewMode === 'sent') && (
                <button onClick={() => handleDelete(n.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0">
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Send Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">📤 إرسال إشعار جديد</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <form onSubmit={handleSend} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الإشعار *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان الإشعار..." required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نص الإشعار *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="اكتب نص الإشعار هنا..." rows={3} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer">
                <input type="checkbox" checked={form.sendPush} onChange={e => setForm(f => ({ ...f, sendPush: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-700">📱 إرسال كإشعار متصفح (Web Push)</p>
                  <p className="text-xs text-blue-500">يصل حتى لو كان المتصفح مغلقاً</p>
                </div>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إرسال إلى</label>
                {role === 'teacher' && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                    ⚠️ يمكنك الإرسال لأولياء أمور طلاب أفواجك فقط
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {targetOptions.map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${form.targetType === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.targetType === opt.value ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                        {form.targetType === opt.value && <span className="text-white text-[8px]">✓</span>}
                      </div>
                      <input type="radio" name="targetType" value={opt.value}
                        checked={form.targetType === opt.value}
                        onChange={e => setForm(f => ({ ...f, targetType: e.target.value, selectedIds: [] }))}
                        className="sr-only" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {form.targetType === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر المستخدمين <span className="text-green-600">({form.selectedIds.length} محدد)</span>
                  </label>
                  <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
                    {(role === 'teacher' ? myGuardians : allUsers.filter(u => u.role !== 'admin')).map(u => (
                      <label key={u.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${form.selectedIds.includes(u.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${form.selectedIds.includes(u.id) ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                          {form.selectedIds.includes(u.id) && <span className="text-white text-[8px] flex items-center justify-center h-full">✓</span>}
                        </div>
                        <input type="checkbox" checked={form.selectedIds.includes(u.id)} onChange={() => toggleId(u.id)} className="sr-only" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.fullName ?? u.username}</p>
                        </div>
                        <span className="text-xs text-gray-400">{u.role === 'teacher' ? 'معلم' : 'ولي أمر'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={sending || (form.targetType === 'specific' && form.selectedIds.length === 0)}
                  className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                  {sending ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> إرسال...</> : '📤 إرسال الإشعار'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
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
