import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groupStudents, students, teacherGroups } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

async function hasGroupAccess(session: { role: string; teacherId?: number | null }, groupId: number): Promise<boolean> {
  if (session.role === 'admin') return true
  if (session.role === 'teacher' && session.teacherId) {
    const [assigned] = await db.select().from(teacherGroups)
      .where(and(eq(teacherGroups.teacherId, session.teacherId), eq(teacherGroups.groupId, groupId)))
      .limit(1)
    return !!assigned
  }
  return false
}

// Get all students in a group
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const groupId = parseInt(id)
    if (isNaN(groupId)) return NextResponse.json({ error: 'Invalid group id' }, { status: 400 })
  
    const rows = await db
      .select({
        id: students.id,
        studentNumber: students.studentNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        gender: students.gender,
        phone: students.phone,
        guardianPhone: students.guardianPhone,
        status: students.status,
        joinedDate: groupStudents.joinedDate,
      })
      .from(groupStudents)
      .innerJoin(students, eq(groupStudents.studentId, students.id))
      .where(eq(groupStudents.groupId, groupId))
  
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// Add one or multiple students to group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const groupId = parseInt(id)
    if (!(await hasGroupAccess(session, groupId))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const today = new Date().toISOString().split('T')[0]
  
    const studentIds: number[] = Array.isArray(body.studentIds) ? body.studentIds : [body.studentId]
    const added: number[] = []
    const skipped: number[] = []
  
    for (const studentId of studentIds) {
      const [existing] = await db.select().from(groupStudents)
        .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)))
        .limit(1)
      if (existing) { skipped.push(studentId); continue }
      await db.insert(groupStudents).values({ groupId, studentId, joinedDate: today })
      await db.update(students).set({ status: 'active' }).where(eq(students.id, studentId))
      added.push(studentId)
    }
  
    if (added.length === 0 && skipped.length > 0) {
      return NextResponse.json({ error: 'الطلاب المحددون مضافون مسبقاً في هذا الفوج' }, { status: 400 })
    }
    return NextResponse.json({ success: true, added: added.length, skipped: skipped.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// Remove student from group
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const groupId = parseInt(id)
    if (!(await hasGroupAccess(session, groupId))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { studentId } = await req.json()
  
    await db.delete(groupStudents).where(
      and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId))
    )
  
    const otherGroups = await db.select().from(groupStudents).where(eq(groupStudents.studentId, studentId)).limit(1)
    if (otherGroups.length === 0) {
      await db.update(students).set({ status: 'waiting' }).where(eq(students.id, studentId))
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
