import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { scanLogs, students, groupStudents, groups } from '@/db/schemas/schema'
import { eq, desc, and, inArray, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// GET — scan monitor: returns scanned + not-scanned for a given date
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const groupId = searchParams.get('groupId')
  const search = searchParams.get('search') ?? ''

  // Get scan logs for the date
  const logsQuery = db.select({
    id: scanLogs.id,
    studentId: scanLogs.studentId,
    scanType: scanLogs.scanType,
    scanDate: scanLogs.scanDate,
    scanTime: scanLogs.scanTime,
    createdAt: scanLogs.createdAt,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    studentNumber: students.studentNumber,
  })
  .from(scanLogs)
  .leftJoin(students, eq(scanLogs.studentId, students.id))
  .where(eq(scanLogs.scanDate, date))
  .orderBy(desc(scanLogs.createdAt))

  const logs = await logsQuery

  // Filter by group if requested
  let groupStudentIds: number[] | null = null
  if (groupId) {
    const gs = await db.select({ studentId: groupStudents.studentId })
      .from(groupStudents).where(eq(groupStudents.groupId, parseInt(groupId)))
    groupStudentIds = gs.map(g => g.studentId)
  }

  const scanned = logs
    .filter(l => {
      if (groupStudentIds && l.studentId && !groupStudentIds.includes(l.studentId)) return false
      if (search) {
        const name = `${l.studentFirstName ?? ''} ${l.studentLastName ?? ''}`.toLowerCase()
        if (!name.includes(search.toLowerCase())) return false
      }
      return true
    })
    .map(l => ({
      id: l.id,
      studentId: l.studentId,
      name: `${l.studentFirstName ?? ''} ${l.studentLastName ?? ''}`.trim(),
      studentNumber: l.studentNumber,
      scanType: l.scanType,
      scanTime: l.scanTime,
      createdAt: l.createdAt,
    }))

  // Get all active students in groups (for "not scanned" list)
  let allStudentsQuery = db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    studentNumber: students.studentNumber,
    groupId: groupStudents.groupId,
    groupName: groups.name,
  })
  .from(groupStudents)
  .leftJoin(students, eq(groupStudents.studentId, students.id))
  .leftJoin(groups, eq(groupStudents.groupId, groups.id))

  if (groupId) {
    allStudentsQuery = allStudentsQuery.where(eq(groupStudents.groupId, parseInt(groupId))) as typeof allStudentsQuery
  }

  const allStudents = await allStudentsQuery

  const scannedIds = new Set(scanned.map(s => s.studentId))
  const notScanned = allStudents
    .filter(s => s.id && !scannedIds.has(s.id))
    .filter(s => {
      if (search) {
        const name = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase()
        return name.includes(search.toLowerCase())
      }
      return true
    })
    .map(s => ({
      studentId: s.id,
      name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
      studentNumber: s.studentNumber,
      groupId: s.groupId,
      groupName: s.groupName,
    }))

  return NextResponse.json({ scanned, notScanned, date })
}

// POST — record a scan
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { studentId, scanType, scanDate, scanTime } = body
  if (!studentId || !scanDate) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const [log] = await db.insert(scanLogs).values({
    studentId: parseInt(studentId),
    scanType: scanType ?? 'barcode',
    scanDate,
    scanTime: scanTime ?? null,
  }).returning()

  return NextResponse.json(log, { status: 201 })
}
