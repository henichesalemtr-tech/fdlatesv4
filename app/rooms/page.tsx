'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Room = {
  id: number
  name: string
  roomNumber: string | null
  floor: string | null
  capacity: number | null
  status: string
  equipment: string | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'متاحة', color: 'bg-green-500 text-white' },
  occupied: { label: 'مشغولة', color: 'bg-yellow-400 text-gray-800' },
  maintenance: { label: 'صيانة', color: 'bg-gray-400 text-white' },
}

const emptyForm = { name: '', roomNumber: '', floor: '', capacity: '', status: 'available', equipment: '' }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  async function fetchRooms() {
    setLoading(true)
    const res = await fetch('/api/rooms')
    const data = await res.json()
    setRooms(data)
    setLoading(false)
  }

  useEffect(() => { fetchRooms() }, [])

  function openAdd() {
    setEditRoom(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  function openEdit(r: Room) {
    setEditRoom(r)
    setForm({
      name: r.name,
      roomNumber: r.roomNumber ?? '',
      floor: r.floor ?? '',
      capacity: r.capacity?.toString() ?? '',
      status: r.status,
      equipment: r.equipment ?? '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editRoom ? `/api/rooms/${editRoom.id}` : '/api/rooms'
    const method = editRoom ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editRoom ? 'تم تحديث القاعة' : 'تم إضافة القاعة')
      setShowForm(false)
      fetchRooms()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه القاعة؟')) return
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('تم حذف القاعة')
      fetchRooms()
    }
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            رجوع →
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>+</span>
            {editRoom ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}
          </h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم القاعة *</label>
                <input
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: قاعة النور"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم القاعة</label>
                <input
                  value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                  placeholder="مثال: 101"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الطابق</label>
                <input
                  value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                  placeholder="مثال: الطابق الأول"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">السعة (عدد الطلاب)</label>
                <input
                  type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="مثال: 25"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الحالة</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                  <option value="available">متاحة</option>
                  <option value="occupied">مشغولة</option>
                  <option value="maintenance">صيانة</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">التجهيزات والملاحظات</label>
              <textarea
                value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
                placeholder="سبورة، مكيف، مقاعد..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none"
              />
            </div>
            <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              💾 حفظ القاعة
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          + إضافة قاعة جديدة
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🏛</span> إدارة القاعات
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-right text-gray-600">#</th>
                <th className="p-3 text-right text-gray-600">اسم القاعة</th>
                <th className="p-3 text-right text-gray-600">رقم القاعة</th>
                <th className="p-3 text-right text-gray-600">الطابق</th>
                <th className="p-3 text-right text-gray-600">السعة</th>
                <th className="p-3 text-right text-gray-600">الحالة</th>
                <th className="p-3 text-right text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((r, idx) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-500">{idx + 1}</td>
                  <td className="p-3 font-medium text-gray-800">{r.name}</td>
                  <td className="p-3 text-gray-600">{r.roomNumber ?? '-'}</td>
                  <td className="p-3 text-gray-600">{r.floor ?? '-'}</td>
                  <td className="p-3 text-gray-600">{r.capacity ? `${r.capacity} طالب` : '-'}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[r.status]?.color ?? 'bg-gray-200'}`}>
                      {statusConfig[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(r.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(r)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rooms.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد قاعات مضافة</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
