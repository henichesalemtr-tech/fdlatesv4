'use client'
import { useState, useEffect, useRef } from 'react'
import GuardianLogout from './GuardianLogout'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), { ssr: false })

// ── Types ────────────────────────────────────────────────────────────────────
type AttRecord = { date: string; status: string; notes: string | null }
type MemSession = {
  id: number; sessionDate: string; sessionType: string; rating: string | null
  notes: string | null; fromAyah: number | null; toAyah: number | null; surahName: string | null
}
type StudentData = {
  student: {
    id: number; firstName: string; lastName: string; studentNumber: string
    gender: string | null; educationalLevel: string | null; phone: string | null
    guardianName: string | null; enrollmentDate: string | null; status: string
  }
  groups: { groupId: number; groupName: string | null; teacherName: string | null; teacherPhone: string | null }[]
  attendance: {
    total: number; present: number; absent: number; late: number; rate: number
    thisWeek: AttRecord[]; recent: AttRecord[]
  }
  memorization: {
    sessions: MemSession[]; ratingDist: Record<string, number>; totalSessions: number
  }
  homework: {
    id: number; notes: string | null; isGroupHomework: boolean
    fromSurahName: string | null; toSurahName: string | null; assignedAt: string | null
  } | null
  finance: {
    totalPaid: number; monthPaid: number
    recentPayments: { id: number; amount: string | null; paymentDate: string | null; forMonth: string | null }[]
  }
}
type DashData = {
  students: StudentData[]
  notifications: { id: number; title: string; body: string; createdAt: string | null }[]
}
type NotifFull = { id: number; title: string; body: string; createdAt: string | null; isRead: boolean }
type Conversation = {
  userId: number; unread: number
  lastMessage: { content: string; createdAt: string | null; senderId: number }
  user: { id: number; fullName: string | null; role: string | null }
}
type Message = {
  id: number; content: string; senderId: number; receiverId: number
  createdAt: string | null; isRead: boolean; senderName: string | null
}
type ProfileData = {
  id: number; fullName: string | null; email: string | null
  phone: string | null; username: string; role: string; profession: string | null
}

