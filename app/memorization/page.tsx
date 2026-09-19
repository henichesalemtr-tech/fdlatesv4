'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

type Group = { id: number; name: string; groupNumber: string }
type Student = {
  id: number; firstName: string; lastName: string; studentNumber: string
  lastSession?: { rating: string | null; sessionDate: string | null } | null
}
type Surah = { id: number; number: number; name: string; ayahCount: number }
type SessionData = {
  sessions: {
    id: number; sessionDate: string; sessionType: string; fromAyah: number | null
    toAyah: number | null; rating: string | null; notes: string | null
    surahName: string | null; surahId: number | null
  }[]
  homework: {
    fromSurahName: string | null; fromSurahId: number | null
    toSurahId: number | null; toSurahName: string | null
    notes: string | null; isGroupHomework: boolean
    hwMode?: string; hwFromAyah?: number | null; hwToAyah?: number | null; hwUnit?: string | null
  } | null
}

const SESSION_TYPES = [
  { value: 'new', label: 'حفظ جديد' },
  { value: 'review', label: 'مراجعة' },
  { value: 'big_review', label: 'مراجعة كبرى' },
  { value: 'exam', label: 'اختبار' },
  { value: 'other', label: 'غير ذلك' },
]

const SESSION_TYPE_LABELS: Record<string, string> = {
  new: 'حفظ جديد',
  review: 'مراجعة',
  big_review: 'مراجعة كبرى',
  exam: 'اختبار',
  other: 'غير ذلك',
}

const RATINGS = [
  { value: 'excellent', label: 'ممتاز', color: '#16a34a' },
  { value: 'very_good', label: 'جيد جداً', color: '#2563eb' },
  { value: 'good', label: 'جيد', color: '#7c3aed' },
  { value: 'acceptable', label: 'مقبول', color: '#d97706' },
  { value: 'weak', label: 'ضعيف', color: '#dc2626' },
]

const RATING_LABELS: Record<string, string> = {
  excellent: 'ممتاز', very_good: 'جيد جداً', good: 'جيد', acceptable: 'مقبول', weak: 'ضعيف',
}

const QURAN_UNITS = [
  { value: 'ثمن', label: '⅛ ثمن' },
  { value: 'ربع', label: '¼ ربع' },
  { value: 'نصف', label: '½ نصف' },
  { value: 'حزب', label: '◐ حزب' },
  { value: 'جزء', label: '■ جزء' },
]

type RangeMode = 'surah_range' | 'surah_ayahs' | 'unit'

