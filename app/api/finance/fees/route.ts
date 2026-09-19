import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { feePayments, students } from '@/db/schemas/schema'
import { eq, desc, ilike, or } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
  
    const payments = await db
      .select({
        id: feePayments.id,
        amount: feePayments.amount,
        paymentDate: feePayments.paymentDate,
        forMonth: feePayments.forMonth,
        notes: feePayments.notes,
        studentId: feePayments.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        studentNumber: students.studentNumber,
      })
      .from(feePayments)
      .leftJoin(students, eq(feePayments.studentId, students.id))
      .orderBy(desc(feePayments.createdAt))
  
    return NextResponse.json(payments)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { studentId, amount, paymentDate, forMonth, notes } = await req.json()
    if (!studentId || !amount) return NextResponse.json({ error: 'الطالب والمبلغ مطلوبان' }, { status: 400 })
    const [created] = await db.insert(feePayments).values({
      studentId: parseInt(studentId), amount, paymentDate: paymentDate || null,
      forMonth: forMonth || null, notes: notes || null,
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
    await db.delete(feePayments).where(eq(feePayments.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
