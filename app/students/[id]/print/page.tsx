'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Student = {
  id: number; studentNumber: string; firstName: string; lastName: string
  gender: string | null; birthDate: string | null; phone: string | null
  guardianName: string | null; educationalLevel: string | null
  enrollmentDate: string | null; withdrawalDate: string | null
  status: string; notes: string | null
}
type GroupRecord = { id: number; name: string; groupNumber: string }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'نشط',             color: '#fff', bg: '#198754' },
  waiting:   { label: 'في الانتظار',     color: '#333', bg: '#ffc107' },
  withdrawn: { label: 'منسحب',           color: '#fff', bg: '#dc3545' },
  graduated: { label: 'متخرج',           color: '#fff', bg: '#0d6efd' },
}

export default function StudentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const [student, setStudent] = useState<Student | null>(null)
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [absenceCount, setAbsenceCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string>('')

  useEffect(() => {
    params.then(p => setStudentId(p.id))
  }, [params])

  useEffect(() => {
    if (!studentId) return
    async function load() {
      const res = await fetch(`/api/students/${studentId}`)
      if (!res.ok) { setLoading(false); return }
      const s = await res.json()
      setStudent(s)

      // Load groups
      const grRes2 = await fetch(`/api/students/${studentId}/groups`).catch(() => null)
      if (grRes2?.ok) {
        const gdata = await grRes2.json()
        setGroups(gdata ?? [])
      }

      // Load absence count
      const attRes = await fetch(`/api/students/${studentId}/absences`).catch(() => null)
      if (attRes?.ok) {
        const adata = await attRes.json()
        setAbsenceCount(adata.count ?? 0)
      }

      setLoading(false)
    }
    load()
  }, [studentId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">جاري التحميل...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">الطالب غير موجود</p>
      </div>
    )
  }

  const st = STATUS[student.status] ?? { label: student.status, color: '#fff', bg: '#666' }

  return (
    <>
      {/* Toolbar - hidden on print */}
      <div className="no-print fixed top-0 right-0 left-0 z-50 flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <Link href={`/students/${studentId}`}
          className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          ← رجوع لملف الطالب
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow"
        >
          🖨️ طباعة الملف
        </button>
        <span className="text-gray-400 text-sm">الطباعة على ورق A4 عمودي</span>
      </div>

      {/* Spacer for fixed toolbar */}
      <div className="no-print h-16" />

      {/* ============ PRINTABLE AREA ============ */}
      <div className="print-page max-w-[210mm] mx-auto bg-white p-[15mm] min-h-[297mm]" dir="rtl">

        {/* Header with logo */}
        <div className="flex items-center gap-4 pb-4 mb-6" style={{ borderBottom: '3px solid #1a5c35' }}>
          <img src="/logo.png" alt="شعار منصة الفردوس" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <div className="flex-1">
            <h1 style={{ color: '#1a5c35', fontSize: 18, fontWeight: 'bold', margin: 0 }}>
              منصة الفردوس للتعليم القرآني
            </h1>
            <p style={{ color: '#555', fontSize: 13, margin: '2px 0 0' }}>
              مؤسسة الفردوس للتعليم القرآني فرع الديبيلة
            </p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ background: '#1a5c35', color: '#fff', padding: '6px 16px', borderRadius: 8, fontWeight: 'bold', fontSize: 14 }}>
              ملف الطالب
            </div>
            <p style={{ color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' }}>2025/2026</p>
          </div>
        </div>

        {/* Student identity card */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, background: '#f8fdf8', border: '1px solid #d1e7dd', borderRadius: 12, padding: 16 }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, background: '#1a5c35', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 'bold', flexShrink: 0 }}>
            {student.firstName[0]}
          </div>
          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' }}>
                {student.firstName} {student.lastName}
              </span>
              <span style={{ background: st.bg, color: st.color, padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>
                {st.label}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: 13, margin: '0 0 8px', fontFamily: 'monospace' }}>
              رقم التسجيل: <strong>{student.studentNumber}</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13, color: '#444' }}>
              <span>الجنس: {student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : '—'}</span>
              <span>تاريخ الميلاد: {student.birthDate ?? '—'}</span>
              <span>الهاتف: {student.phone ?? '—'}</span>
              <span>اسم الولي: {student.guardianName ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Two-column details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Academic */}
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14 }}>
            <h4 style={{ color: '#1a5c35', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 10 }}>
              📚 البيانات الأكاديمية
            </h4>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                {[
                  ['المستوى الدراسي', student.educationalLevel ?? '—'],
                  ['تاريخ التسجيل', student.enrollmentDate ?? '—'],
                  ['تاريخ الانسحاب', student.withdrawalDate ?? '—'],
                ].map(([l, v]) => (
                  <tr key={l} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '5px 0', color: '#666', fontWeight: 600 }}>{l}</td>
                    <td style={{ padding: '5px 0', color: '#222' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Attendance */}
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14 }}>
            <h4 style={{ color: '#1a5c35', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 10 }}>
              📊 إحصائيات الحضور
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>عدد مرات الغياب المسجلة</span>
              <span style={{ fontSize: 22, fontWeight: 'bold', color: absenceCount >= 5 ? '#dc3545' : '#198754' }}>{absenceCount}</span>
            </div>
            <div style={{ background: '#eee', borderRadius: 4, height: 8, marginBottom: 6 }}>
              <div style={{ background: absenceCount >= 5 ? '#dc3545' : '#198754', height: 8, borderRadius: 4, width: `${Math.min((absenceCount / 20) * 100, 100)}%` }} />
            </div>
            <p style={{ fontSize: 11, color: '#999' }}>⚠️ 5 غيابات أو أكثر = تغيير الحالة لمنسحب تلقائياً</p>
          </div>
        </div>

        {/* Groups */}
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <h4 style={{ color: '#1a5c35', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 10 }}>
            👥 الأفواج المرتبطة
          </h4>
          {groups.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 13 }}>لم يتم إدراجه في فوج بعد</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((g: GroupRecord) => (
                <span key={g.id} style={{ background: '#e8f5e9', color: '#1a5c35', padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {g.name} ({g.groupNumber})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {student.notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <h4 style={{ color: '#92400e', fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>📝 ملاحظات</h4>
            <p style={{ color: '#555', fontSize: 13, margin: 0 }}>{student.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', borderTop: '1px solid #eee', paddingTop: 14, marginTop: 'auto' }}>
          <p>تمت الطباعة بتاريخ: {new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style={{ marginTop: 4 }}>منصة الفردوس — منصة إدارة المدارس القرآنية</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0 !important; background: white !important; }
          @page { size: A4 portrait; margin: 0; }
          .print-page { 
            padding: 15mm !important; 
            max-width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}
