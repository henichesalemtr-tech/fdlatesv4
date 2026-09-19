'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type GroupOption = { id: number; name: string; groupNumber: string | null }
type ScoredStudent = {
  id: number
  name: string
  studentNumber: string | null
  absences: number
  ratingScore: number
  score: number
  guardianPhone?: string | null
}
type GroupInfo = {
  id: number
  name: string
  groupNumber: string | null
  teacherName: string | null
  teacherPhone: string | null
}
type RankingData = {
  group: GroupInfo
  ranking: ScoredStudent[]
}
type SessionData = { id: number; role: string; fullName: string | null; teacherId?: number | null }

const MEDAL = ['🥇', '🥈', '🥉']

function formatPhoneForWhatsApp(phone: string) {
  let clean = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) clean = '213' + clean.slice(1)
  return clean
}

export default function RankingPage() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [waModal, setWaModal] = useState(false)
  const [waMessage, setWaMessage] = useState('')

  // Load session + groups
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
      if (data) setSession(data)
    }).catch(() => {})

    fetch('/api/ranking')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.groups) {
          setGroups(data.groups)
          // Auto-select first group for teachers with one group
          if (data.groups.length === 1) {
            setSelectedGroupId(data.groups[0].id)
          }
        }
        setLoadingGroups(false)
      })
      .catch(() => setLoadingGroups(false))
  }, [])

  // Load ranking when group changes
  useEffect(() => {
    if (!selectedGroupId) { setRankingData(null); return }
    setLoading(true)
    fetch(`/api/ranking?groupId=${selectedGroupId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setRankingData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedGroupId])

  if (loadingGroups) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">جاري تحميل الأفواج...</p>
      </div>
    )
  }

  const isAdmin = session?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏆 ترتيب الفوج</h1>
          <p className="text-sm text-gray-500 mt-1">ترتيب الطلاب حسب نقاط الحفظ والحضور</p>
        </div>
        {rankingData && (
          <div className="flex gap-2 flex-wrap">
            <a
              href={`/ranking/print?groupId=${selectedGroupId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: '#1a5c35' }}
            >
              🖨️ طباعة
            </a>
            <button
              onClick={() => {
                setWaMessage(`ترتيب طلاب فوج ${rankingData.group.name}:\n${rankingData.ranking.slice(0, 10).map((s, i) => `${i + 1}. ${s.name} — ${s.score.toFixed(1)} نقطة`).join('\n')}`)
                setWaModal(true)
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: '#25d366' }}
            >
              💬 واتساب
            </button>
          </div>
        )}
      </div>

      {/* ── Group Picker ── */}
      {(isAdmin || groups.length > 1) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">اختر الفوج</label>
          <select
            value={selectedGroupId ?? ''}
            onChange={e => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="">-- اختر فوجاً --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.groupNumber ? `[${g.groupNumber}] ` : ''}{g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Ranking List ── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
        </div>
      )}

      {!loading && !rankingData && selectedGroupId && (
        <div className="text-center py-16 text-gray-400">تعذّر تحميل البيانات</div>
      )}

      {!loading && !selectedGroupId && groups.length > 0 && (
        <div className="text-center py-16 text-gray-400">اختر فوجاً لعرض الترتيب</div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-16 text-gray-400">لا توجد أفواج مسندة إليك</div>
      )}

      {!loading && rankingData && (
        <>
          {/* Group Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#f0fdf4' }}>
                📚
              </div>
              <div>
                <p className="font-bold text-gray-800">{rankingData.group.name}</p>
                <p className="text-sm text-gray-500">
                  {rankingData.group.groupNumber && <span className="ml-2">رقم الفوج: {rankingData.group.groupNumber}</span>}
                  {rankingData.group.teacherName && <span>المعلم: {rankingData.group.teacherName}</span>}
                </p>
              </div>
              <div className="mr-auto text-right">
                <p className="text-xs text-gray-400">عدد الطلاب</p>
                <p className="text-2xl font-bold text-green-700">{rankingData.ranking.length}</p>
              </div>
            </div>
          </div>

          {/* Top 3 Podium */}
          {rankingData.ranking.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {rankingData.ranking.slice(0, 3).map((s, i) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl shadow-sm border p-3 text-center"
                  style={{
                    borderColor: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#cd7c2a',
                    background: i === 0 ? '#fffbeb' : i === 1 ? '#f9fafb' : '#fef3e2',
                  }}
                >
                  <div className="text-2xl mb-1">{MEDAL[i]}</div>
                  <p className="text-xs font-bold text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-green-700 font-semibold mt-1">{s.score.toFixed(1)} نقطة</p>
                  <p className="text-xs text-gray-400">غياب: {s.absences}</p>
                </div>
              ))}
            </div>
          )}

          {/* Full Ranking Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-700 text-sm">الترتيب الكامل</h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الرتبة</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الطالب</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">النقاط</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الغياب</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.ranking.map((s, i) => (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#b45309' : '#374151' }}>
                          {i < 3 ? MEDAL[i] : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/students/${s.id}?from=ranking&groupId=${selectedGroupId}`} className="font-semibold text-green-700 hover:underline">
                          {s.name}
                        </a>
                        {s.studentNumber && <span className="text-xs text-gray-400 mr-1">({s.studentNumber})</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">{s.score.toFixed(1)} نقطة</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.absences > 5 ? 'bg-red-100 text-red-700' : s.absences > 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {s.absences} غيابات
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.ratingScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {rankingData.ranking.map((s, i) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 text-center flex-shrink-0">
                    <span className="font-bold text-sm" style={{ color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#b45309' : '#374151' }}>
                      {i < 3 ? MEDAL[i] : `#${i + 1}`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={`/students/${s.id}?from=ranking&groupId=${selectedGroupId}`} className="font-semibold text-green-700 text-sm truncate block hover:underline">
                      {s.name}
                    </a>
                    <p className="text-xs text-gray-400">غياب: {s.absences} | تقييم: {s.ratingScore.toFixed(1)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-green-700 text-sm">{s.score.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">نقطة</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── WhatsApp Links Modal ── */}
      {waModal && rankingData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">💬 روابط واتساب</h2>
                <p className="text-xs text-gray-500 mt-0.5">انقر على كل رابط لإرسال الرسالة يدوياً</p>
              </div>
              <button onClick={() => setWaModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-1">الرسالة</label>
              <textarea
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {rankingData.ranking.map((s, i) => {
                const phone = (s as ScoredStudent & { guardianPhone?: string | null }).guardianPhone
                if (!phone) return null
                const wa = `https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encodeURIComponent(waMessage)}`
                return (
                  <div key={s.id} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-6 text-center">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                    <a href={wa} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg text-white font-semibold"
                      style={{ background: '#25d366' }}>
                      فتح
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
