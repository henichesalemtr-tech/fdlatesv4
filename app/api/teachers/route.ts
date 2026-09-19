import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teachers, users } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await db.select().from(teachers).orderBy(desc(teachers.createdAt))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { fullName, qualification, phone, email, hireDate, baseSalary, createAccount, password } = body
    if (!fullName) return NextResponse.json({ error: 'الاسم الكامل مطلوب' }, { status: 400 })
  
    const [last] = await db.select({ id: teachers.id }).from(teachers).orderBy(desc(teachers.id)).limit(1)
    const nextId = (last?.id ?? 0) + 1
    const teacherNumber = `T${String(nextId).padStart(4, '0')}`
  
    const [created] = await db.insert(teachers).values({
      teacherNumber, fullName,
      qualification: qualification || null,
      phone: phone || null,
      email: email || null,
      hireDate: hireDate || null,
      baseSalary: baseSalary || null,
      status: 'active',
    }).returning()
  
    // Create user account for teacher if requested
    if (createAccount && phone && password) {
      const hashed = await hashPassword(password)
      const [userCreated] = await db.insert(users).values({
        role: 'teacher',
        username: phone,
        phone: phone,
        password: hashed,
        fullName: fullName,
        teacherId: created.id,
        status: 'active',
      }).returning()
      await db.update(teachers).set({ userId: userCreated.id }).where(eq(teachers.id, created.id))
    }
  
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
