import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, teacherGroups } from '@/db/schemas/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    // Teacher: only see their assigned groups
    if (session.role === 'teacher' && session.teacherId) {
      const assigned = await db.select({ groupId: teacherGroups.groupId })
        .from(teacherGroups)
        .where(eq(teacherGroups.teacherId, session.teacherId))
      const ids = assigned.map(r => r.groupId).filter((id): id is number => id !== null)
      if (ids.length === 0) return NextResponse.json([])
      const result = await db.select().from(groups).where(inArray(groups.id, ids))
      return NextResponse.json(result)
    }
  
    const result = await db.select().from(groups).orderBy(desc(groups.createdAt))
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
    const { name, groupNumber, groupType, capacity, status } = body
    if (!name) return NextResponse.json({ error: 'اسم الفوج مطلوب' }, { status: 400 })
    const [last] = await db.select({ id: groups.id }).from(groups).orderBy(desc(groups.id)).limit(1)
    const nextId = (last?.id ?? 0) + 1
    const autoNumber = groupNumber || `G${String(nextId).padStart(3, '0')}`
    const [created] = await db.insert(groups).values({
      name, groupNumber: autoNumber,
      groupType: groupType || null,
      capacity: capacity ? parseInt(capacity) : null,
      status: status || 'open',
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
