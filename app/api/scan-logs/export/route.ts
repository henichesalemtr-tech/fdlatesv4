import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { scanLogs, students, groupStudents, groups } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const groupId = searchParams.get('groupId')

  const logs = await db.select({
    studentId: scanLogs.studentId,
    scanType: scanLogs.scanType,
    scanDate: scanLogs.scanDate,
    scanTime: scanLogs.scanTime,
    firstName: students.firstName,
    lastName: students.lastName,
    studentNumber: students.studentNumber,
    groupId: groupStudents.groupId,
    groupName: groups.name,
  })
  .from(scanLogs)
  .leftJoin(students, eq(scanLogs.studentId, students.id))
  .leftJoin(groupStudents, eq(groupStudents.studentId, students.id))
  .leftJoin(groups, eq(groupStudents.groupId, groups.id))
  .where(eq(scanLogs.scanDate, date))

  const filtered = groupId
    ? logs.filter(l => l.groupId === parseInt(groupId))
    : logs

  // Build CSV
  const csvHeader = 'الاسم,رقم الطالب,الفوج,نوع المسح,وقت المسح,التاريخ\n'
  const csvRows = filtered.map(l =>
    [
      `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(),
      l.studentNumber ?? '',
      l.groupName ?? '',
      l.scanType === 'barcode' ? 'باركود' : 'QR',
      l.scanTime ?? '',
      l.scanDate ?? '',
    ].map(v => `"${v}"`).join(',')
  ).join('\n')

  const csv = '\uFEFF' + csvHeader + csvRows // BOM for Arabic Excel
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="scan-monitor-${date}.csv"`,
    },
  })
}
