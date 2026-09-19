import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession, hashPassword, hasPermission } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!await hasPermission(session, 'users.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const { fullName, role, phone, email, status, password } = await req.json()
    const updateData: Record<string, unknown> = { fullName: fullName || null, role, phone: phone || null, email: email || null, status }
    if (password) updateData.password = await hashPassword(password)
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, parseInt(id))).returning({
      id: users.id, username: users.username, role: users.role, fullName: users.fullName, status: users.status,
    })
    if (!updated) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث المستخدم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!await hasPermission(session, 'users.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const currentSession = await getSession()
  if (currentSession?.id === parseInt(id)) return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })
  await db.delete(users).where(eq(users.id, parseInt(id)))
  return NextResponse.json({ success: true })
}
