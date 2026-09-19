import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, teachers } from '@/db/schemas/schema'
import { eq, or } from 'drizzle-orm'
import { verifyPassword, createSessionToken, type SessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال بيانات الدخول' }, { status: 400 })
    }

    // Try finding by username or phone
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.phone, username)))
      .limit(1)

    if (!user || !(await verifyPassword(password, user.password ?? ''))) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'هذا الحساب غير مفعل' }, { status: 403 })
    }

    const session: SessionUser = {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      teacherId: user.teacherId,
    }

    const token = await createSessionToken(session)
    const redirectTo = user.role === 'guardian' ? '/guardian-dashboard' : '/dashboard'
    const res = NextResponse.json({ success: true, redirectTo })
    res.cookies.set('session', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'lax',
    })
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
