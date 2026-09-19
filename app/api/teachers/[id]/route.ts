import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teachers } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const body = await req.json()
    const { fullName, qualification, phone, email, hireDate, baseSalary, status } = body
    const [updated] = await db.update(teachers).set({
      fullName, qualification: qualification || null,
      phone: phone || null, email: email || null,
      hireDate: hireDate || null, baseSalary: baseSalary || null,
      status: status || 'active',
    }).where(eq(teachers.id, parseInt(id))).returning()
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
    await db.delete(teachers).where(eq(teachers.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
