'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

/** تنسيق التاريخ بأرقام لاتينية وأسماء أشهر بالعربي — مثال: 20 جويلية 2026 */
function formatDateAr(date: Date = new Date()): string {
  const MONTHS = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

type Group = { id: number; name: string; groupNumber: string }
type Student = {
  id: number; studentNumber: string; firstName: string; lastName: string
  educationalLevel: string | null; enrollmentDate: string | null; status: string
  guardianName: string | null; guardianPhone: string | null; gender: string | null
  birthDate: string | null; address: string | null
}
type Stats = {
  students: { total: number; active: number; withdrawn: number; waiting: number; graduated: number }
  teachers: { total: number }
  groups: { total: number }
}
type Teacher = { id: number; fullName: string; teacherNumber: string | null }

const SCHOOL_NAME = 'مؤسسة الفردوس للتضامن والتربية والثقافة والعلوم | فرع الدبيلة'
const ACADEMIC_YEAR = '2025/2026'

// ==================== REPORTS PAGE ====================
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'summary' | 'attendance' | 'staff-cards'>('summary')
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups)
    fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => null)
  }, [])

  const currentGroup = groups.find(g => String(g.id) === selectedGroup)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => window.print()} className="no-print border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          🖨️ طباعة التقرير
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📊</span> التقارير
        </h1>
      </div>

      {/* ===== PRINTING CENTER ===== */}
      <div className="bg-white rounded-xl border-2 border-yellow-400 p-5 mb-5 no-print">
        <h3 className="text-yellow-600 font-bold mb-4 flex items-center gap-2">
          <span>🖨️</span> مركز الطباعة
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab('groups')}
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">قوائم الأفواج</p>
              <p className="text-gray-400 text-xs">طباعة وتصدير Excel للأفواج</p>
            </div>
          </button>
          <Link href="/reports/cards"
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer">
            <span className="text-2xl">🪪</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">بطاقات الطلاب</p>
              <p className="text-gray-400 text-xs">بطاقات CR80 مع QR وباركود</p>
            </div>
          </Link>
          <button
            onClick={() => setActiveTab('attendance')}
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer"
          >
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">كشف الحضور الشهري</p>
              <p className="text-gray-400 text-xs">طباعة كشف حضور الفوج بالشهر</p>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('staff-cards')}
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer"
          >
            <span className="text-2xl">🏷️</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">بطاقات المعلمين والإداريين</p>
              <p className="text-gray-400 text-xs">طباعة بطاقات تعريفية للطاقم مع باركود</p>
            </div>
          </button>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 no-print overflow-x-auto">
        {[
          { key: 'summary', label: '📈 الملخص الإحصائي' },
          { key: 'groups', label: '📋 قوائم الأفواج' },
          { key: 'attendance', label: '📅 الحضور الشهري' },
          { key: 'staff-cards', label: '🏷️ بطاقات الطاقم' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as 'groups' | 'summary' | 'attendance' | 'staff-cards')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'border-green-700 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ===== SUMMARY TAB ===== */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border-r-4 border-blue-500 border border-gray-200 p-5">
              <h3 className="text-blue-600 font-bold mb-4 flex items-center gap-2">
                <span>🎓</span> الملخص الأكاديمي
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'إجمالي الطلاب المسجلين', val: stats?.students?.total ?? '-', color: 'bg-blue-500' },
                  { label: 'الطلاب النشطون', val: stats?.students?.active ?? '-', color: 'bg-green-500' },
                  { label: 'في الانتظار', val: stats?.students?.waiting ?? '-', color: 'bg-yellow-400' },
                  { label: 'إجمالي المعلمين', val: stats?.teachers?.total ?? '-', color: 'bg-purple-500' },
                  { label: 'الأفواج المفعلة', val: stats?.groups?.total ?? '-', color: 'bg-indigo-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">{item.label}</span>
                    <span className={`${item.color} text-white px-3 py-0.5 rounded-full text-sm font-bold`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border-r-4 border-green-500 border border-gray-200 p-5">
              <h3 className="text-green-600 font-bold mb-4 flex items-center gap-2">
                <span>💰</span> الملخص المالي ({new Date().getFullYear()})
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'رسوم الطلاب', val: '0.00', type: 'دخل', color: 'text-green-600' },
                  { label: 'التبرعات', val: '0.00', type: 'دخل', color: 'text-green-600' },
                  { label: 'رواتب الموظفين', val: '0.00', type: 'مصروف', color: 'text-red-500' },
                  { label: 'المصاريف العامة', val: '0.00', type: 'مصروف', color: 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${item.type === 'دخل' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{item.type}</span>
                      <span className="text-gray-600 text-sm">{item.label}</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${item.color}`}>{item.val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-800">الرصيد الصافي</span>
                  <span className="font-bold text-green-600 text-lg">0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== GROUP LIST TAB ===== */}
      {activeTab === 'groups' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 no-print">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفوج</label>
                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">-- اختر الفوج --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedGroup && (
            <GroupListPrint groupId={selectedGroup} groupName={currentGroup?.name ?? ''} groupNumber={currentGroup?.groupNumber ?? ''} />
          )}
          {!selectedGroup && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>اختر فوجاً لعرض قائمته وتصديرها</p>
            </div>
          )}
        </div>
      )}

      {/* ===== MONTHLY ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 no-print">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفوج</label>
                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">-- اختر الفوج --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedGroup && (
            <MonthlyAttendancePrint
              groupId={selectedGroup}
              groupName={currentGroup?.name ?? ''}
              groupNumber={currentGroup?.groupNumber ?? ''}
            />
          )}
          {!selectedGroup && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p>اختر فوجاً لعرض كشف حضوره الشهري</p>
            </div>
          )}
        </div>
      )}

      {/* ===== STAFF CARDS TAB ===== */}
      {activeTab === 'staff-cards' && <StaffCardsSection />}

    </div>
  )
}

// ===== GROUP LIST PRINT + EXPORT =====
function GroupListPrint({ groupId, groupName, groupNumber }: { groupId: string; groupName: string; groupNumber: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [teacher, setTeacher]   = useState<Teacher | null>(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/groups/${groupId}`).then(r => r.json()),
      fetch(`/api/groups/${groupId}/teacher`).then(r => r.json()),
    ]).then(([studData, teacherData]) => {
      setStudents(Array.isArray(studData) ? studData.filter(Boolean) : [])
      setTeacher(teacherData ?? null)
      setLoading(false)
    })
  }, [groupId])

  async function exportExcel() {
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'منصة الفردوس'
      const ws = wb.addWorksheet(`الفوج ${groupName}`, { views: [{ rightToLeft: true }] })

      const titleRows = [
        ['مؤسسة الفردوس للتضامن والتربية والثقافة والعلوم | فرع الدبيلة'],
        [`قائمة بيانات الفوج: ${groupName} (${groupNumber})`],
        [`السنة الدراسية: ${ACADEMIC_YEAR}`],
        [`تاريخ التصدير: ${formatDateAr()}`],
        [],
      ]
      const colCount = 9
      titleRows.forEach((r, ri) => {
        ws.addRow(r)
        if (r.length) {
          ws.mergeCells(ri + 1, 1, ri + 1, colCount)
          const cell = ws.getCell(ri + 1, 1)
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
          if (ri === 0) { cell.font = { bold: true, size: 14, color: { argb: 'FF0F3D22' } }; ws.getRow(ri + 1).height = 28 }
          else if (ri === 1) { cell.font = { bold: true, size: 12 }; ws.getRow(ri + 1).height = 24 }
          else cell.font = { size: 10, color: { argb: 'FF555555' } }
        }
      })

      const headerRow = ws.addRow(['الرقم', 'رقم التسجيل', 'اللقب', 'الاسم', 'الولي', 'الهاتف', 'تاريخ الميلاد', 'المستوى الدراسي', 'العنوان'])
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5C35' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF0F3D22' } } }
      })
      headerRow.height = 22

      students.forEach((s, i) => {
        const row = ws.addRow([
          String(i + 1).padStart(2, '0'),
          s.studentNumber,
          s.lastName,
          s.firstName,
          s.guardianName ?? '',
          s.guardianPhone ?? '',
          s.birthDate ?? '',
          s.educationalLevel ?? '',
          s.address ?? '',
        ])
        const isEven = i % 2 === 0
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0FAF4' } }
          cell.font = { size: 10.5 }
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
            right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
          }
        })
        row.height = 18
      })

      ws.getColumn(1).width = 8
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 18
      ws.getColumn(4).width = 18
      ws.getColumn(5).width = 18
      ws.getColumn(6).width = 14
      ws.getColumn(7).width = 14
      ws.getColumn(8).width = 18
      ws.getColumn(9).width = 18

      ws.addRow([])
      const footerRow = ws.addRow([`إجمالي الطلاب: ${students.length} طالب`])
      footerRow.getCell(1).font = { bold: true, size: 11 }

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `قائمة_${groupName}_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch {
      toast.error('فشل تصدير Excel')
    }
    setExporting(false)
  }

  async function exportPdf() {
    setExportingPdf(true)
    try {
      let logoDataUrl = ''
      try {
        const logoRes = await fetch('/logo.png')
        const logoBlob = await logoRes.blob()
        logoDataUrl = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
      } catch { /* skip if unavailable */ }

      const teacherName = teacher?.fullName ?? '—'
      const printDate = formatDateAr()
      const logoImg = logoDataUrl
        ? `<img src="${logoDataUrl}" style="width:52px;height:52px;object-fit:contain;" />`
        : ''

      const rows = students.map((s, idx) => `
        <tr class="${idx % 2 === 0 ? '' : 'alt'}">
          <td class="center mono">${String(idx + 1).padStart(2, '0')}</td>
          <td class="mono">${s.studentNumber}</td>
          <td>${s.lastName ?? ''}</td>
          <td>${s.firstName ?? ''}</td>
          <td>${s.guardianName ?? ''}</td>
          <td class="mono">${s.guardianPhone ?? ''}</td>
          <td>${s.birthDate ?? ''}</td>
          <td>${s.educationalLevel ?? ''}</td>
          <td>${s.address ?? ''}</td>
        </tr>`).join('')

      const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Cairo, sans-serif; background: #fff; color: #111; font-size: 8.5pt; }
  @page { size: A4 portrait; margin: 10mm; }
  @media print { body { margin: 0; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .page-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1a5c35; padding-bottom: 8px; margin-bottom: 8px; }
  .title-box { text-align: center; flex: 1; }
  .title-box h1 { font-size: 13pt; font-weight: 800; color: #0f3d22; }
  .title-box h2 { font-size: 10pt; font-weight: 700; color: #333; }
  .meta { display: flex; justify-content: space-between; font-size: 9pt; color: #444; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead tr { background: #1a5c35; color: #fff; }
  thead th { padding: 5px 3px; font-weight: 700; border: 1px solid #0f3d22; text-align: right; font-size: 8.5pt; }
  tbody tr td { padding: 4px 3px; border: 1px solid #cbd5e1; vertical-align: middle; font-size: 8.5pt; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  
  .col-num { width: 5%; text-align: center; }
  .col-reg { width: 7%; font-family: monospace; }
  .col-name { width: 12%; }
  .col-phone { width: 80px; font-family: monospace; }
  .col-date { width: 11%; }
  .col-level { width: 12%; }
  .col-address { width: 185px; }

</style>
</head>
<body>
  <div class="page-header">
    <div class="logo-box">${logoImg}</div>
    <div class="title-box">
      <h1>${SCHOOL_NAME}</h1>
      <h2>قائمة بيانات الفوج</h2>
    </div>
    <div class="logo-box">${logoImg}</div>
  </div>

  <div class="meta">
    <span>📚 الفوج: <strong>${groupName}</strong></span>
    <span>👨‍🏫 المعلم: <strong>${teacherName}</strong></span>
    <span>📅 تاريخ الطباعة: <strong>${printDate}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
<th class="col-num">الرقم</th>
      <th class="col-reg">ر.ت</th>
      <th class="col-name">اللقب</th>
      <th class="col-name">الاسم</th>
      <th class="col-name">الولي</th>
      <th class="col-phone">الهاتف</th>
      <th class="col-date">تاريخ الميلاد</th>
      <th class="col-level">المستوى</th>
      <th class="col-address">العنوان</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="sig-box">
      <div class="sig"><div class="line"></div>توقيع المعلم</div>
      <div class="sig"><div class="line"></div>توقيع المدير</div>
    </div>
    <span>إجمالي الطلاب: <strong>${students.length}</strong> طالب/ة</span>
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print();window.close();},900);}<\/script>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank', 'width=900,height=700')
      if (!win) toast.error('يرجى السماح بالنوافذ المنبثقة')
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      toast.success('جاري فتح نافذة الطباعة/PDF')
    } catch {
      toast.error('فشل تصدير PDF')
    }
    setExportingPdf(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">جاري التحميل...</div>

  const teacherName = teacher?.fullName ?? '—'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex gap-3 mb-5 no-print flex-wrap">
        <button onClick={exportPdf} disabled={exportingPdf || students.length === 0}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          📄 {exportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
        <button onClick={exportExcel} disabled={exporting || students.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          📊 {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
        </button>
        <button onClick={() => window.print()}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          🖨️ طباعة A4
        </button>
        <span className="text-gray-400 text-sm self-center">{students.length} طالب</span>
      </div>

      <div className="mb-4 border-b pb-4">
        <div className="flex items-center justify-between mb-2">
          <img src="/logo.png" alt="شعار" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          <div className="text-center flex-1 px-4">
            <h2 className="text-base font-bold text-green-900">{SCHOOL_NAME}</h2>
            <h3 className="text-sm font-bold text-gray-700 mt-0.5">قائمة بيانات الفوج</h3>
          </div>
          <img src="/logo.png" alt="شعار" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100 flex-wrap gap-2">
          <span>📚 الفوج: <strong className="text-green-800">{groupName}</strong></span>
          <span>👨‍🏫 المعلم: <strong className="text-green-800">{teacherName}</strong></span>
          <span>📅 {formatDateAr()}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="border border-green-800 p-2 text-center w-10">الرقم</th>
              <th className="border border-green-800 p-2 text-right">رقم التسجيل</th>
              <th className="border border-green-800 p-2 text-right">اللقب</th>
              <th className="border border-green-800 p-2 text-right">الاسم</th>
              <th className="border border-green-800 p-2 text-right">الولي</th>
              <th className="border border-green-800 p-2 text-right">الهاتف</th>
              <th className="border border-green-800 p-2 text-right">تاريخ الميلاد</th>
              <th className="border border-green-800 p-2 text-right">المستوى الدراسي</th>
              <th className="border border-green-800 p-2 text-right">العنوان</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                <td className="border border-gray-300 p-2 text-center text-gray-500 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                <td className="border border-gray-300 p-2 font-mono text-xs">{s.studentNumber}</td>
                <td className="border border-gray-300 p-2 font-medium">{s.lastName}</td>
                <td className="border border-gray-300 p-2 font-medium">{s.firstName}</td>
                <td className="border border-gray-300 p-2 text-gray-600">{s.guardianName ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 font-mono text-xs">{s.guardianPhone ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-500 text-xs font-mono">{s.birthDate ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 text-xs">{s.educationalLevel ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 text-xs">{s.address ?? ''}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">لا يوجد طلاب في هذا الفوج</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        إجمالي الطلاب: {students.length} طالب | تاريخ الطباعة: {formatDateAr()}
      </div>
    </div>
  )
}

// ===== MONTHLY ATTENDANCE PRINT =====
const MONTHS_AR: Record<string, string> = {
  '01':'جانفي','02':'فيفري','03':'مارس','04':'أفريل','05':'ماي','06':'جوان',
  '07':'جويلية','08':'أوت','09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر',
}
type AttRow = { studentId: number; firstName: string; lastName: string; studentNumber: string; records: Record<string, string> }

function MonthlyAttendancePrint({ groupId, groupName, groupNumber }: { groupId: string; groupName: string; groupNumber: string }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [rows, setRows] = useState<AttRow[]>([])
  const [days, setDays] = useState<number[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/groups/${groupId}`).then(r => r.json()),
      fetch(`/api/groups/${groupId}/teacher`).then(r => r.json()),
      fetch(`/api/attendance?groupId=${groupId}&month=${month}`).then(r => r.json()),
    ]).then(([students, teacherData, attendanceData]) => {
      setTeacher(teacherData ?? null)
      const stdArr: Student[] = Array.isArray(students) ? students.filter(Boolean) : []

      const attMap: Record<number, Record<string, string>> = {}
      const daySet = new Set<number>()
      if (Array.isArray(attendanceData)) {
        attendanceData.forEach((a: { studentId: number; date: string; status: string }) => {
          const d = new Date(a.date)
          if (isNaN(d.getTime())) return
          const dayNum = d.getDate()
          daySet.add(dayNum)
          if (!attMap[a.studentId]) attMap[a.studentId] = {}
          attMap[a.studentId][String(dayNum)] = a.status
        })
      }
      const sortedDays = Array.from(daySet).sort((a, b) => a - b)
      setDays(sortedDays)
      setRows(stdArr.map(s => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentNumber: s.studentNumber,
        records: attMap[s.id] ?? {},
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [groupId, month])

  function statusSymbol(status: string) {
    if (status === 'present') return '✓'
    if (status === 'absent') return '✗'
    if (status === 'late') return '~'
    if (status === 'excused') return 'م'
    return ''
  }

  function printReport() {
    const [yr, mo] = month.split('-')
    const monthLabel = `${MONTHS_AR[mo] ?? mo} ${yr}`
    const teacherName = teacher?.fullName ?? '—'
    const header = `
      <div style="text-align:center;margin-bottom:16px">
        <h2 style="font-size:14px;font-weight:bold;color:#0f3d22;margin:0">${SCHOOL_NAME}</h2>
        <h3 style="font-size:12px;margin:4px 0">كشف الحضور الشهري</h3>
        <p style="font-size:11px;color:#555;margin:0">الفوج: ${groupName} (${groupNumber}) | المعلم: ${teacherName} | شهر: ${monthLabel}</p>
        <p style="font-size:10px;color:#888;margin:0">تاريخ الطباعة: ${formatDateAr()}</p>
      </div>`
    const tableHead = `<tr style="background:#1a5c35;color:white"><th style="padding:4px;border:1px solid #0f3d22">رقم</th><th style="padding:4px;border:1px solid #0f3d22">اللقب والاسم</th>${days.map(d => `<th style="padding:4px;border:1px solid #0f3d22;width:28px">${d}</th>`).join('')}<th style="padding:4px;border:1px solid #0f3d22">غياب</th></tr>`
    const tableBody = rows.map((r, i) => {
      const absent = days.filter(d => r.records[String(d)] === 'absent').length
      const cells = days.map(d => {
        const s = r.records[String(d)] ?? ''
        const sym = statusSymbol(s)
        const color = s === 'present' ? '#16a34a' : s === 'absent' ? '#dc2626' : s === 'late' ? '#d97706' : ''
        return `<td style="text-align:center;border:1px solid #ccc;padding:2px 4px;color:${color};font-weight:bold">${sym}</td>`
      }).join('')
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f0fdf4'}"><td style="text-align:center;border:1px solid #ccc;padding:2px 4px;font-size:11px">${i + 1}</td><td style="border:1px solid #ccc;padding:2px 6px;font-size:11px">${r.lastName} ${r.firstName}</td>${cells}<td style="text-align:center;border:1px solid #ccc;padding:2px 4px;font-weight:bold;color:#dc2626">${absent || ''}</td></tr>`
    }).join('')
    const legend = '<div style="margin-top:12px;font-size:10px;color:#666">✓ حاضر &nbsp;|&nbsp; ✗ غائب &nbsp;|&nbsp; ~ متأخر &nbsp;|&nbsp; م مبرر</div>'
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>كشف الحضور</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>${header}<table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table>${legend}<script>window.onload=function(){setTimeout(function(){window.print();window.close();},600);}<\/script></body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'width=1000,height=700')
    if (!win) toast.error('يرجى السماح بالنوافذ المنبثقة')
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  const [yr, mo] = month.split('-')
  const monthLabel = `${MONTHS_AR[mo] ?? mo} ${yr}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap gap-3 items-end mb-4 no-print">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اختر الشهر</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={printReport} disabled={rows.length === 0}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          🖨️ طباعة / PDF
        </button>
        <span className="text-sm text-gray-400 self-center">{rows.length} طالب | {days.length} يوم مسجّل</span>
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">جاري التحميل...</div> : (
        <>
          <div className="text-center mb-3 border-b pb-3">
            <h2 className="font-bold text-green-900">{SCHOOL_NAME}</h2>
            <h3 className="text-sm text-gray-700">كشف الحضور الشهري — {groupName} ({groupNumber})</h3>
            <p className="text-xs text-gray-500">شهر: {monthLabel} | المعلم: {teacher?.fullName ?? '—'}</p>
          </div>

          {days.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد سجلات حضور لهذا الشهر في هذا الفوج</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs" style={{ minWidth: `${200 + days.length * 32}px` }}>
                <thead>
                  <tr className="bg-green-700 text-white">
                    <th className="p-1.5 border border-green-800 w-8 text-center">رقم</th>
                    <th className="p-1.5 border border-green-800 text-right" style={{ minWidth: 150 }}>اسم الطالب</th>
                    {days.map(d => <th key={d} className="p-1.5 border border-green-800 w-7 text-center">{d}</th>)}
                    <th className="p-1.5 border border-green-800 w-10 text-center">غياب</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const absent = days.filter(d => r.records[String(d)] === 'absent').length
                    return (
                      <tr key={r.studentId} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                        <td className="border border-gray-300 p-1 text-center text-gray-500">{i + 1}</td>
                        <td className="border border-gray-300 p-1 font-medium">{r.lastName} {r.firstName}</td>
                        {days.map(d => {
                          const s = r.records[String(d)] ?? ''
                          const sym = statusSymbol(s)
                          const cls = s === 'present' ? 'text-green-600 font-bold' : s === 'absent' ? 'text-red-600 font-bold' : s === 'late' ? 'text-amber-600 font-bold' : ''
                          return <td key={d} className={`border border-gray-300 p-1 text-center ${cls}`}>{sym}</td>
                        })}
                        <td className="border border-gray-300 p-1 text-center font-bold text-red-600">{absent || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">✓ حاضر | ✗ غائب | ~ متأخر | م مبرر</p>
        </>
      )}
    </div>
  )
}

// ===== STAFF ID CARDS =====
type StaffMember = { id: number; fullName: string; role: string; teacherNumber: string | null; phone: string | null; qualification: string | null }

function StaffCardsSection() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'teacher' | 'admin'>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/teachers').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([teachersData, usersData]) => {
      const tArr: StaffMember[] = (Array.isArray(teachersData) ? teachersData : []).map((t: { id: number; fullName: string; teacherNumber: string | null; phone: string | null; qualification: string | null }) => ({
        id: t.id, fullName: t.fullName, role: 'teacher',
        teacherNumber: t.teacherNumber, phone: t.phone, qualification: t.qualification,
      }))
      const aArr: StaffMember[] = (Array.isArray(usersData) ? usersData : [])
        .filter((u: { role: string }) => u.role === 'admin')
        .map((u: { id: number; fullName: string | null; username: string; phone: string | null }) => ({
          id: u.id, fullName: u.fullName ?? u.username, role: 'admin',
          teacherNumber: null, phone: u.phone, qualification: null,
        }))
      setStaff([...tArr, ...aArr])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const visible = staff.filter(s => filter === 'all' || s.role === filter)

  async function printCards() {
    let bgDataUrl = ''
    try {
      const bgRes = await fetch('/ferdous-bg.jpg')
      const bgBlob = await bgRes.blob()
      bgDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(bgBlob)
      })
    } catch { /* skip if unavailable */ }

    const bgImgHtml = bgDataUrl ? `<img src="${bgDataUrl}" alt="" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:88%;height:auto;object-fit:contain;opacity:0.10;pointer-events:none;z-index:0;" />` : ''

    const cardsHtml = visible.map((s, idx) => {
      const isTeacher = s.role === 'teacher'
      const roleTitle = isTeacher ? 'بطاقة معلم' : 'بطاقة إداري'
      const roleBadge = isTeacher ? 'معلم' : ' إداري'
      const mainColor = isTeacher ? '#1a5c35' : '#0369a1'
      const darkColor = isTeacher ? '#0f3d22' : '#0c4a6e'
      const lightColor = isTeacher ? '#e8f5e9' : '#e0f2fe'
      const accentColor = isTeacher ? '#d4a017' : '#fbbf24'

      const codeVal = s.teacherNumber || `STF-${s.id}`
      const barcodeId = `barcode-staff-${idx}`

      const numHtml = s.teacherNumber ? `<p style="font-size:8pt;color:#333;margin:0 0 2px;">🆔 الرقم: <strong style="font-family:monospace;color:${mainColor};">${s.teacherNumber}</strong></p>` : ''
      const qualHtml = s.qualification ? `<p style="font-size:7.5pt;color:#444;margin:0 0 2px;">🎓 التخصص: ${s.qualification}</p>` : ''
      const phoneHtml = s.phone ? `<p style="font-size:7.5pt;color:#444;margin:0 0 2px;direction:ltr;text-align:right;">📞 ${s.phone}</p>` : ''

      return `
        <div class="card" style="width:85.6mm;height:53.98mm;border:2px solid ${mainColor};border-radius:3mm;overflow:hidden;background:#fff;display:flex;flex-direction:column;font-family:Cairo,sans-serif;page-break-inside:avoid;break-inside:avoid;position:relative;" data-barcode-id="${barcodeId}" data-code-val="${codeVal}">
          ${bgImgHtml}
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;">
            <div style="background:linear-gradient(to left,${mainColor},${darkColor});padding:3px 7px;display:flex;align-items:center;gap:5px;flex-shrink:0;">
              <span style="color:#fff;font-size:8.5pt;font-weight:700;flex:1;">${SCHOOL_NAME.split('|')[0].trim()}</span>
              <span style="color:rgba(255,255,255,0.85);font-size:7.5pt;">${roleTitle}</span>
            </div>
            <div style="flex:1;padding:4px 8px 2px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                <span style="font-size:8pt;font-weight:700;color:${darkColor};background:${lightColor};padding:1px 8px;border-radius:20px;border:1px solid ${mainColor}44;">
                  ${roleBadge}
                </span>
             
              </div>
              <div style="text-align:center;margin:1px 0;">
                <p style="font-weight:800;font-size:11.5pt;color:#0f0f0f;margin:0;line-height:1.2;">${s.fullName}</p>
              </div>
              <div style="background:rgba(255,255,255,0.85);border-radius:4px;padding:2px 6px;">
                ${numHtml}
                ${qualHtml}
                ${phoneHtml}
              </div>
              <div style="text-align:center;margin-top:auto;padding-top:2px;">
                <svg id="${barcodeId}" style="width:100%;max-height:22px;display:block;margin:0 auto;"></svg>
              </div>
            </div>
            <div style="height:4px;background:linear-gradient(to right,${mainColor},${accentColor},${mainColor});flex-shrink:0;"></div>
          </div>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8"/>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 10px; background: white; font-family: Cairo, sans-serif; }
  @page { size: A4 landscape; margin: 8mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 85.6mm); grid-auto-rows: 53.98mm; gap: 4mm; width: fit-content; margin: 0 auto; }
  .card { page-break-inside: avoid; break-inside: avoid; }
  @media print { body { margin: 0; padding: 0; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>
<div class="grid">${cardsHtml}</div>
<script>
  window.onload = function() {
    document.querySelectorAll('.card').forEach(function(card) {
      var barcodeId = card.getAttribute('data-barcode-id');
      var codeVal = card.getAttribute('data-code-val');
      if (barcodeId && codeVal) {
        try {
          JsBarcode('#' + barcodeId, codeVal, {
            format: 'CODE128',
            width: 1.2,
            height: 20,
            displayValue: false,
            margin: 0
          });
        } catch(e) {}
      }
    });
    setTimeout(function() {
      window.print();
      window.close();
    }, 1000);
  };
<\/script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'width=1100,height=800')
    if (!win) toast.error('يرجى السماح بالنوافذ المنبثقة')
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5 no-print">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'teacher', label: 'المعلمون' },
            { key: 'admin', label: 'الإداريون' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as 'all' | 'teacher' | 'admin')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={printCards} disabled={visible.length === 0}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          🖨️ طباعة البطاقات ({visible.length})
        </button>
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">جاري التحميل...</div> : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {visible.map(s => (
            <div key={`${s.role}-${s.id}`}
              className="rounded-xl overflow-hidden text-white flex flex-col"
              style={{
                background: 'linear-gradient(135deg, #1a5c35 0%, #2d7a50 100%)',
                minHeight: 140,
                padding: 16,
              }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {s.fullName[0]?.toUpperCase()}
                </div>
                <div className="text-xs opacity-85 leading-tight">{SCHOOL_NAME.split('|')[0].trim()}</div>
              </div>
              <div className="text-base font-bold text-center border-b border-white/20 pb-2 mb-2">{s.fullName}</div>
              <div className="text-xs text-center opacity-90 mb-1">
                {s.role === 'teacher' ? '‍معلم' : 'إداري'}
              </div>
              <div className="mt-auto flex flex-col gap-0.5 text-xs opacity-75">
                {s.teacherNumber && <span>رقم التسجيل: {s.teacherNumber}</span>}
                {/* =====   {s.qualification && <span>🎓 {s.qualification}</span>} ===== */}
                {s.phone && <span>📞 {s.phone}</span>}
                <span className="opacity-60">{ACADEMIC_YEAR}</span>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-center text-gray-400 col-span-full py-8">لا يوجد أعضاء طاقم</p>
          )}
        </div>
      )}
    </div>
  )
}
