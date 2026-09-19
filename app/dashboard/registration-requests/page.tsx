'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

type Request = {
  id: number; firstName: string; lastName: string; gender: string | null
  birthDate: string | null; birthPlace: string | null; address: string | null
  phone: string | null; educationalLevel: string | null; guardianName: string | null
  guardianPhone: string | null; guardianRelation: string | null; guardianEmail: string | null
  notes: string | null; status: string; createdAt: string; acceptedStudentId: number | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'مقبول', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
}

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [viewItem, setViewItem] = useState<Request | null>(null)
  const [editItem, setEditItem] = useState<Request | null>(null)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [bulkAccepting, setBulkAccepting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/registration-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  function toggleSelected(id: number) {
    setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  function toggleAll() {
    setSelectedIds(current => current.length === requests.length ? [] : requests.map(request => request.id))
  }

  async function handleBulkAccept() {
    const pendingIds = requests.filter(request => selectedIds.includes(request.id) && request.status === 'pending').map(request => request.id)
    if (pendingIds.length === 0) {
      toast.error('اختر طلباً قيد المراجعة واحداً على الأقل')
      return
    }
    if (!confirm(`هل تريد قبول ${pendingIds.length} طلب وإنشاء سجلات الطلاب؟`)) return
    setBulkAccepting(true)
    try {
      const res = await fetch('/api/registration-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_accept', ids: pendingIds }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`تم قبول ${data.acceptedCount ?? 0} طلب`)
        setSelectedIds([])
        await fetchRequests()
      } else {
        toast.error(data.error ?? 'حدث خطأ أثناء القبول الجماعي')
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم')
    } finally { setBulkAccepting(false) }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      toast.error('اختر طلباً واحداً على الأقل')
      return
    }
    if (!confirm(`هل تريد حذف ${selectedIds.length} طلب نهائياً؟`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/registration-requests', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`تم حذف ${data.deletedCount ?? 0} طلب`)
        setSelectedIds([])
        await fetchRequests()
      } else {
        toast.error(data.error ?? 'حدث خطأ أثناء الحذف الجماعي')
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم')
    } finally { setBulkDeleting(false) }
  }

  async function handleAccept(id: number) {
    if (!confirm('هل تريد قبول هذا الطلب وإنشاء سجل الطالب؟')) return
    setAccepting(id)
    try {
      const res = await fetch(`/api/registration-requests/${id}/accept`, { method: 'POST' })
      if (res.ok) {
        toast.success('تم قبول الطلب وإنشاء سجل الطالب')
        fetchRequests()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'حدث خطأ')
      }
    } finally { setAccepting(null) }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل تريد حذف هذا الطلب؟')) return
    setDeleting(id)
    try {
      await fetch(`/api/registration-requests/${id}`, { method: 'DELETE' })
      toast.success('تم الحذف')
      fetchRequests()
    } finally { setDeleting(null) }
  }

  async function handleSaveEdit() {
    if (!editItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/registration-requests/${editItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      })
      if (res.ok) {
        toast.success('تم الحفظ')
        setEditItem(null)
        fetchRequests()
      } else { toast.error('حدث خطأ في الحفظ') }
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">طلبات التسجيل الإلكترونية</h1>
          <p className="text-sm text-gray-500">{requests.length} طلب مسجل</p>
        </div>
        <a href="/register" target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 bg-green-50 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
          🔗 رابط التسجيل
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>لا توجد طلبات تسجيل بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 bg-gray-50 border-b">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={requests.length > 0 && selectedIds.length === requests.length} onChange={toggleAll}
                className="w-4 h-4 accent-green-600" />
              تحديد الكل
            </label>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">تم تحديد {selectedIds.length}</span>
                <button onClick={handleBulkAccept} disabled={bulkAccepting || bulkDeleting}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                  {bulkAccepting ? 'جاري القبول...' : 'قبول المحدد'}
                </button>
                <button onClick={handleBulkDelete} disabled={bulkAccepting || bulkDeleting}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                  {bulkDeleting ? 'جاري الحذف...' : 'حذف المحدد'}
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 w-12">اختيار</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الاسم الكامل</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">ولي الأمر</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الهاتف</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(r.id) ? 'bg-green-50/60' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelected(r.id)}
                        aria-label={`تحديد طلب ${r.firstName} ${r.lastName}`} className="w-4 h-4 accent-green-600" />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.guardianName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dir-ltr">{r.guardianPhone ?? r.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[r.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[r.status]?.label ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString('ar')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setViewItem(r)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                          عرض
                        </button>
                        <button onClick={() => setEditItem({ ...r })}
                          className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors">
                          تعديل
                        </button>
                        {r.status === 'pending' && (
                          <button onClick={() => handleAccept(r.id)} disabled={accepting === r.id}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 transition-colors">
                            {accepting === r.id ? '...' : 'قبول'}
                          </button>
                        )}
                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                          className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors">
                          {deleting === r.id ? '...' : 'حذف'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">تفاصيل الطلب</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['الاسم', `${viewItem.firstName} ${viewItem.lastName}`],
                ['الجنس', viewItem.gender === 'male' ? 'ذكر' : viewItem.gender === 'female' ? 'أنثى' : '—'],
                ['تاريخ الميلاد', viewItem.birthDate ?? '—'],
                ['مكان الميلاد', viewItem.birthPlace ?? '—'],
                ['المستوى الدراسي', viewItem.educationalLevel ?? '—'],
                ['العنوان', viewItem.address ?? '—'],
                ['الهاتف', viewItem.phone ?? '—'],
                ['ولي الأمر', viewItem.guardianName ?? '—'],
                ['صلة القرابة', viewItem.guardianRelation ?? '—'],
                ['هاتف ولي الأمر', viewItem.guardianPhone ?? '—'],
                ['بريد ولي الأمر', viewItem.guardianEmail ?? '—'],
                ['ملاحظات', viewItem.notes ?? '—'],
                ['الحالة', STATUS_LABELS[viewItem.status]?.label ?? viewItem.status],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-2">
                  <span className="text-gray-500 min-w-[120px]">{k as string}:</span>
                  <span className="text-gray-800 font-medium">{v as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">تعديل الطلب</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">الاسم الأول</label>
                  <input value={editItem.firstName} onChange={e => setEditItem(p => p ? { ...p, firstName: e.target.value } : p)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">اللقب</label>
                  <input value={editItem.lastName} onChange={e => setEditItem(p => p ? { ...p, lastName: e.target.value } : p)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ولي الأمر</label>
                <input value={editItem.guardianName ?? ''} onChange={e => setEditItem(p => p ? { ...p, guardianName: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">هاتف ولي الأمر</label>
                <input value={editItem.guardianPhone ?? ''} onChange={e => setEditItem(p => p ? { ...p, guardianPhone: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الحالة</label>
                <select value={editItem.status} onChange={e => setEditItem(p => p ? { ...p, status: e.target.value } : p)} className={inputCls}>
                  <option value="pending">قيد المراجعة</option>
                  <option value="accepted">مقبول</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea value={editItem.notes ?? ''} onChange={e => setEditItem(p => p ? { ...p, notes: e.target.value } : p)}
                  className={inputCls + ' resize-none'} rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60 transition-colors">
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => setEditItem(null)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
