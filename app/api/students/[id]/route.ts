import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students, users, groupStudents, teacherGroups } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession, hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

// Check if teacher can edit this student (student must be in one of teacher's groups)
async function teacherCanEditStudent(teacherId: number, studentId: number): Promise<boolean> {
  const result = await db
    .select({ id: groupStudents.id })
    .from(groupStudents)
    .innerJoin(teacherGroups, and(
      eq(teacherGroups.groupId, groupStudents.groupId),
      eq(teacherGroups.teacherId, teacherId)
    ))
    .where(eq(groupStudents.studentId, studentId))
    .limit(1)
  return result.length > 0
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const [student] = await db.select().from(students).where(eq(students.id, parseInt(id))).limit(1)
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(student)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const studentId = parseInt(id)
  
    // Teacher can only edit students in their own groups
    if (session.role === 'teacher') {
      if (!session.teacherId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const canEdit = await teacherCanEditStudent(session.teacherId, studentId)
      if (!canEdit) return NextResponse.json({ error: 'يمكنك فقط تعديل طلاب أفواجك' }, { status: 403 })
    } else if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const { firstName, lastName, gender, birthDate, address, phone, guardianName, guardianPhone, educationalLevel, enrollmentDate, status, notes } = body
  
    // Create or find guardian user account if phone changed
    let guardianUserId: number | null | undefined = undefined
    if (guardianPhone !== undefined) {
      if (!guardianPhone) {
        guardianUserId = null
      } else {
        const existingUser = await db.select().from(users).where(eq(users.username, guardianPhone)).limit(1)
        if (existingUser.length > 0) {
          guardianUserId = existingUser[0].id
          // Update name if provided
          if (guardianName) {
            await db.update(users).set({ fullName: guardianName }).where(eq(users.id, existingUser[0].id))
          }
        } else {
          const hashed = await hashPassword(guardianPhone)
          const [newUser] = await db.insert(users).values({
            username: guardianPhone,
            password: hashed,
            fullName: guardianName || 'ولي أمر',
            role: 'guardian',
            phone: guardianPhone,
            status: 'active',
          }).returning()
          guardianUserId = newUser.id
        }
      }
    }
  
    const updateData: Record<string, unknown> = {
      firstName,
      lastName,
      gender: gender || null,
      birthDate: birthDate || null,
      address: address || null,
      phone: phone || null,
      guardianName: guardianName || null,
      guardianPhone: guardianPhone || null,
      educationalLevel: educationalLevel || null,
      enrollmentDate: enrollmentDate || null,
      status: status || 'waiting',
      notes: notes || null,
    }
    if (guardianUserId !== undefined) updateData.guardianUserId = guardianUserId
  
    const [updated] = await db.update(students).set(updateData as Partial<typeof students.$inferInsert>)
      .where(eq(students.id, studentId)).returning()
  
    await logActivity({
      userId: session.id,
      userFullName: session.fullName ?? session.username,
      userRole: session.role,
      action: 'update',
      entity: 'student',
      entityId: studentId,
      description: `تم تعديل بيانات الطالب: ${updated.firstName} ${updated.lastName} (${updated.studentNumber})`,
    })
  
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const [student] = await db.select().from(students).where(eq(students.id, parseInt(id))).limit(1)
    await db.delete(students).where(eq(students.id, parseInt(id)))
  
    await logActivity({
      userId: session.id,
      userFullName: session.fullName ?? session.username,
      userRole: session.role,
      action: 'delete',
      entity: 'student',
      entityId: parseInt(id),
      description: `تم حذف الطالب: ${student ? `${student.firstName} ${student.lastName} (${student.studentNumber})` : `#${id}`}`,
    })
  
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
