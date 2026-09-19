'use client'
import { useState, useEffect } from 'react'

type ScoredStudent = {
  id: number
  name: string
  studentNumber: string | null
  absences: number
  ratingScore: number
  score: number
}
type GroupInfo = {
  id: number
  name: string
  groupNumber: string | null
  teacherName: string | null
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function RankingPrintPage() {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [rankingData, setRankingData] = useState<{ group: GroupInfo; ranking: ScoredStudent[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('groupId')
    setGroupId(gid)
    if (!gid) { setLoading(false); return }

    fetch(`/api/ranking?groupId=${gid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setRankingData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && rankingData) {
      setTimeout(() => window.print(), 400)
    }
  }, [loading, rankingData])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'Cairo, sans-serif' }}>
        <p>جاري التحميل...</p>
      </div>
    )
  }

  if (!rankingData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'Cairo, sans-serif' }}>
        <p>تعذّر تحميل البيانات</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Print Button */}
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: '#1a5c35', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          🖨️ طباعة
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #1a5c35', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a5c35', margin: 0 }}>منصة الفردوس</h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#333', margin: '4px 0 0' }}>
          ترتيب طلاب فوج: {rankingData.group.name}
        </h2>
        {rankingData.group.groupNumber && (
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>
            رقم الفوج: {rankingData.group.groupNumber}
          </p>
        )}
        {rankingData.group.teacherName && (
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '2px 0 0' }}>
            المعلم: {rankingData.group.teacherName}
          </p>
        )}
        <p style={{ color: '#999', fontSize: '0.85rem', margin: '6px 0 0' }}>تاريخ الطباعة: {today}</p>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#1a5c35', color: 'white' }}>
            <th style={{ padding: '8px 12px', textAlign: 'center', width: 60 }}>الرتبة</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>اسم الطالب</th>
            <th style={{ padding: '8px 12px', textAlign: 'center' }}>النقاط</th>
            <th style={{ padding: '8px 12px', textAlign: 'center' }}>الغياب</th>
            <th style={{ padding: '8px 12px', textAlign: 'center' }}>تقييم الحفظ</th>
          </tr>
        </thead>
        <tbody>
          {rankingData.ranking.map((s, i) => (
            <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>
                {i < 3 ? MEDAL[i] : `#${i + 1}`}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {s.name}
                {s.studentNumber && <span style={{ color: '#999', fontSize: '0.8rem', marginRight: '4px' }}>({s.studentNumber})</span>}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#1a5c35' }}>
                {s.score.toFixed(1)}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: s.absences > 5 ? '#dc2626' : s.absences > 2 ? '#d97706' : '#16a34a' }}>
                {s.absences}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: '#666' }}>
                {s.ratingScore.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
        النقاط النهائية = نقاط التقييم − (عدد الغيابات × 2) | إجمالي الطلاب: {rankingData.ranking.length}
      </div>
    </div>
  )
}
