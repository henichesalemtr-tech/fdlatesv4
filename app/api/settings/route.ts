import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { settings } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (key) {
      const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
      return NextResponse.json(setting ?? { key, value: null })
    }
    const all = await db.select().from(settings)
    return NextResponse.json(all)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!await hasPermission(session, 'settings.manage')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    // Support both single { key, value } and batch [{ key, value }, ...]
    const items: { key: string; value: string }[] = Array.isArray(body) ? body : [body]
    for (const { key, value } of items) {
      if (!key) continue
      await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
