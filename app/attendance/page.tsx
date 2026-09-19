'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Group = { id: number; name: string; groupNumber: string }
type Schedule = {
  id: number; dayOfWeek: string; startTime: string; endTime: string
  groupId: number | null; groupName: string | null; subjectName: string | null; teacherName: string | null
}
type Student = { id: number; studentNumber: string; firstName: string; lastName: string }

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'حاضر', color: 'text-green-700', bg: 'bg-green-100 border-green-400' },
  absent: { label: 'غائب', color: 'text-red-700', bg: 'bg-red-100 border-red-400' },
  late: { label: 'متأخر', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-400' },
  excused: { label: 'مبرر', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-400' },
}

export default function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [autoNotify, setAutoNotify] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/schedules').then(r => r.json()),
    ]).then(([grp, sch]) => { setGroups(grp); setSchedules(sch) })
  }, [])

  async function loadAttendance() {
    if (!selectedGroup) return
    setLoading(true)
    const res = await fetch(`/api/attendance?date=${date}&groupId=${selectedGroup}`)
    const data = await res.json()
    setStudents(data.students ?? [])
    const attMap: Record<number, string> = {}
    const notesMap: Record<number, string> = {}
    for (const rec of (data.attendance ?? [])) {
      attMap[rec.studentId] = rec.status
    }
    for (const s of (data.students ?? [])) {
      if (!attMap[s.id]) attMap[s.id] = 'present'
    }
    setAttendance(attMap)
    setNotes(notesMap)
    setLoading(false)
  }

  useEffect(() => {
    if (selectedGroup) loadAttendance()
  }, [selectedGroup, date])

  async function sendAbsenceAlerts() {
    setSendingAlert(true)
    try {
      const res = await fetch('/api/notifications/absence-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          scheduleId: selectedSchedule ? parseInt(selectedSchedule) : null,
          groupId: selectedGroup ? parseInt(selectedGroup) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.sent === 0) {
          toast.info('لا يوجد غياب مسجّل لإرسال إشعارات عنه')
        } else {
          toast.success(
            `✅ تم إرسال ${data.sent} إشعار داخلي` +
            (data.pushSent > 0 ? ` و${data.pushSent} إشعار متصفح` : '') +
            ' لأولياء الأمور'
          )
        }
      } else {
        toast.error(data.message ?? 'فشل إرسال الإشعارات')
      }
    } catch {
      toast.error('حدث خطأ في الإرسال')
    }
    setSendingAlert(false)
  }

  async function saveAttendance() {
    if (!students.length) return
    setSaving(true)
    const records = students.map(s => ({
      studentId: s.id,
      status: attendance[s.id] ?? 'present',
      notes: notes[s.id] ?? null,
      scheduleId: selectedSchedule ? parseInt(selectedSchedule) : null,
    }))
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, date }),
    })
    if (res.ok) {
      toast.success('تم حفظ الحضور بنجاح')
      // Auto-send absence alerts after saving
      if (autoNotify) {
        const hasAbsent = records.some(r => r.status === 'absent')
        if (hasAbsent) {
          await sendAbsenceAlerts()
        }
      }
    } else {
      toast.error('حدث خطأ في الحفظ')
    }
    setSaving(false)
  }

  const groupSchedules = schedules.filter(s => s.groupId === parseInt(selectedGroup))
  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length
  const lateCount = Object.values(attendance).filter(s => s === 'late').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/attendance/contact"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          📞 الاتصال بالأولياء
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📋</span> إدارة الحضور والغياب
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفوج</label>
            <select value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedSchedule('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">اختر فوجاً...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحصة (اختياري)</label>
            <select value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">بدون حصة محددة</option>
              {groupSchedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.dayOfWeek} {s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)} | {s.subjectName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadAttendance} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
              📋 تحميل الطلاب
            </button>
          </div>
        </div>
      </div>

      {selectedGroup && students.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{students.length}</p>
              <p className="text-sm text-gray-500 mt-1">إجمالي</p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-gray-500 mt-1">حاضر</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{absentCount}</p>
              <p className="text-sm text-gray-500 mt-1">غائب</p>
            </div>
            <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">{lateCount}</p>
              <p className="text-sm text-gray-500 mt-1">متأخر</p>
            </div>
          </div>

          {/* Absence alert banner */}
          {absentCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">🔔</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-orange-800">
                    يوجد {absentCount} طالب{absentCount > 1 ? 'اً' : ''} غائب
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    سيتم إرسال إشعار تلقائي لأولياء أمورهم عند الحفظ
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Auto-notify toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-orange-700 font-medium">تلقائي</span>
                  <button
                    type="button"
                    onClick={() => setAutoNotify(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoNotify ? 'bg-orange-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoNotify ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>
                {/* Manual send button */}
                <button
                  onClick={sendAbsenceAlerts}
                  disabled={sendingAlert}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  {sendingAlert ? (
                    <><span className="animate-spin">⏳</span> جاري الإرسال...</>
                  ) : (
                    <><span>📨</span> إرسال الآن</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            {loading ? (
              <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-right">#</th>
                    <th className="p-3 text-right">رقم التسجيل</th>
                    <th className="p-3 text-right">اسم الطالب</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s, idx) => (
                    <tr key={s.id} className={`hover:bg-gray-50 ${attendance[s.id] === 'absent' ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-gray-500">{idx + 1}</td>
                      <td className="p-3 font-mono text-xs">{s.studentNumber}</td>
                      <td className="p-3 font-medium text-gray-800">{s.firstName} {s.lastName}</td>
                      <td className="p-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(statusLabels).map(([key, val]) => (
                            <button
                              key={key}
                              onClick={() => setAttendance(a => ({ ...a, [s.id]: key }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                attendance[s.id] === key
                                  ? `${val.bg} ${val.color} border-current`
                                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {val.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          value={notes[s.id] ?? ''}
                          onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                          placeholder="ملاحظة..."
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-gray-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveAttendance}
              disabled={saving || sendingAlert}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><span className="animate-spin">⏳</span> جاري الحفظ...</>
              ) : (
                <>
                  <span>💾</span>
                  حفظ الحضور
                  {autoNotify && absentCount > 0 && (
                    <span className="text-xs opacity-75 font-normal">+ إشعار الأولياء تلقائياً</span>
                  )}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {selectedGroup && students.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          لا يوجد طلاب في هذا الفوج أو لم يتم إدراجهم بعد
        </div>
      )}
    </div>
  )
}
