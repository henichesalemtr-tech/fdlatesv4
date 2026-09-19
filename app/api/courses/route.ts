import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, courseStudents, courseRegistrations } from '@/db/schemas/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

// GET /api/courses — list all courses with enrollment counts
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      description: courses.description,
      educationLevel: courses.educationLevel,
      startDate: courses.startDate,
      endDate: courses.endDate,
      capacity: courses.capacity,
      price: courses.price,
      status: courses.status,
      notes: courses.notes,
      createdAt: courses.createdAt,
      enrolledCount: count(courseStudents.id),
      pendingRegistrations: sql<number>`count(case when ${courseRegistrations.status} = 'pending' then 1 end)`,
    })
    .from(courses)
    .leftJoin(courseStudents, eq(courseStudents.courseId, courses.id))
    .leftJoin(courseRegistrations, eq(courseRegistrations.courseId, courses.id))
    .groupBy(courses.id)
    .orderBy(desc(courses.createdAt))

  return NextResponse.json(rows)
}

// POST /api/courses — create course (admin only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, educationLevel, startDate, endDate, capacity, price, status, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: 'اسم الدورة مطلوب' }, { status: 400 })

  const [created] = await db.insert(courses).values({
    name: name.trim(),
    description: description?.trim() || null,
    educationLevel: educationLevel || null,
    startDate: startDate || null,
    endDate: endDate || null,
    capacity: capacity ? parseInt(capacity) : null,
    price: price ? parseInt(price) : 0,
    status: status || 'open',
    notes: notes?.trim() || null,
  }).returning()

  return NextResponse.json(created, { status: 201 })
}
