'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Schedule = {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  groupId: number | null
  subjectId: number | null
  teacherId: number | null
  roomId: number | null
  groupName: string | null
  subjectName: string | null
  teacherName: string | null
  roomName: string | null
}

type Group = { id: number; name: string }
type Subject = { id: number; name: string }
type Teacher = { id: number; fullName: string }
type Room = { id: number; name: string }

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAY_ORDER: Record<string, number> = { 'الأحد': 1, 'الإثنين': 2, 'الثلاثاء': 3, 'الأربعاء': 4, 'الخميس': 5, 'الجمعة': 6, 'السبت': 7 }

const DAY_COLORS: Record<string, string> = {
  'الأحد': 'bg-blue-100 text-blue-800',
  'الإثنين': 'bg-green-100 text-green-800',
  'الثلاثاء': 'bg-purple-100 text-purple-800',
  'الأربعاء': 'bg-orange-100 text-orange-800',
  'الخميس': 'bg-red-100 text-red-800',
  'الجمعة': 'bg-yellow-100 text-yellow-800',
  'السبت': 'bg-gray-100 text-gray-800',
}

const emptyForm = { dayOfWeek: 'الأحد', startTime: '', endTime: '', groupId: '', subjectId: '', teacherId: '', roomId: '' }

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genForm, setGenForm] = useState({
    days: [] as string[],
    startTime: '', endTime: '', groupId: '', subjectId: '', teacherId: '', roomId: '',
  })
  const [generating, setGenerating] = useState(false)
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [activeTab, setActiveTab] = useState<'list' | 'weekly'>('list')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  async function fetchAll() {
    setLoading(true)
    const [sch, grp, sub, tch, rm] = await Promise.all([
      fetch('/api/schedules').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/subjects').then(r => r.json()),
      fetch('/api/teachers').then(r => r.json()),
      fetch('/api/rooms').then(r => r.json()),
    ])
    setSchedules(sch)
    setGroups(grp)
    setSubjects(sub)
    setTeachers(tch)
    setRooms(rm)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function openAdd() {
    setEditSchedule(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(s: Schedule) {
    setEditSchedule(s)
    setForm({
      dayOfWeek: s.dayOfWeek ?? 'الأحد',
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      groupId: s.groupId?.toString() ?? '',
      subjectId: s.subjectId?.toString() ?? '',
      teacherId: s.teacherId?.toString() ?? '',
      roomId: s.roomId?.toString() ?? '',
    })
    setShowModal(true)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (genForm.days.length === 0) { toast.error('اختر يوماً واحداً على الأقل'); return }
    setGenerating(true)
    const res = await fetch('/api/schedules/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genForm),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      setShowGenerateModal(false)
      fetchAll()
    } else {
      toast.error(data.message ?? data.error ?? 'حدث خطأ')
    }
    setGenerating(false)
  }

  function toggleDay(day: string) {
    setGenForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editSchedule ? `/api/schedules/${editSchedule.id}` : '/api/schedules'
    const method = editSchedule ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editSchedule ? 'تم تحديث الجدول' : 'تم إضافة الحصة')
      setShowModal(false)
      fetchAll()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return
    const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      toast.success('تم حذف الحصة'); fetchAll()
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAllSelected() {
    setSelectedIds(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(s => s.id)))
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${ids.length} حصص محددة؟`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/schedules', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'فشل حذف الحصص'); return }
      setSelectedIds(new Set())
      toast.success(`تم حذف ${data.deletedCount ?? ids.length} حصص`)
      await fetchAll()
    } catch { toast.error('حدث خطأ أثناء حذف الحصص') }
    finally { setDeleting(false) }
  }

  // Sort schedules by day and time
  const sorted = [...schedules].sort((a, b) => {
    const da = DAY_ORDER[a.dayOfWeek ?? ''] ?? 9
    const db2 = DAY_ORDER[b.dayOfWeek ?? ''] ?? 9
    if (da !== db2) return da - db2
    return (a.startTime ?? '').localeCompare(b.startTime ?? '')
  })

  // Group by day for weekly view
  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = sorted.filter(s => s.dayOfWeek === day)
    return acc
  }, {} as Record<string, Schedule[]>)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            + إضافة حصة
          </button>
          <button onClick={() => setShowGenerateModal(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            ⚡ توليد تلقائي لأيام متعددة
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} disabled={deleting} className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {deleting ? 'جاري الحذف…' : `🗑️ حذف المحدد (${selectedIds.size})`}
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📅</span> الجداول الدراسية
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {[['list', '📋 قائمة الحصص'], ['weekly', '🗓️ عرض أسبوعي']].map(([key, label]) => (
          <button key={key}
            onClick={() => setActiveTab(key as 'list' | 'weekly')}
            className={`px-5 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
              activeTab === key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
      ) : activeTab === 'list' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-right text-gray-600 w-10"><input type="checkbox" checked={sorted.length > 0 && selectedIds.size === sorted.length} onChange={toggleAllSelected} aria-label="تحديد كل الحصص" /></th>
                <th className="p-3 text-right text-gray-600">اليوم</th>
                <th className="p-3 text-right text-gray-600">التوقيت</th>
                <th className="p-3 text-right text-gray-600">الفوج</th>
                <th className="p-3 text-right text-gray-600">المادة</th>
                <th className="p-3 text-right text-gray-600">المعلم</th>
                <th className="p-3 text-right text-gray-600">القاعة</th>
                <th className="p-3 text-right text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(s => (
                <tr key={s.id} className={`hover:bg-gray-50 ${selectedIds.has(s.id) ? 'bg-red-50' : ''}`}>
                  <td className="p-3"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelected(s.id)} aria-label={`تحديد حصة ${s.id}`} /></td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${DAY_COLORS[s.dayOfWeek ?? ''] ?? 'bg-gray-100'}`}>
                      {s.dayOfWeek ?? '-'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-600 dir-ltr text-left">
                    {s.startTime?.slice(0,5)} - {s.endTime?.slice(0,5)}
                  </td>
                  <td className="p-3 font-medium text-gray-800">{s.groupName ?? '-'}</td>
                  <td className="p-3 text-gray-600">{s.subjectName ?? '-'}</td>
                  <td className="p-3 text-gray-600">{s.teacherName ?? '-'}</td>
                  <td className="p-3 text-gray-500">{s.roomName ?? 'غير محدد'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(s)} className="bg-blue-500 text-white p-1.5 rounded text-xs">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">لا توجد حصص مبرمجة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Weekly view */
        <div className="space-y-4">
          {DAYS.map(day => (
            <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2 font-bold text-sm ${DAY_COLORS[day] ?? 'bg-gray-100'}`}>
                {day} ({byDay[day].length} حصة)
              </div>
              {byDay[day].length === 0 ? (
                <div className="p-4 text-center text-gray-300 text-xs">لا توجد حصص</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {byDay[day].map(s => (
                    <div key={s.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelected(s.id)} aria-label={`تحديد حصة ${s.id}`} />
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {s.startTime?.slice(0,5)} - {s.endTime?.slice(0,5)}
                        </span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{s.groupName}</p>
                          <p className="text-xs text-gray-500">{s.subjectName} | {s.teacherName}</p>
                        </div>
                        {s.roomName && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">🏛 {s.roomName}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white p-1 rounded text-xs">🗑️</button>
                        <button onClick={() => openEdit(s)} className="bg-blue-500 text-white p-1 rounded text-xs">✏️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editSchedule ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اليوم *</label>
                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفوج *</label>
                <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                  <option value="">اختر الفوج...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المادة *</label>
                <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                  <option value="">اختر المادة...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المعلم *</label>
                <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                  <option value="">اختر المعلم...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القاعة (اختياري)</label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">بدون قاعة محددة</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">💾 حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-generate modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">⚡ التوليد التلقائي للحصص</h2>
                <p className="text-xs text-gray-500 mt-0.5">اختر أياماً متعددة لتوليد نفس الحصة تلقائياً لكل يوم</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-5">
              {/* Days selection */}
              <div>
                <label className="block text-sm font-bold text-yellow-600 mb-3 border-b pb-2">
                  📅 اختر الأيام المراد التوليد فيها *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <label key={day} className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                      genForm.days.includes(day)
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}>
                      <input type="checkbox" className="hidden" checked={genForm.days.includes(day)} onChange={() => toggleDay(day)} />
                      <span>{genForm.days.includes(day) ? '✅' : '⬜'}</span> {day}
                    </label>
                  ))}
                </div>
                {genForm.days.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">✓ تم اختيار: {genForm.days.join('، ')}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية *</label>
                  <input type="time" value={genForm.startTime} onChange={e => setGenForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية *</label>
                  <input type="time" value={genForm.endTime} onChange={e => setGenForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفوج *</label>
                  <select value={genForm.groupId} onChange={e => setGenForm(f => ({ ...f, groupId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                    <option value="">اختر الفوج...</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المادة *</label>
                  <select value={genForm.subjectId} onChange={e => setGenForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                    <option value="">اختر المادة...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المعلم *</label>
                  <select value={genForm.teacherId} onChange={e => setGenForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
                    <option value="">اختر المعلم...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القاعة</label>
                  <select value={genForm.roomId} onChange={e => setGenForm(f => ({ ...f, roomId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">بدون قاعة</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={generating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {generating ? 'جاري التوليد...' : `⚡ توليد الحصص للأيام المختارة (${genForm.days.length})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
