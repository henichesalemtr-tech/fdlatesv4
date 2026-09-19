import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, students } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
  
    // Unlink students first
    await db.update(students).set({ guardianUserId: null }).where(eq(students.guardianUserId, parseInt(id)))
    await db.delete(users).where(eq(users.id, parseInt(id)))
  
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
