import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, courseRegistrations, settings } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/coursereg — list open courses for public registration form
export async function GET() {
  // Check if registration is globally enabled
  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'course_registration_enabled'))
    .limit(1)

  const enabled = !setting || setting.value !== 'false'
  if (!enabled) {
    return NextResponse.json({ enabled: false, courses: [] })
  }

  const openCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      description: courses.description,
      educationLevel: courses.educationLevel,
      startDate: courses.startDate,
      endDate: courses.endDate,
      capacity: courses.capacity,
      price: courses.price,
    })
    .from(courses)
    .where(eq(courses.status, 'open'))

  return NextResponse.json({ enabled: true, courses: openCourses })
}

// POST /api/coursereg — submit a public registration
export async function POST(req: NextRequest) {
  // Check if registration is globally enabled
  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'course_registration_enabled'))
    .limit(1)

  if (setting && setting.value === 'false') {
    return NextResponse.json({ error: 'التسجيل في الدورات مغلق حالياً' }, { status: 403 })
  }

  const body = await req.json()
  const { courseId, firstName, lastName, phone, guardianName, guardianPhone, educationLevel, notes } = body

  if (!courseId || !firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'الاسم الأول والأخير والدورة مطلوبة' }, { status: 400 })
  }

  // Verify course exists and is open
  const [course] = await db
    .select({ id: courses.id, status: courses.status })
    .from(courses)
    .where(and(eq(courses.id, parseInt(courseId)), eq(courses.status, 'open')))
    .limit(1)

  if (!course) {
    return NextResponse.json({ error: 'الدورة غير متاحة للتسجيل' }, { status: 404 })
  }

  const [reg] = await db.insert(courseRegistrations).values({
    courseId: course.id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone?.trim() || null,
    guardianName: guardianName?.trim() || null,
    guardianPhone: guardianPhone?.trim() || null,
    educationLevel: educationLevel || null,
    notes: notes?.trim() || null,
  }).returning()

  return NextResponse.json({ success: true, id: reg.id }, { status: 201 })
}