export default function MemorizationPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number | null>(null)
  const [studentData, setStudentData] = useState<SessionData | null>(null)
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const [surahSearchQuery, setSurahSearchQuery] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [sessionDate, setSessionDate] = useState(today)
  const [sessionType, setSessionType] = useState('new')

  const [sessionMode, setSessionMode] = useState<RangeMode>('surah_ayahs')
  const [sessionFromSurah, setSessionFromSurah] = useState('')
  const [sessionToSurah, setSessionToSurah] = useState('')
  const [sessionAyahSurah, setSessionAyahSurah] = useState('')
  const [sessionFromAyah, setSessionFromAyah] = useState('1')
  const [sessionToAyah, setSessionToAyah] = useState('1')
  const [sessionUnit, setSessionUnit] = useState('')
  const [sessionUnitSurah, setSessionUnitSurah] = useState('')

  const [rating, setRating] = useState('')
  const [notes, setNotes] = useState('')

  const [addHomework, setAddHomework] = useState(false)
  const [homeworkType, setHomeworkType] = useState<'individual' | 'group'>('individual')
  const [hwMode, setHwMode] = useState<RangeMode>('surah_range')
  const [hwFromSurah, setHwFromSurah] = useState('')
  const [hwToSurah, setHwToSurah] = useState('')
  const [hwAyahSurah, setHwAyahSurah] = useState('')
  const [hwFromAyah, setHwFromAyah] = useState('1')
  const [hwToAyah, setHwToAyah] = useState('1')
  const [hwUnit, setHwUnit] = useState('')
  const [hwUnitSurah, setHwUnitSurah] = useState('')
  const [hwNotes, setHwNotes] = useState('')

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(data => {
      setGroups(data)
      if (data && data.length > 0) {
        loadGroupStudents(data[0].id)
      }
    })
    fetch('/api/surahs').then(r => r.json()).then(setSurahs)
  }, [])

  const filteredSurahs = surahs.filter(s =>
    s.name.includes(surahSearchQuery.trim()) ||
    s.number.toString().includes(surahSearchQuery.trim())
  )

  // 🚀 التعديل الجوهري لتسريع جلب الطلاب بشكل فوري
  async function loadGroupStudents(gid: number) {
    setSelectedGroupId(gid)
    setLoadingStudents(true)
    setSelectedStudentIdx(null)
    setStudentData(null)
    setMobileView('list')

    try {
      const res = await fetch(`/api/groups/${gid}/students`)
      const rawStudents: Student[] = await res.json()

      // 1. إظهار الطلاب فوراً للواجهة لعدم إبقاء المستخدم ينتظر
      setStudents(rawStudents)
      setLoadingStudents(false)

      // 2. جلب التقييمات في الخلفية بالتوازي (Parallel Requests)
      const enrichedPromises = rawStudents.map(async (s) => {
        try {
          const sdRes = await fetch(`/api/memorization/sessions?studentId=${s.id}`)
          const sd = await sdRes.json()
          return {
            ...s,
            lastSession: sd.sessions?.[0]
              ? { rating: sd.sessions[0].rating, sessionDate: sd.sessions[0].sessionDate }
              : null,
          }
        } catch {
          return s
        }
      })

      const enrichedStudents = await Promise.all(enrichedPromises)
      setStudents(enrichedStudents)
    } catch {
      toast.error('حدث خطأ أثناء تحميل الطلاب')
      setLoadingStudents(false)
    }
  }

  function resetForm() {
    setSessionDate(today); setSessionType('new')

    setSessionMode('surah_ayahs')
    setSessionFromSurah(''); setSessionToSurah('')
    setSessionAyahSurah(''); setSessionFromAyah('1'); setSessionToAyah('1')
    setSessionUnit(''); setSessionUnitSurah('')

    setRating(''); setNotes(''); setAddHomework(false); setHomeworkType('individual')
    setHwMode('surah_range'); setHwFromSurah(''); setHwToSurah('')
    setHwAyahSurah(''); setHwFromAyah('1'); setHwToAyah('1')
    setHwUnit(''); setHwUnitSurah(''); setHwNotes('')
    setSurahSearchQuery('')
  }

  const loadStudentData = useCallback(async (studentId: number) => {
    setLoadingData(true)
    const res = await fetch(`/api/memorization/sessions?studentId=${studentId}`)
    const data = await res.json()
    setStudentData(data)
    setLoadingData(false)
    resetForm()
  }, [today])

  // ── Task 7: edit / delete an existing memorization session ───────────────
  type EditSession = {
    id: number; sessionDate: string; sessionType: string
    surahId: number | null; fromAyah: number | null; toAyah: number | null
    rating: string | null; notes: string | null
  }
  const [editSession, setEditSession] = useState<EditSession | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  function reloadCurrentStudent() {
    if (selectedStudentIdx !== null && students[selectedStudentIdx]) {
      loadStudentData(students[selectedStudentIdx].id)
    }
  }

  async function handleUpdateSession(e: React.FormEvent) {
    e.preventDefault()
    if (!editSession) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/memorization/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSession.id,
          sessionDate: editSession.sessionDate,
          sessionType: editSession.sessionType,
          surahId: editSession.surahId,
          fromAyah: editSession.fromAyah,
          toAyah: editSession.toAyah,
          rating: editSession.rating,
          notes: editSession.notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('تم تعديل الجلسة')
        setEditSession(null)
        reloadCurrentStudent()
      } else {
        toast.error(data.error ?? 'حدث خطأ أثناء التعديل')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
    setSavingEdit(false)
  }

  async function handleDeleteSession(id: number) {
    if (!confirm('هل تريد حذف هذه الجلسة؟ سيتم تحديث التقارير والإحصائيات تلقائياً.')) return
    try {
      const res = await fetch(`/api/memorization/sessions?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('تم حذف الجلسة')
        reloadCurrentStudent()
      } else {
        toast.error(data.error ?? 'حدث خطأ أثناء الحذف')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
  }

  useEffect(() => {
    if (selectedStudentIdx !== null && students[selectedStudentIdx]) {
      loadStudentData(students[selectedStudentIdx].id)
    }
  }, [selectedStudentIdx, students, loadStudentData])

  function buildSessionPayload() {
    let surahIdPayload: string | null = null
    let fromAyahPayload: string | null = null
    let toAyahPayload: string | null = null
    let combinedNotes = notes.trim()

    if (sessionMode === 'surah_range') {
      surahIdPayload = sessionFromSurah || null
      const fromS = surahs.find(x => x.id === parseInt(sessionFromSurah))
      const toS = surahs.find(x => x.id === parseInt(sessionToSurah))
      if (fromS && toS) {
        const desc = `من سورة ${fromS.name} إلى سورة ${toS.name}`
        combinedNotes = combinedNotes ? `${desc} — ${combinedNotes}` : desc
      }
    } else if (sessionMode === 'surah_ayahs') {
      surahIdPayload = sessionAyahSurah || null
      fromAyahPayload = sessionFromAyah || null
      toAyahPayload = sessionToAyah || null
    } else if (sessionMode === 'unit') {
      surahIdPayload = sessionUnitSurah || null
      const s = surahs.find(x => x.id === parseInt(sessionUnitSurah))
      const desc = s ? `${sessionUnit} من سورة ${s.name}` : sessionUnit
      combinedNotes = combinedNotes ? `${desc} — ${combinedNotes}` : desc
    }

    return {
      surahId: surahIdPayload,
      fromAyah: fromAyahPayload,
      toAyah: toAyahPayload,
      notes: combinedNotes || null
    }
  }

  function buildHomeworkNotes(): string {
    const base = hwNotes.trim()
    if (hwMode === 'surah_ayahs') {
      const s = surahs.find(x => x.id === parseInt(hwAyahSurah))
      if (s) {
        const auto = `سورة ${s.name} من الآية ${hwFromAyah} إلى الآية ${hwToAyah}`
        return base ? `${auto} — ${base}` : auto
      }
    }
    if (hwMode === 'unit' && hwUnit) {
      const s = surahs.find(x => x.id === parseInt(hwUnitSurah))
      const auto = s ? `${hwUnit} من سورة ${s.name}` : hwUnit
      return base ? `${auto} — ${base}` : auto
    }
    return base
  }

  function getHomeworkPayload() {
    if (!addHomework) return {}
    if (hwMode === 'surah_range') {
      return { fromSurahId: hwFromSurah || null, toSurahId: hwToSurah || null, homeworkNotes: hwNotes || null }
    }
    if (hwMode === 'surah_ayahs') {
      return {
        fromSurahId: hwAyahSurah || null, toSurahId: hwAyahSurah || null,
        hwFromAyah: hwFromAyah || null, hwToAyah: hwToAyah || null,
        homeworkNotes: buildHomeworkNotes(),
      }
    }
    if (hwMode === 'unit') {
      return { fromSurahId: hwUnitSurah || null, toSurahId: hwUnitSurah || null, hwUnit, homeworkNotes: buildHomeworkNotes() }
    }
    return {}
  }

  async function handleSave(goNext: boolean) {
    if (selectedStudentIdx === null) return
    const student = students[selectedStudentIdx]
    setSaving(true)

    const sessionPayload = buildSessionPayload()

    try {
      const res = await fetch('/api/memorization/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id, groupId: selectedGroupId,
          sessionDate, sessionType,
          ...sessionPayload,
          rating: rating || null,
          homeworkType: addHomework ? homeworkType : null,
          ...getHomeworkPayload(),
        }),
      })

      if (res.ok) {
        toast.success(`تم حفظ بيانات ${student.firstName} ${student.lastName}`)
        setStudents(prev => prev.map((s, i) =>
          i === selectedStudentIdx
            ? { ...s, lastSession: { rating: rating || null, sessionDate } }
            : s
        ))
        if (goNext) {
          const next = selectedStudentIdx + 1
          if (next < students.length) {
            setSelectedStudentIdx(next)
            setMobileView('detail')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          } else {
            toast.info('انتهت قائمة الطلاب')
            setMobileView('list')
          }
        } else {
          await loadStudentData(student.id)
        }
      } else {
        toast.error('حدث خطأ أثناء الحفظ')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالسيرفر')
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent = selectedStudentIdx !== null ? students[selectedStudentIdx] : null
  const getRatingColor = (r: string | null) => RATINGS.find(x => x.value === r)?.color ?? '#9ca3af'
  const sessionAyahSurahObj = surahs.find(x => x.id === parseInt(sessionAyahSurah))
  const hwAyahSurahObj = surahs.find(x => x.id === parseInt(hwAyahSurah))

  const StudentListPanel = (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm">قائمة الطلاب ({students.length})</h3>
        {selectedStudentIdx !== null && (
          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            {selectedStudentIdx + 1}/{students.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingStudents ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center text-gray-400 p-6 text-sm">اختر فوجاً أو لا يوجد طلاب</div>
        ) : (
          students.map((student, idx) => {
            const isSelected = selectedStudentIdx === idx
            const lr = student.lastSession?.rating
            return (
              <button
                key={student.id}
                onClick={() => {
                  setSelectedStudentIdx(idx)
                  setMobileView('detail')
                }}
                className="w-full text-right px-3 py-3 border-b border-gray-100 transition-all hover:bg-gray-50"
                style={isSelected
                  ? { background: '#f0fdf4', borderRight: '3px solid #16a34a' }
                  : { borderRight: '3px solid transparent' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: isSelected ? '#16a34a' : '#f3f4f6', color: isSelected ? 'white' : '#6b7280' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{student.firstName} {student.lastName}</div>
                    <div className="text-xs text-gray-400 font-mono">{student.studentNumber}</div>
                  </div>
                  {lr ? (
                    <span className="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ background: getRatingColor(lr) }}>
                      {RATING_LABELS[lr] ?? lr}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">انتظار</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const DetailPanel = (
    <div className="flex-1 lg:overflow-y-auto space-y-4 pb-20 lg:pb-0">
      {!selectedStudent ? (
        <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center text-center text-gray-400 py-20">
          <div>
            <div className="text-5xl mb-3">👤</div>
            <p className="text-sm">اختر طالباً من القائمة للبدء في تسجيل التقييم</p>
          </div>
        </div>
      ) : loadingData ? (
        <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-700 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {selectedStudent.firstName[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-mono">{selectedStudent.studentNumber}</span>
                </div>
              </div>
              {studentData?.homework ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-sm max-w-xs w-full sm:w-auto">
                  <div className="font-semibold text-green-800 mb-1 text-xs">🏠 الواجب الحالي</div>
                  <div className="text-green-700 text-xs">
                    {studentData.homework.isGroupHomework && (
                      <span className="bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded me-1">فوج</span>
                    )}
                    من سورة <strong>{studentData.homework.fromSurahName}</strong>
                    {studentData.homework.toSurahName && studentData.homework.toSurahName !== studentData.homework.fromSurahName && (
                      <> إلى <strong>{studentData.homework.toSurahName}</strong></>
                    )}
                  </div>
                  {studentData.homework.notes && (
                    <div className="text-gray-500 text-xs mt-1">{studentData.homework.notes}</div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-400">
                  لا يوجد واجب حالياً
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">✏️ تسجيل حصة حفظ جديدة</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">تاريخ الحصة</label>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">نوع التسميع</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4 p-3 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <label className="text-sm font-medium text-gray-700 block">مقدار التسميع / الحفظ</label>
              
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { v: 'surah_range', label: '📚 نطاق سور' },
                  { v: 'surah_ayahs', label: '📌 سورة + آيات' },
                  { v: 'unit', label: '🗂️ وحدة' },
                ] as { v: RangeMode; label: string }[]).map(({ v, label }) => (
                  <button key={v} type="button"
                    onClick={() => setSessionMode(v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                    style={sessionMode === v
                      ? { background: '#16a34a', color: 'white', borderColor: '#16a34a' }
                      : { borderColor: '#d1d5db', color: '#6b7280', background: 'white' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  placeholder="🔍 ابحث عن السورة برقمها أو اسمها لتصفية الخيارات..."
                  value={surahSearchQuery}
                  onChange={e => setSurahSearchQuery(e.target.value)}
                  className="w-full border border-green-200 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
                />
              </div>

              {sessionMode === 'surah_range' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">من سورة</label>
                    <select value={sessionFromSurah} onChange={e => setSessionFromSurah(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                      <option value="">-- اختر --</option>
                      {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">إلى سورة</label>
                    <select value={sessionToSurah} onChange={e => setSessionToSurah(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                      <option value="">-- اختر --</option>
                      {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {sessionMode === 'surah_ayahs' && (
                <div className="space-y-2">
                  <select value={sessionAyahSurah} onChange={e => {
                    setSessionAyahSurah(e.target.value)
                    const s = surahs.find(x => x.id === parseInt(e.target.value))
                    if (s) { setSessionFromAyah('1'); setSessionToAyah(String(s.ayahCount)) }
                  }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">-- اختر السورة --</option>
                    {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name} ({s.ayahCount} آية)</option>)}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">من الآية</label>
                      <input type="number" min="1" max={sessionAyahSurahObj?.ayahCount ?? 286}
                        value={sessionFromAyah} onChange={e => setSessionFromAyah(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">إلى الآية</label>
                      <input type="number" min="1" max={sessionToAyah} onChange={e => setSessionToAyah(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {sessionMode === 'unit' && (
                <div className="space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {QURAN_UNITS.map(u => (
                      <button key={u.value} type="button"
                        onClick={() => setSessionUnit(sessionUnit === u.value ? '' : u.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs border-2 font-medium transition-all"
                        style={sessionUnit === u.value
                          ? { background: '#16a34a', color: 'white', borderColor: '#16a34a' }
                          : { borderColor: '#d1d5db', color: '#374151', background: 'white' }}>
                        {u.label}
                      </button>
                    ))}
                  </div>
                  <select value={sessionUnitSurah} onChange={e => setSessionUnitSurah(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">-- ابتداءً من سورة (اختياري) --</option>
                    {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">التقييم</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {RATINGS.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setRating(rating === r.value ? '' : r.value)}
                    className="py-2 px-1 rounded-lg text-xs font-semibold border-2 transition-all text-center"
                    style={rating === r.value
                      ? { background: r.color, color: 'white', borderColor: r.color }
                      : { background: 'white', color: '#374151', borderColor: '#d1d5db' }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-1">ملاحظات التسميع</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="مخارج الحروف، التجويد، الأداء العام…" rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">🏠 الواجب المنزلي القادم</h4>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <span className="text-gray-500 text-xs">تحديد واجب</span>
                  <div
                    onClick={() => setAddHomework(!addHomework)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${addHomework ? 'bg-green-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${addHomework ? 'right-1' : 'left-1'}`} />
                  </div>
                </label>
              </div>

              {addHomework && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(['individual', 'group'] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => setHomeworkType(t)}
                        className="py-2 rounded-lg text-xs font-medium border-2 transition-all"
                        style={homeworkType === t
                          ? t === 'individual'
                            ? { background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }
                            : { background: '#f0fdf4', borderColor: '#16a34a', color: '#15803d' }
                          : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                        {t === 'individual' ? '👤 واجب فردي' : '👥 واجب للفوج'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { v: 'surah_range', label: '📚 نطاق سور' },
                        { v: 'surah_ayahs', label: '📌 سورة + آيات' },
                        { v: 'unit', label: '🗂️ وحدة' },
                      ] as { v: RangeMode; label: string }[]).map(({ v, label }) => (
                        <button key={v} type="button"
                          onClick={() => setHwMode(v)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                          style={hwMode === v
                            ? { background: '#1a5c35', color: 'white', borderColor: '#1a5c35' }
                            : { borderColor: '#d1d5db', color: '#6b7280' }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {hwMode === 'surah_range' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">من سورة</label>
                          <select value={hwFromSurah} onChange={e => setHwFromSurah(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                            <option value="">-- اختر --</option>
                            {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">إلى سورة</label>
                          <select value={hwToSurah} onChange={e => setHwToSurah(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                            <option value="">-- اختر --</option>
                            {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {hwMode === 'surah_ayahs' && (
                      <div className="space-y-2">
                        <select value={hwAyahSurah} onChange={e => {
                          setHwAyahSurah(e.target.value)
                          const s = surahs.find(x => x.id === parseInt(e.target.value))
                          if (s) { setHwFromAyah('1'); setHwToAyah(String(s.ayahCount)) }
                        }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                          <option value="">-- اختر السورة --</option>
                          {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name} ({s.ayahCount} آية)</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" min="1" max={hwAyahSurahObj?.ayahCount ?? 286}
                            value={hwFromAyah} onChange={e => setHwFromAyah(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs" />
                          <input type="number" min="1" max={hwAyahSurahObj?.ayahCount ?? 286}
                            value={hwToAyah} onChange={e => setHwToAyah(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                      </div>
                    )}

                    {hwMode === 'unit' && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5 flex-wrap">
                          {QURAN_UNITS.map(u => (
                            <button key={u.value} type="button"
                              onClick={() => setHwUnit(hwUnit === u.value ? '' : u.value)}
                              className="px-2.5 py-1.5 rounded-lg text-xs border-2 font-medium"
                              style={hwUnit === u.value
                                ? { background: '#1a5c35', color: 'white', borderColor: '#1a5c35' }
                                : { borderColor: '#d1d5db', color: '#374151' }}>
                              {u.label}
                            </button>
                          ))}
                        </div>
                        <select value={hwUnitSurah} onChange={e => setHwUnitSurah(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                          <option value="">-- ابتداءً من سورة (اختياري) --</option>
                          {filteredSurahs.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">ملاحظات الواجب</label>
                      <input type="text" value={hwNotes} onChange={e => setHwNotes(e.target.value)}
                        placeholder="أمثلة: حفظ متقن، مراجعة سريعة..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="w-full sm:flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ فقط'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'احفظ وانتقل إلى الطالب التالي ←'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              📜 سجل جلسات الحفظ السابقة
            </h3>
            {studentData?.sessions && studentData.sessions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {studentData.sessions.map(s => (
                  <div key={s.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-bold text-gray-800 bg-gray-200/60 px-2 py-0.5 rounded">
                        {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                      </span>
                      {s.surahName && (
                        <span className="text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">
                          سورة {s.surahName}
                          {s.fromAyah && s.toAyah ? ` (${s.fromAyah}-${s.toAyah})` : ''}
                        </span>
                      )}
                      {s.notes && <span className="text-gray-500 text-xs block sm:inline">{s.notes}</span>}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-gray-200/60">
                      <span className="text-gray-400 font-mono text-[11px]">{s.sessionDate}</span>
                      {s.rating && (
                        <span className="px-2 py-0.5 rounded-full text-white font-semibold text-[11px]" style={{ background: getRatingColor(s.rating) }}>
                          {RATING_LABELS[s.rating] ?? s.rating}
                        </span>
                      )}
                      <button type="button" title="تعديل الجلسة"
                        onClick={() => setEditSession({
                          id: s.id, sessionDate: s.sessionDate, sessionType: s.sessionType,
                          surahId: s.surahId, fromAyah: s.fromAyah, toAyah: s.toAyah,
                          rating: s.rating, notes: s.notes,
                        })}
                        className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-[11px] font-medium">
                        ✏️ تعديل
                      </button>
                      <button type="button" title="حذف الجلسة"
                        onClick={() => handleDeleteSession(s.id)}
                        className="px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-[11px] font-medium">
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد جلسات حفظ مسجلة لهذا الطالب من قبل.</p>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto min-h-screen flex flex-col">
      {editSession && (
        <div dir="rtl" className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateSession} className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-sm">✏️ تعديل جلسة الحفظ</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">التاريخ</label>
              <input type="date" value={editSession.sessionDate}
                onChange={e => setEditSession(v => v && ({ ...v, sessionDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">نوع الجلسة</label>
              <select value={editSession.sessionType}
                onChange={e => setEditSession(v => v && ({ ...v, sessionType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">السورة</label>
              <select value={editSession.surahId ?? ''}
                onChange={e => setEditSession(v => v && ({ ...v, surahId: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">— بدون —</option>
                {surahs.map(su => <option key={su.id} value={su.id}>{su.number}. {su.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">من آية</label>
                <input type="number" min="1" value={editSession.fromAyah ?? ''}
                  onChange={e => setEditSession(v => v && ({ ...v, fromAyah: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">إلى آية</label>
                <input type="number" min="1" value={editSession.toAyah ?? ''}
                  onChange={e => setEditSession(v => v && ({ ...v, toAyah: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">التقييم</label>
              <select value={editSession.rating ?? ''}
                onChange={e => setEditSession(v => v && ({ ...v, rating: e.target.value || null }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">— بدون تقييم —</option>
                {Object.entries(RATING_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
              <textarea rows={3} value={editSession.notes ?? ''}
                onChange={e => setEditSession(v => v && ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={savingEdit}
                className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-xl py-2 text-sm font-medium">
                {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button type="button" onClick={() => setEditSession(null)}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-medium">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <span className="font-bold text-gray-700 text-sm whitespace-nowrap">اختر الفوج:</span>
          <select
            value={selectedGroupId ?? ''}
            onChange={e => loadGroupStudents(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white flex-1 sm:flex-none"
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>فوج {g.name} ({g.groupNumber})</option>
            ))}
          </select>
        </div>

        <div className="flex lg:hidden gap-2 w-full sm:w-auto">
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobileView === 'list' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}
          >
            📋 قائمة الطلاب
          </button>
          <button
            onClick={() => setMobileView('detail')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobileView === 'detail' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}
          >
            ✏️ التسميع والتقييم
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        <div className={`lg:block ${mobileView === 'list' ? 'block' : 'hidden'}`}>
          {StudentListPanel}
        </div>
        <div className={`lg:col-span-2 lg:block ${mobileView === 'detail' ? 'block' : 'hidden'}`}>
          {DetailPanel}
        </div>
      </div>
    </div>
  )
}
