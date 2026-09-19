import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, courseStudents, courseRegistrations, students } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

// GET /api/courses/[id] — course detail + enrolled students + registrations
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const courseId = parseInt(id)
  if (isNaN(courseId)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })

  const enrolled = await db
    .select({
      id: courseStudents.id,
      studentId: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      phone: students.phone,
      enrolledAt: courseStudents.enrolledAt,
      notes: courseStudents.notes,
    })
    .from(courseStudents)
    .leftJoin(students, eq(courseStudents.studentId, students.id))
    .where(eq(courseStudents.courseId, courseId))

  const registrations = await db
    .select()
    .from(courseRegistrations)
    .where(eq(courseRegistrations.courseId, courseId))
    .orderBy(courseRegistrations.createdAt)

  return NextResponse.json({ course, enrolled, registrations })
}

// PUT /api/courses/[id] — update course (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const courseId = parseInt(id)
  if (isNaN(courseId)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  const body = await req.json()
  const { name, description, educationLevel, startDate, endDate, capacity, price, status, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: 'اسم الدورة مطلوب' }, { status: 400 })

  const [updated] = await db.update(courses).set({
    name: name.trim(),
    description: description?.trim() || null,
    educationLevel: educationLevel || null,
    startDate: startDate || null,
    endDate: endDate || null,
    capacity: capacity ? parseInt(capacity) : null,
    price: price !== undefined ? parseInt(price) : 0,
    status: status || 'open',
    notes: notes?.trim() || null,
    updatedAt: new Date(),
  }).where(eq(courses.id, courseId)).returning()

  if (!updated) return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/courses/[id] — delete course (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const courseId = parseInt(id)
  if (isNaN(courseId)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  await db.delete(courses).where(eq(courses.id, courseId))
  return NextResponse.json({ success: true })
}
