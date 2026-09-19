import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { rooms } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const body = await req.json()
    const { name, roomNumber, floor, capacity, status, equipment } = body
    const [updated] = await db.update(rooms).set({
      name,
      roomNumber: roomNumber || null,
      floor: floor || null,
      capacity: capacity ? parseInt(capacity) : null,
      status: status || 'available',
      equipment: equipment || null,
    }).where(eq(rooms.id, parseInt(id))).returning()
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
    await db.delete(rooms).where(eq(rooms.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
