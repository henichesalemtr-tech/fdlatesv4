/**
 * /api/profile  — self-service profile endpoint
 * GET  — fetch current user's own profile data
 * PATCH — update own profile (fullName, email, phone, profession, educationLevel, password)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const [user] = await db.select({
      id: users.id,
      role: users.role,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      profession: users.profession,
      educationLevel: users.educationLevel,
      status: users.status,
    }).from(users).where(eq(users.id, session.id))
  
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  
    const body = await req.json()
    const { fullName, email, phone, profession, educationLevel, currentPassword, newPassword } = body
  
    const updateData: Record<string, unknown> = {
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      profession: profession || null,
      educationLevel: educationLevel || null,
    }
  
    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'يجب إدخال كلمة المرور الحالية' }, { status: 400 })
      }
      // Fetch existing password hash
      const [userWithPwd] = await db.select({ password: users.password })
        .from(users).where(eq(users.id, session.id))
      if (!userWithPwd) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      
      const valid = await verifyPassword(currentPassword, userWithPwd.password)
      if (!valid) {
        return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
      }
      updateData.password = await hashPassword(newPassword)
    }
  
    const [updated] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, session.id))
      .returning({
        id: users.id, fullName: users.fullName, email: users.email,
        phone: users.phone, profession: users.profession, educationLevel: users.educationLevel,
      })
  
    return NextResponse.json({ success: true, user: updated })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
