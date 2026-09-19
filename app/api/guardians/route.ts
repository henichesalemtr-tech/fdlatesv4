import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, students } from '@/db/schemas/schema'
import { eq, desc, like, or } from 'drizzle-orm'
import { getSession, hashPassword } from '@/lib/auth'

// GET /api/guardians — list all guardian users with their students
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
  
    let guardianUsers = await db.select().from(users)
      .where(eq(users.role, 'guardian'))
      .orderBy(desc(users.createdAt))
  
    if (search) {
      guardianUsers = guardianUsers.filter(u =>
        (u.fullName ?? '').includes(search) ||
        (u.phone ?? '').includes(search) ||
        (u.username ?? '').includes(search)
      )
    }
  
    // For each guardian user, get their linked students
    const result = await Promise.all(guardianUsers.map(async (g) => {
      const linkedStudents = await db.select({
        id: students.id,
        studentNumber: students.studentNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        status: students.status,
      }).from(students).where(eq(students.guardianUserId, g.id))
  
      return { ...g, students: linkedStudents }
    }))
  
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// POST /api/guardians — create a guardian user manually
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const { fullName, phone, studentId } = await req.json()
    if (!fullName || !phone) return NextResponse.json({ error: 'الاسم ورقم الهاتف مطلوبان' }, { status: 400 })
  
    // Check if user with this phone already exists
    const existing = await db.select().from(users).where(eq(users.username, phone)).limit(1)
    if (existing.length > 0) {
      // Link existing user to student if provided
      if (studentId) {
        await db.update(students).set({ guardianUserId: existing[0].id }).where(eq(students.id, studentId))
      }
      return NextResponse.json(existing[0])
    }
  
    const hashed = await hashPassword(phone)
    const [created] = await db.insert(users).values({
      username: phone,
      password: hashed,
      fullName,
      role: 'guardian',
      phone,
      status: 'active',
    }).returning()
  
    if (studentId) {
      await db.update(students).set({ guardianUserId: created.id }).where(eq(students.id, studentId))
    }
  
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
