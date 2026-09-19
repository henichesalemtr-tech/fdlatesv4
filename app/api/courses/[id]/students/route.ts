import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { courseStudents } from '@/db/schemas/schema'
import { and, eq } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

// POST /api/courses/[id]/students — enroll a student
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const courseId = parseInt(id)
  const { studentId, notes } = await req.json()
  if (!studentId) return NextResponse.json({ error: 'معرّف الطالب مطلوب' }, { status: 400 })

  // Prevent duplicate enrollment
  const [existing] = await db
    .select({ id: courseStudents.id })
    .from(courseStudents)
    .where(and(eq(courseStudents.courseId, courseId), eq(courseStudents.studentId, parseInt(studentId))))
    .limit(1)
  if (existing) return NextResponse.json({ error: 'الطالب مسجّل بالفعل في هذه الدورة' }, { status: 409 })

  const [row] = await db.insert(courseStudents).values({
    courseId,
    studentId: parseInt(studentId),
    notes: notes?.trim() || null,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}

// DELETE /api/courses/[id]/students?enrollmentId=X — unenroll a student
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const courseId = parseInt(id)
  const { searchParams } = new URL(req.url)
  const enrollmentId = parseInt(searchParams.get('enrollmentId') ?? '')
  if (isNaN(enrollmentId)) return NextResponse.json({ error: 'معرّف التسجيل مطلوب' }, { status: 400 })

  await db.delete(courseStudents).where(
    and(eq(courseStudents.id, enrollmentId), eq(courseStudents.courseId, courseId))
  )
  return NextResponse.json({ success: true })
}
