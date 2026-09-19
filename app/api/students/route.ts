import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students, groupStudents, groups, users } from '@/db/schemas/schema'
import { eq, or, ilike, desc, sql } from 'drizzle-orm'
import { getSession, hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const gender = searchParams.get('gender') ?? ''
    const includeGroup = searchParams.get('includeGroup') === 'true'
  
    let query = db.select().from(students).$dynamic()
  
    const conditions = []
    if (search) {
      conditions.push(
        or(
          ilike(students.firstName, `%${search}%`),
          ilike(students.lastName, `%${search}%`),
          ilike(students.studentNumber, `%${search}%`)
        )
      )
    }
    if (status) conditions.push(eq(students.status, status as 'waiting' | 'active' | 'withdrawn' | 'graduated'))
    if (gender) conditions.push(eq(students.gender, gender as 'male' | 'female'))
  
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0]! : sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`)
    }
  
    const result = await query.orderBy(desc(students.createdAt))
  
    if (!includeGroup) return NextResponse.json(result)
  
    // Attach group name for each student
    const studentIds = result.map(s => s.id)
    if (studentIds.length === 0) return NextResponse.json(result)
  
    const groupRows = await db
      .select({ studentId: groupStudents.studentId, groupName: groups.name, groupNumber: groups.groupNumber })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .where(sql`${groupStudents.studentId} = ANY(${sql.raw(`ARRAY[${studentIds.join(',')}]::int[]`)})`)
  
    const groupMap = new Map<number, string>()
    for (const row of groupRows) {
      if (!groupMap.has(row.studentId)) {
        groupMap.set(row.studentId, `${row.groupName} (${row.groupNumber})`)
      }
    }
  
    const enriched = result.map(s => ({ ...s, groupName: groupMap.get(s.id) ?? null }))
    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const body = await req.json()
    const { firstName, lastName, gender, birthDate, address, phone, guardianName, guardianPhone, educationalLevel, enrollmentDate, notes } = body
  
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'الاسم الأول والأخير مطلوبان' }, { status: 400 })
    }
  
    // Auto-generate student number
    const [last] = await db.select({ id: students.id }).from(students).orderBy(desc(students.id)).limit(1)
    const nextId = (last?.id ?? 0) + 1
    const studentNumber = `FD${String(nextId).padStart(4, '0')}`
  
    // Create or find guardian user account if phone provided
    let guardianUserId: number | null = null
    if (guardianPhone) {
      const existingUser = await db.select().from(users).where(eq(users.username, guardianPhone)).limit(1)
      if (existingUser.length > 0) {
        guardianUserId = existingUser[0].id
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
  
    const [created] = await db.insert(students).values({
      studentNumber,
      firstName,
      lastName,
      gender: gender || null,
      birthDate: birthDate || null,
      address: address || null,
      phone: phone || null,
      guardianName: guardianName || null,
      guardianPhone: guardianPhone || null,
      guardianUserId,
      educationalLevel: educationalLevel || null,
      enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
      status: 'waiting',
      notes: notes || null,
    }).returning()
  
    await logActivity({
      userId: session.id,
      userFullName: session.fullName ?? session.username,
      userRole: session.role,
      action: 'create',
      entity: 'student',
      entityId: created.id,
      description: `تم إضافة طالب جديد: ${created.firstName} ${created.lastName} (${created.studentNumber})`,
    })
  
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
