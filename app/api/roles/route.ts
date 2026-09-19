import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { roles } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

export async function GET() {
  // Roles list is readable by any logged-in user (needed for user creation form)
  const data = await db.select().from(roles)
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'roles.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, label, permissions } = body
    if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, name)).limit(1)
    if (existing.length > 0) return NextResponse.json({ error: 'اسم الدور مستخدم بالفعل' }, { status: 409 })
    const [role] = await db.insert(roles).values({
      name,
      label: label ?? name,
      permissions: JSON.stringify(permissions ?? []),
    }).returning()
    return NextResponse.json(role)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الدور' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'roles.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { id, name, label, permissions } = body
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
    await db.update(roles).set({
      name: name ?? undefined,
      label: label ?? undefined,
      permissions: permissions ? JSON.stringify(permissions) : undefined,
    }).where(eq(roles.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الدور' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'roles.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 })
    await db.delete(roles).where(eq(roles.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
  }
}
