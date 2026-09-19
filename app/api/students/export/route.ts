import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students } from '@/db/schemas/schema'
import { getSession } from '@/lib/auth'
import ExcelJS from 'exceljs'
import { desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allStudents = await db.select().from(students).orderBy(desc(students.id))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'نظام نور للقرآن'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('الطلاب', { properties: { tabColor: { argb: '1a5c35' } } })

  // RTL direction
  sheet.views = [{ rightToLeft: true }]

  // Headers
  const headers = [
    { key: 'student_number', header: 'رقم التسجيل', width: 15 },
    { key: 'first_name', header: 'الاسم الأول', width: 20 },
    { key: 'last_name', header: 'الاسم الأخير', width: 20 },
    { key: 'gender', header: 'الجنس', width: 10 },
    { key: 'birth_date', header: 'تاريخ الميلاد', width: 15 },
    { key: 'phone', header: 'رقم الهاتف', width: 15 },
    { key: 'guardian_name', header: 'اسم الولي', width: 20 },
    { key: 'educational_level', header: 'المستوى الدراسي', width: 18 },
    { key: 'enrollment_date', header: 'تاريخ التسجيل', width: 15 },
    { key: 'status', header: 'الحالة', width: 15 },
    { key: 'notes', header: 'ملاحظات', width: 30 },
  ]

  sheet.columns = headers.map(h => ({ header: h.header, key: h.key, width: h.width }))

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1a5c35' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 25

  // Status translations
  const statusMap: Record<string, string> = {
    active: 'نشط', waiting: 'في الانتظار', withdrawn: 'منسحب', graduated: 'متخرج',
  }
  const genderMap: Record<string, string> = { male: 'ذكر', female: 'أنثى' }

  // Add data rows
  allStudents.forEach((s, idx) => {
    const row = sheet.addRow({
      student_number: s.studentNumber ?? '',
      first_name: s.firstName,
      last_name: s.lastName,
      gender: genderMap[s.gender ?? ''] ?? '',
      birth_date: s.birthDate ?? '',
      phone: s.phone ?? '',
      guardian_name: s.guardianName ?? '',
      educational_level: s.educationalLevel ?? '',
      enrollment_date: s.enrollmentDate ?? '',
      status: statusMap[s.status] ?? s.status,
      notes: s.notes ?? '',
    })
    // Alternate row colors
    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f0f9f4' } }
    }
    row.alignment = { horizontal: 'right', vertical: 'middle' }
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `students_${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
