import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { rooms } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await db.select().from(rooms).orderBy(desc(rooms.createdAt))
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
    const { name, roomNumber, floor, capacity, status, equipment } = body
    if (!name) return NextResponse.json({ error: 'اسم القاعة مطلوب' }, { status: 400 })
    const [created] = await db.insert(rooms).values({
      name,
      roomNumber: roomNumber || null,
      floor: floor || null,
      capacity: capacity ? parseInt(capacity) : null,
      status: status || 'available',
      equipment: equipment || null,
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
