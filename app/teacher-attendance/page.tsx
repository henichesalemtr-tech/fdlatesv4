'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

type TeacherWithAttendance = {
  id: number; teacherNumber: string; fullName: string; phone: string | null
  attendance: {
    id: number; status: string; checkInTime: string | null; method: string | null
  } | null
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'حاضر', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'late', label: 'متأخر', color: '#d97706', bg: '#fffbeb' },
  { value: 'absent', label: 'غائب', color: '#dc2626', bg: '#fef2f2' },
]

export default function TeacherAttendancePage() {
  const [teachers, setTeachers] = useState<TeacherWithAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState<number | null>(null)
  const [barcodeMode, setBarcodeMode] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'notfound'>('idle')
  const [scannedTeacher, setScannedTeacher] = useState<TeacherWithAttendance | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const barcodeBuffer = useRef('')

  async function loadTeachers(d: string) {
    setLoading(true)
    const res = await fetch(`/api/teacher-attendance?date=${d}`)
    const data = await res.json()
    setTeachers(data)
    setLoading(false)
  }

  useEffect(() => { loadTeachers(date) }, [date])

  async function handleStatus(teacherId: number, status: string) {
    setSaving(teacherId)
    const checkInTime = status === 'present' || status === 'late'
      ? new Date().toTimeString().slice(0, 5) : null
    const res = await fetch('/api/teacher-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, date, status, checkInTime, method: 'manual' }),
    })
    if (res.ok) {
      setTeachers(prev => prev.map(t =>
        t.id === teacherId
          ? { ...t, attendance: { id: 0, status, checkInTime, method: 'manual' } }
          : t
      ))
      const t = teachers.find(x => x.id === teacherId)
      toast.success(`تم تسجيل ${STATUS_OPTIONS.find(s => s.value === status)?.label ?? status} للأستاذ ${t?.fullName}`)
    }
    setSaving(null)
  }

  // Barcode scan handler
  useEffect(() => {
    if (!barcodeMode) return
    barcodeBuffer.current = ''

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        const barcode = barcodeBuffer.current.trim()
        barcodeBuffer.current = ''
        if (barcode) {
          const found = teachers.find(t => t.teacherNumber === barcode)
          if (found) {
            setScannedTeacher(found)
            setScanStatus('found')
          } else {
            setScannedTeacher(null)
            setScanStatus('notfound')
          }
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [barcodeMode, teachers])

  async function confirmBarcodeScan(status: string) {
    if (!scannedTeacher) return
    await handleStatus(scannedTeacher.id, status)
    setScanStatus('idle')
    setScannedTeacher(null)
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  async function handleAutoAbsent() {
    const res = await fetch('/api/teacher-attendance', { method: 'PUT' })
    const data = await res.json()
    toast.success(`تم تسجيل ${data.markedAbsent} معلمين كغائبين تلقائياً`)
    loadTeachers(date)
  }

  const stats = {
    present: teachers.filter(t => t.attendance?.status === 'present').length,
    late: teachers.filter(t => t.attendance?.status === 'late').length,
    absent: teachers.filter(t => t.attendance?.status === 'absent').length,
    unrecorded: teachers.filter(t => !t.attendance).length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>  </span> حضور المعلمين
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoAbsent}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            ⚡ تغيب تلقائي
          </button>
          <button
            onClick={() => setBarcodeMode(!barcodeMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${barcodeMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-300'}`}>
            📊 {barcodeMode ? 'إيقاف الباركود' : 'تفعيل الباركود'}
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'حاضر', value: stats.present, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'متأخر', value: stats.late, color: '#d97706', bg: '#fffbeb' },
          { label: 'غائب', value: stats.absent, color: '#dc2626', bg: '#fef2f2' },
          { label: 'لم يُسجل', value: stats.unrecorded, color: '#6b7280', bg: '#f9fafb' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: s.bg, borderColor: s.color + '33' }}>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm font-medium text-gray-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barcode scan panel */}
      {barcodeMode && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="font-bold text-blue-800">وضع قراءة الباركود / QR</h3>
              <p className="text-sm text-blue-600">وجّه الماسح الضوئي نحو شارة المعلم أو اكتب رقمه يدوياً ثم اضغط Enter</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="في انتظار المسح..."
              onChange={e => { barcodeBuffer.current = e.target.value }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  ;(e.target as HTMLInputElement).value = ''
                  const found = teachers.find(t => t.teacherNumber === val)
                  if (found) { setScannedTeacher(found); setScanStatus('found') }
                  else { setScannedTeacher(null); setScanStatus('notfound') }
                }
              }}
              className="flex-1 border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          </div>
          {scanStatus === 'found' && scannedTeacher && (
            <div className="mt-3 bg-white border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">{scannedTeacher.fullName}</p>
                <p className="text-xs text-gray-500 font-mono">{scannedTeacher.teacherNumber}</p>
              </div>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => confirmBarcodeScan(s.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{ background: s.color }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {scanStatus === 'notfound' && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              لم يُعثر على معلم بهذا الرقم. تحقق من الباركود وأعد المحاولة.
            </div>
          )}
        </div>
      )}

      {/* Teacher list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-gray-700 text-sm sm:text-base">
            قائمة المعلمين — {new Date(date).toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <span className="text-sm text-gray-500">{teachers.length} معلم</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا يوجد معلمون نشطون</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teachers.map(teacher => {
              const att = teacher.attendance
              const currentStatus = att?.status ?? null
              return (
                <div key={teacher.id} className="flex items-start gap-3 px-3 sm:px-4 py-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                    {teacher.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">{teacher.fullName}</div>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-400">
                      <span className="font-mono">{teacher.teacherNumber}</span>
                      {teacher.phone && <span>• {teacher.phone}</span>}
                      {att?.checkInTime && <span>• دخل {att.checkInTime}</span>}
                      {att?.method === 'auto' && <span className="text-orange-500">• تلقائي</span>}
                    </div>
                    {/* Mobile: show status buttons below info */}
                    <div className="flex gap-1.5 mt-2 sm:hidden flex-wrap">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s.value}
                          disabled={saving === teacher.id}
                          onClick={() => handleStatus(teacher.id, s.value)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all min-w-[56px]"
                          style={currentStatus === s.value
                            ? { background: s.color, color: 'white', borderColor: s.color }
                            : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: buttons inline */}
                  <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        disabled={saving === teacher.id}
                        onClick={() => handleStatus(teacher.id, s.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                        style={currentStatus === s.value
                          ? { background: s.color, color: 'white', borderColor: s.color }
                          : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
