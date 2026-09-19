import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { expenses } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await db.select().from(expenses).orderBy(desc(expenses.createdAt)))
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { category, amount, expenseDate, notes } = await req.json()
    if (!amount) return NextResponse.json({ error: 'المبلغ مطلوب' }, { status: 400 })
    const [created] = await db.insert(expenses).values({
      category: category || null, amount,
      expenseDate: expenseDate || null, notes: notes || null,
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await req.json()
    await db.delete(expenses).where(eq(expenses.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