// ── Config ───────────────────────────────────────────────────────────────────
const RATING_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  excellent:  { label: 'ممتاز',    color: '#16a34a', bg: '#f0fdf4' },
  very_good:  { label: 'جيد جداً', color: '#2563eb', bg: '#eff6ff' },
  good:       { label: 'جيد',      color: '#7c3aed', bg: '#f5f3ff' },
  acceptable: { label: 'مقبول',    color: '#d97706', bg: '#fffbeb' },
  weak:       { label: 'ضعيف',     color: '#dc2626', bg: '#fef2f2' },
}
const SESSION_TYPE_LABELS: Record<string, string> = {
  new: 'حفظ جديد', review: 'مراجعة', big_review: 'مراجعة كبرى', exam: 'اختبار', other: 'غير ذلك',
}
const ATT_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  present: { label: 'حاضر',  color: 'text-green-700 bg-green-50 border-green-200',  dot: 'bg-green-500' },
  absent:  { label: 'غائب',  color: 'text-red-700 bg-red-50 border-red-200',        dot: 'bg-red-500' },
  late:    { label: 'متأخر', color: 'text-amber-700 bg-amber-50 border-amber-200',  dot: 'bg-amber-500' },
  excused: { label: 'مأذون', color: 'text-blue-700 bg-blue-50 border-blue-200',     dot: 'bg-blue-400' },
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ present, absent, late, total }: { present: number; absent: number; late: number; total: number }) {
  if (total === 0) return <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white/60 text-xs">لا بيانات</div>
  const r = 36; const cx = 44; const cy = 44; const circum = 2 * Math.PI * r
  const pPct = present / total; const aPct = absent / total; const lPct = late / total
  let offset = 0
  const segments = [
    { pct: pPct, color: '#4ade80' },
    { pct: aPct, color: '#f87171' },
    { pct: lPct, color: '#fbbf24' },
  ]
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      {segments.map((s, i) => {
        const dash = s.pct * circum
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="10"
            strokeDasharray={`${dash} ${circum - dash}`}
            strokeDashoffset={-offset * circum}
            transform={`rotate(-90 ${cx} ${cy})`} />
        )
        offset += s.pct; return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">
        {Math.round(pPct * 100)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)">حضور</text>
    </svg>
  )
}

// ── Main tabs ──────────────────────────────────────────────────────────────
const MAIN_TABS = [
  { id: 'home',          label: 'الرئيسية',   icon: '🏠' },
  { id: 'messages',      label: 'الرسائل',    icon: '💬' },
  { id: 'notifications', label: 'الإشعارات',  icon: '🔔' },
  { id: 'profile',       label: 'حسابي',      icon: '👤' },
]

const STUDENT_TABS = [
  { id: 'overview',     label: 'نظرة عامة', icon: '🏠' },
  { id: 'memorization', label: 'الحفظ',     icon: '📖' },
  { id: 'attendance',   label: 'الحضور',    icon: '📋' },
  { id: 'homework',     label: 'الواجبات',  icon: '📝' },
  { id: 'finance',      label: 'الرسوم',    icon: '💰' },
]

// ────────────────────────────────────────────────────────────────────────────
export default function GuardianDashboard() {
  const [data, setData]                     = useState<DashData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [activeStudent, setActiveStudent]   = useState(0)
  const [activeTab, setActiveTab]           = useState('overview')
  const [mainTab, setMainTab]               = useState('home')

  // Notifications
  const [notifs, setNotifs]                 = useState<NotifFull[]>([])
  const [notifsLoading, setNotifsLoading]   = useState(false)

  // Messages
  const [conversations, setConversations]   = useState<Conversation[]>([])
  const [convsLoading, setConvsLoading]     = useState(false)
  const [activeConv, setActiveConv]         = useState<Conversation | null>(null)
  const [msgs, setMsgs]                     = useState<Message[]>([])
  const [msgsLoading, setMsgsLoading]       = useState(false)
  const [msgInput, setMsgInput]             = useState('')
  const [sending, setSending]               = useState(false)
  const msgEndRef                           = useRef<HTMLDivElement>(null)

  // Profile
  const [profile, setProfile]               = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileTab, setProfileTab]         = useState<'info' | 'password'>('info')
  const [fullName, setFullName]             = useState('')
  const [email, setEmail]                   = useState('')
  const [phone, setPhone]                   = useState('')
  const [profession, setProfession]         = useState('')
  const [savingProfile, setSavingProfile]   = useState(false)
  const [currentPwd, setCurrentPwd]         = useState('')
  const [newPwd, setNewPwd]                 = useState('')
  const [confirmPwd, setConfirmPwd]         = useState('')
  const [savingPwd, setSavingPwd]           = useState(false)

  // Unread counts
  const [unreadMsgs, setUnreadMsgs]         = useState(0)
  const [unreadNotifs, setUnreadNotifs]     = useState(0)

  // ── Load dashboard data ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/guardian/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
    loadUnreadCounts()
  }, [])

  async function loadUnreadCounts() {
    try {
      const [convsRes, notifsRes] = await Promise.all([
        fetch('/api/messages?inbox=1'),
        fetch('/api/notifications?forMe=1'),
      ])
      const convs = await convsRes.json()
      const notifList: NotifFull[] = await notifsRes.json()
      if (Array.isArray(convs)) setUnreadMsgs(convs.reduce((a: number, c: Conversation) => a + (c.unread || 0), 0))
      if (Array.isArray(notifList)) setUnreadNotifs(notifList.filter(n => !n.isRead).length)
    } catch {}
  }

  // ── Load notifications ───────────────────────────────────────────────────
  async function loadNotifications() {
    setNotifsLoading(true)
    try {
      const res = await fetch('/api/notifications?forMe=1')
      const list: NotifFull[] = await res.json()
      setNotifs(list)
      setUnreadNotifs(list.filter(n => !n.isRead).length)
    } finally { setNotifsLoading(false) }
  }

  async function markNotifRead(id: number) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadNotifs(prev => Math.max(0, prev - 1))
    } catch {}
  }

  // ── Task 5: start a new conversation with my child's teachers only ───────
  const [showNewMsg, setShowNewMsg]         = useState(false)
  const [teacherList, setTeacherList]       = useState<{ id: number; fullName: string | null; role: string }[]>([])
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [showAdminMsg, setShowAdminMsg]     = useState(false)
  const [adminList, setAdminList]           = useState<{ id: number; fullName: string | null; role: string }[]>([])
  const [adminLoading, setAdminLoading]     = useState(false)

  async function openNewMessage() {
    setShowNewMsg(true)
    setTeachersLoading(true)
    try {
      // The API returns teachers + admin users; filter to teachers only for this button
      const res = await fetch('/api/messages')
      const data = await res.json()
      const teachers = Array.isArray(data) ? data.filter((u: { role: string }) => u.role === 'teacher') : []
      setTeacherList(teachers)
    } catch {
      setTeacherList([])
    }
    setTeachersLoading(false)
  }

  async function openAdminMessage() {
    setShowAdminMsg(true)
    setAdminLoading(true)
    try {
      // Filter to admin/supervisor/manager roles only
      const res = await fetch('/api/messages')
      const data = await res.json()
      const admins = Array.isArray(data)
        ? data.filter((u: { role: string }) => ['admin', 'supervisor', 'manager'].includes(u.role))
        : []
      setAdminList(admins)
    } catch {
      setAdminList([])
    }
    setAdminLoading(false)
  }

  function startConversation(user: { id: number; fullName: string | null; role: string }) {
    setShowNewMsg(false)
    setActiveConv({ userId: user.id, user: { id: user.id, fullName: user.fullName, role: user.role }, unread: 0,
      lastMessage: { content: '', createdAt: null, senderId: user.id } } as Conversation)
    loadMessages(user.id)
  }

  // ── Load conversations ───────────────────────────────────────────────────
  async function loadConversations() {
    setConvsLoading(true)
    try {
      const res = await fetch('/api/messages?inbox=1')
      const list: Conversation[] = await res.json()
      setConversations(Array.isArray(list) ? list : [])
      setUnreadMsgs(Array.isArray(list) ? list.reduce((a, c) => a + (c.unread || 0), 0) : 0)
    } finally { setConvsLoading(false) }
  }

  async function loadMessages(withUserId: number) {
    setMsgsLoading(true)
    try {
      const res = await fetch(`/api/messages?withUserId=${withUserId}`)
      const list: Message[] = await res.json()
      setMsgs(Array.isArray(list) ? list : [])
      // mark conversation as read
      setConversations(prev => prev.map(c => c.userId === withUserId ? { ...c, unread: 0 } : c))
      setUnreadMsgs(prev => {
        const conv = conversations.find(c => c.userId === withUserId)
        return Math.max(0, prev - (conv?.unread || 0))
      })
    } finally { setMsgsLoading(false) }
  }

  async function sendMessage() {
    if (!activeConv || !msgInput.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeConv.userId, content: msgInput.trim() }),
      })
      if (res.ok) {
        setMsgInput('')
        await loadMessages(activeConv.userId)
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } finally { setSending(false) }
  }

  // ── Load profile ─────────────────────────────────────────────────────────
  async function loadProfile() {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/profile')
      const p: ProfileData = await res.json()
      setProfile(p)
      setFullName(p.fullName ?? '')
      setEmail(p.email ?? '')
      setPhone(p.phone ?? '')
      setProfession(p.profession ?? '')
    } finally { setProfileLoading(false) }
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, profession }),
      })
      if (res.ok) { toast.success('تم حفظ البيانات بنجاح'); await loadProfile() }
      else { const d = await res.json(); toast.error(d.error ?? 'حدث خطأ') }
    } finally { setSavingProfile(false) }
  }

  async function savePassword() {
    if (newPwd !== confirmPwd) { toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقتين'); return }
    if (newPwd.length < 6)     { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setSavingPwd(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      if (res.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح')
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      } else { const d = await res.json(); toast.error(d.error ?? 'حدث خطأ') }
    } finally { setSavingPwd(false) }
  }

  // ── Tab change effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (mainTab === 'notifications' && notifs.length === 0) loadNotifications()
    if (mainTab === 'messages' && conversations.length === 0) loadConversations()
    if (mainTab === 'profile' && !profile) loadProfile()
  }, [mainTab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (msgs.length > 0) msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">جاري تحميل البيانات…</p>
      </div>
    </div>
  )

  if (!data || data.students.length === 0) return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">👤</div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">لا يوجد أبناء مرتبطون بحسابك</h2>
      <p className="text-gray-500 text-sm">يرجى التواصل مع إدارة المدرسة لربط حساب ابنك.</p>
    </div>
  )

  const sd = data.students[activeStudent]
  if (!sd) return null
  const { student, groups, attendance, memorization, homework, finance } = sd
  const ratingTotal = Object.values(memorization.ratingDist).reduce((a, b) => a + b, 0)
  const badgeClass = (n: number) => n > 0 ? 'bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold' : 'hidden'

  // ── Home tab content ──────────────────────────────────────────────────────
  const HomeContent = (
    <div className="space-y-5">

      {/* Student selector */}
      {data.students.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">اختر الابن / الابنة</p>
          <div className="flex gap-2 flex-wrap">
            {data.students.map((sd2, i) => (
              <button key={sd2.student.id}
                onClick={() => { setActiveStudent(i); setActiveTab('overview') }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                style={activeStudent === i
                  ? { background: '#1a5c35', color: 'white', borderColor: '#1a5c35' }
                  : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}>
                <span>{sd2.student.gender === 'female' ? '👤' : '👤'}</span>
                {sd2.student.firstName} {sd2.student.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero card */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {student.gender === 'female' ? '👤' : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
            <div className="flex items-center gap-3 mt-1 text-green-100 text-sm flex-wrap">
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{student.studentNumber}</span>
              {student.educationalLevel && <span>{student.educationalLevel}</span>}
              {groups[0]?.groupName && <span>•فوج {groups[0].groupName}</span>}
            </div>
          </div>
          <div className="flex-shrink-0">
            <DonutChart present={attendance.present} absent={attendance.absent} late={attendance.late} total={attendance.total} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/20">
          {[
            { label: 'حصص الحفظ', value: memorization.totalSessions, icon: '📖' },
            { label: 'نسبة الحضور', value: `${attendance.rate}%`, icon: '✅' },
            { label: 'الغياب', value: attendance.absent, icon: '❌' },
            { label: 'رسوم الشهر', value: `${finance.monthPaid.toLocaleString('ar')} د`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-xs text-green-200 hidden sm:block">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick notifications preview 
      {data.notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">🔔</span>
              <span className="font-bold text-amber-800 text-sm">آخر الإعلانات</span>
            </div>
            <button
              onClick={() => setMainTab('notifications')}
              className="text-xs text-amber-600 hover:underline font-medium">
              عرض الكل ←
            </button>
          </div>
          <div className="divide-y divide-amber-100">
            {data.notifications.slice(0, 2).map(n => (
              <div key={n.id} className="px-4 py-3">
                <p className="font-semibold text-amber-900 text-sm">{n.title}</p>
                <p className="text-amber-700 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-amber-400 text-xs mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar') : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}     */}

      {/* Student tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
          {STUDENT_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap"
              style={activeTab === tab.id
                ? { borderColor: '#16a34a', color: '#15803d', background: '#f0fdf4' }
                : { borderColor: 'transparent', color: '#6b7280' }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ══ نظرة عامة ══ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {groups[0] && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2"> المعلم المشرف</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {(groups[0].teacherName ?? 'م')[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{groups[0].teacherName ?? 'غير محدد'}</p>
                      <p className="text-sm text-gray-500">{groups[0]?.groupName && <span>فوج {groups[0].groupName}</span>}</p>
                      {groups[0].teacherPhone && (
                        <a href={`tel:${groups[0].teacherPhone}`}
                          className="text-green-700 text-sm font-mono flex items-center gap-1 mt-0.5 hover:underline">
                          📞 {groups[0].teacherPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">📝 الواجب المنزلي الحالي</h3>
                {homework ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">📚</span>
                      <div>
                        <p className="font-semibold text-blue-900">
                          من سورة <strong>{homework.fromSurahName}</strong>
                          {homework.toSurahName && homework.toSurahName !== homework.fromSurahName && (
                            <> إلى سورة <strong>{homework.toSurahName}</strong></>
                          )}
                        </p>
                        {homework.notes && <p className="text-blue-700 text-sm mt-1">{homework.notes}</p>}
                        <p className="text-blue-400 text-xs mt-2">
                          {homework.isGroupHomework ? '👥 واجب مشترك' : '👤 واجب فردي'}
                          {homework.assignedAt && ` • ${new Date(homework.assignedAt).toLocaleDateString('ar')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">لا يوجد واجب محدد حالياً</p>
                )}
              </div>

              {memorization.sessions.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">📖 آخر جلسات الحفظ</h3>
                  <div className="space-y-2">
                    {memorization.sessions.slice(0, 3).map(s => {
                      const rc = RATING_CONFIG[s.rating ?? '']
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rc?.color ?? '#9ca3af' }} />
                          <div className="flex-1 min-w-0 text-sm">
                            <span className="text-gray-700">
                              {s.surahName ? `سورة ${s.surahName}` : SESSION_TYPE_LABELS[s.sessionType] ?? ''}
                              {s.fromAyah != null && <span className="text-gray-400"> آية {s.fromAyah}–{s.toAyah}</span>}
                            </span>
                          </div>
                          {rc && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">{s.sessionDate}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => setActiveTab('memorization')}
                    className="mt-3 w-full text-center text-green-700 text-sm hover:underline">
                    عرض كل الجلسات ←
                  </button>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">📅 حضور هذا الأسبوع</h3>
                {attendance.thisWeek.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-3">لا توجد سجلات هذا الأسبوع</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.thisWeek.map(a => {
                      const cfg = ATT_CONFIG[a.status] ?? ATT_CONFIG.absent
                      return (
                        <div key={a.date} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${cfg.color}`}>
                          <span className="font-mono text-xs">{a.date}</span>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className="font-semibold">{cfg.label}</span>
                          </div>
                          {a.notes && <span className="text-xs opacity-70">{a.notes}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ الحفظ ══ */}
          {activeTab === 'memorization' && (
            <div className="space-y-5">
              {ratingTotal > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-bold text-gray-700 mb-4 text-sm">توزيع التقييمات (آخر 30 جلسة)</h3>
                  <div className="space-y-2">
                    {Object.entries(RATING_CONFIG).map(([key, cfg]) => {
                      const n = memorization.ratingDist[key] ?? 0; if (n === 0) return null
                      const pct = ratingTotal > 0 ? Math.round((n / ratingTotal) * 100) : 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs w-16 text-gray-600 flex-shrink-0">{cfg.label}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                          </div>
                          <span className="text-xs font-bold w-14 text-left" style={{ color: cfg.color }}>{n} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">سجل جلسات الحفظ</h3>
                {memorization.sessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-2">📖</div><p>لا توجد جلسات مسجلة بعد</p></div>
                ) : (
                  <div className="space-y-3">
                    {memorization.sessions.map(s => {
                      const rc = RATING_CONFIG[s.rating ?? '']
                      return (
                        <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-400">{s.sessionDate}</span>
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                              </span>
                            </div>
                            {rc && (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                            )}
                          </div>
                          {s.surahName && (
                            <p className="text-gray-800 text-sm">
                              سورة <strong>{s.surahName}</strong>
                              {s.fromAyah != null && <span className="text-gray-500"> — آية {s.fromAyah} إلى {s.toAyah}</span>}
                            </p>
                          )}
                          {s.notes && <p className="text-gray-500 text-xs mt-1.5 border-t border-gray-100 pt-1.5">{s.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ الحضور ══ */}
          {activeTab === 'attendance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'إجمالي الحصص', value: attendance.total,   color: '#6b7280', bg: '#f9fafb' },
                  { label: 'حضر',          value: attendance.present, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'غياب',         value: attendance.absent,  color: '#dc2626', bg: '#fef2f2' },
                  { label: 'تأخر',         value: attendance.late,    color: '#f59e0b', bg: '#fffbeb' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4 text-center border"
                    style={{ background: s.bg, borderColor: s.color + '33' }}>
                    <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">نسبة الحضور الإجمالية</span>
                  <span className="font-bold text-lg" style={{ color: attendance.rate >= 80 ? '#16a34a' : attendance.rate >= 60 ? '#f59e0b' : '#dc2626' }}>
                    {attendance.rate}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${attendance.rate}%`,
                      background: attendance.rate >= 80 ? '#16a34a' : attendance.rate >= 60 ? '#f59e0b' : '#dc2626',
                    }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {attendance.rate >= 80 ? '✅ ممتاز' : attendance.rate >= 60 ? '⚠️ مقبول' : '❌ يحتاج تحسين'}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 mb-3">آخر سجلات الحضور</h3>
                {attendance.recent.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">لا توجد سجلات</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.recent.map(a => {
                      const cfg = ATT_CONFIG[a.status] ?? ATT_CONFIG.absent
                      return (
                        <div key={a.date} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm ${cfg.color}`}>
                          <span className="font-mono text-xs">{a.date}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className="font-semibold">{cfg.label}</span>
                          </div>
                          {a.notes && <span className="text-xs opacity-70 max-w-[120px] truncate">{a.notes}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ الواجبات ══ */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">📝 الواجب المنزلي</h3>
              {homework ? (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📚</span>
                    <div>
                      <p className="font-bold text-blue-900 text-base">
                        من سورة {homework.fromSurahName}
                        {homework.toSurahName && homework.toSurahName !== homework.fromSurahName && <> إلى سورة {homework.toSurahName}</>}
                      </p>
                      <p className="text-blue-500 text-xs mt-0.5">
                        {homework.isGroupHomework ? '👥 واجب مشترك' : '👤 واجب فردي'}
                        {homework.assignedAt && ` • ${new Date(homework.assignedAt).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                      </p>
                    </div>
                  </div>
                  {homework.notes && (
                    <div className="bg-white/60 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                      <span className="font-semibold block mb-1 text-xs text-blue-500">ملاحظات المعلم:</span>
                      {homework.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-gray-500 font-medium">لا يوجد واجب محدد حالياً</p>
                  <p className="text-gray-400 text-sm mt-1">سيظهر هنا بعد تحديد المعلم للواجب التالي</p>
                </div>
              )}
            </div>
          )}

          {/* ══ الرسوم ══ */}
          {activeTab === 'finance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">إجمالي المدفوع</p>
                  <p className="text-2xl font-extrabold text-green-700">{finance.totalPaid.toLocaleString('ar')}</p>
                  <p className="text-xs text-green-500">دج</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">مدفوع هذا الشهر</p>
                  <p className="text-2xl font-extrabold text-blue-700">{finance.monthPaid.toLocaleString('ar')}</p>
                  <p className="text-xs text-blue-500">دج</p>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 mb-3">آخر الدفوعات</h3>
                {finance.recentPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-2">💳</div><p>لا توجد دفوعات مسجلة</p></div>
                ) : (
                  <div className="space-y-2">
                    {finance.recentPayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{p.forMonth ?? '—'}</p>
                          <p className="text-xs text-gray-400">{p.paymentDate ?? '—'}</p>
                        </div>
                        <span className="font-bold text-green-700 text-base">
                          {parseFloat(p.amount ?? '0').toLocaleString('ar')} <span className="text-xs font-normal text-gray-400">دج</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Notifications tab content ─────────────────────────────────────────────
  const NotificationsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">🔔 الإشعارات والإعلانات</h2>
        <button onClick={loadNotifications}
          className="text-sm text-green-700 hover:underline flex items-center gap-1">
          🔄 تحديث
        </button>
      </div>
      {notifsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-500 font-medium">لا توجد إشعارات حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id}
              onClick={() => !n.isRead && markNotifRead(n.id)}
              className={`rounded-2xl border p-4 transition-all cursor-pointer ${n.isRead
                ? 'bg-white border-gray-200'
                : 'bg-amber-50 border-amber-300 shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-bold text-sm ${n.isRead ? 'text-gray-700' : 'text-amber-900'}`}>{n.title}</p>
                    {!n.isRead && (
                      <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">جديد</span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${n.isRead ? 'text-gray-500' : 'text-amber-800'}`}>{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Messages tab content ───────────────────────────────────────────────────
  const MessagesContent = (
    <div className="space-y-4">
      {!activeConv ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">💬 الرسائل</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={openNewMessage}
                className="text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-xl font-medium">
                👨‍🏫 مراسلة معلم
              </button>
{/*
<button
  onClick={openAdminMessage}
  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium">
  🏛️ مراسلة الإدارة
</button>
*/}
              <button onClick={loadConversations}
                className="text-sm text-green-700 hover:underline flex items-center gap-1">
                🔄 تحديث
              </button>
            </div>
          </div>

          {/* Teacher selection modal */}
          {showNewMsg && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowNewMsg(false)}>
              <div dir="rtl" className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-gray-800 text-sm mb-3">👨‍🏫 اختر المعلم</h3>
                {teachersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                  </div>
                ) : teacherList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">لا يوجد معلمون مرتبطون بأفواج أبنائكم حالياً.</p>
                ) : (
                  <div className="space-y-2">
                    {teacherList.map(t => (
                      <button key={t.id} onClick={() => startConversation(t)}
                        className="w-full text-right p-3 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-300 text-sm font-medium text-gray-800">
                        👨‍🏫 {t.fullName ?? 'معلم'}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowNewMsg(false)}
                  className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-medium">
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* Admin selection modal */}
          {showAdminMsg && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAdminMsg(false)}>
              <div dir="rtl" className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-gray-800 text-sm mb-3">🏛️ اختر مسؤول الإدارة</h3>
                {adminLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : adminList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">لا يوجد مسؤولو إدارة متاحون حالياً.</p>
                ) : (
                  <div className="space-y-2">
                    {adminList.map(a => (
                      <button key={a.id} onClick={() => { setShowAdminMsg(false); startConversation(a) }}
                        className="w-full text-right p-3 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-sm font-medium text-gray-800">
                        🏛️ {a.fullName ?? 'مسؤول'}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowAdminMsg(false)}
                  className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-medium">
                  إغلاق
                </button>
              </div>
            </div>
          )}
          {convsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-gray-500 font-medium">لا توجد محادثات بعد</p>
              <p className="text-gray-400 text-sm mt-1">ستظهر هنا رسائلك مع المعلمين والإدارة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <button key={conv.userId}
                  onClick={() => {
                    setActiveConv(conv)
                    loadMessages(conv.userId)
                  }}
                  className="w-full text-right bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 hover:border-green-300 transition-all flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(conv.user.fullName ?? 'م')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-800 text-sm truncate">{conv.user.fullName ?? 'مستخدم'}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {conv.lastMessage.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString('ar') : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-gray-500 text-xs truncate">{conv.lastMessage.content}</p>
                      {conv.unread > 0 && (
                        <span className="bg-green-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
          {/* Conv header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 flex-shrink-0">
            <button onClick={() => { setActiveConv(null); setMsgs([]) }}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors flex-shrink-0">
              →
            </button>
            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold flex-shrink-0">
              {(activeConv.user.fullName ?? 'م')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm">{activeConv.user.fullName ?? 'مستخدم'}</p>
              <p className="text-xs text-gray-400">{activeConv.user.role === 'teacher' ? 'معلم' : activeConv.user.role === 'admin' ? 'مدير' : ''}</p>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {msgsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : msgs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">لا توجد رسائل بعد. ابدأ المحادثة!</div>
            ) : (
              msgs.map(msg => {
                const isMe = msg.senderId !== activeConv.userId
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe ? 'bg-green-700 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-3 border-t border-gray-200 flex-shrink-0">
            <button onClick={sendMessage} disabled={sending || !msgInput.trim()}
              className="w-10 h-10 rounded-full bg-green-700 hover:bg-green-800 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors">
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span className="text-white text-sm">↑</span>}
            </button>
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="اكتب رسالتك…"
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      )}
    </div>
  )

  // ── Profile tab content ────────────────────────────────────────────────────
  const ProfileContent = (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">👤 حسابي</h2>

      {/* Profile tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          onClick={() => setProfileTab('info')}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={profileTab === 'info'
            ? { background: '#1a5c35', color: 'white' }
            : { background: 'white', color: '#6b7280' }}>
          ✏️ البيانات الشخصية
        </button>
        <button
          onClick={() => setProfileTab('password')}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={profileTab === 'password'
            ? { background: '#1a5c35', color: 'white' }
            : { background: 'white', color: '#6b7280' }}>
          🔒 كلمة المرور
        </button>
      </div>

      {profileLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : profileTab === 'info' ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          {profile && (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold">
                {(profile.fullName ?? profile.username)[0]}
              </div>
              <div>
                <p className="font-bold text-gray-800">{profile.fullName ?? '—'}</p>
                <p className="text-sm text-gray-500">@{profile.username}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ولي أمر</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">الاسم الكامل</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">رقم الهاتف</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              المهنة <span className="text-gray-400 font-normal text-xs">(اختياري)</span>
            </label>
            <input type="text" value={profession} onChange={e => setProfession(e.target.value)}
              placeholder="مثال: مهندس، معلم، طبيب..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <button onClick={saveProfile} disabled={savingProfile}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {savingProfile
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '💾 حفظ التغييرات'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span>تأكد من أن كلمة المرور الجديدة لا تقل عن 6 أحرف واحتفظ بها في مكان آمن.</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">كلمة المرور الحالية</label>
            <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">كلمة المرور الجديدة</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" dir="ltr" />
          </div>
          {newPwd && confirmPwd && newPwd !== confirmPwd && (
            <p className="text-red-500 text-xs">كلمتا المرور غير متطابقتين</p>
          )}
          <button onClick={savePassword} disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {savingPwd
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🔒 تغيير كلمة المرور'}
          </button>
        </div>
      )}

      {/* Push notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">🔔 إشعارات الرسائل</p>
        <p className="text-xs text-gray-400 mb-3">فعّل الإشعارات لتصلك رسائل المعلمين والإدارة فور إرسالها، حتى عند إغلاق الصفحة.</p>
        <PushEnableButton />
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-700 text-sm">تسجيل الخروج</p>
            <p className="text-xs text-gray-400">الخروج من حساب ولي الأمر</p>
          </div>
          <GuardianLogout />
        </div>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
<header className="bg-white border-b border-gray-200 sticky top-0 z-30">
  {/* تم استبدال px-4 بـ pr-4 pl-0 (أو pe-4 ps-0 لدعم RTL) */}
  <div className="max-w-4xl mx-auto pr-4 pl-0 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <PushEnableButton />
      {/* <GuardianLogout /> */}
    </div>
  </div>
</header>
      {/* Main content */}
      <div className="space-y-1">
        {mainTab === 'home'          && HomeContent}
        {mainTab === 'notifications' && NotificationsContent}
        {mainTab === 'messages'      && MessagesContent}
        {mainTab === 'profile'       && ProfileContent}
      </div>

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 right-0 left-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
        <div className="flex max-w-3xl mx-auto">
          {MAIN_TABS.map(tab => {
            const badge = tab.id === 'messages' ? unreadMsgs : tab.id === 'notifications' ? unreadNotifs : 0
            return (
              <button key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-3 px-1 transition-colors relative"
                style={mainTab === tab.id ? { color: '#16a34a' } : { color: '#9ca3af' }}>
                {badge > 0 && (
                  <span className="absolute top-2 left-[calc(50%+6px)] bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-xs font-semibold leading-none">{tab.label}</span>
                {mainTab === tab.id && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-green-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
