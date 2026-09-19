import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { subjects } from '@/db/schemas/schema'
import { desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await db.select().from(subjects).orderBy(desc(subjects.createdAt))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, subjectCode, description, weeklySessions } = await req.json()
  if (!name) return NextResponse.json({ error: 'اسم المادة مطلوب' }, { status: 400 })
  const [created] = await db.insert(subjects).values({
    name, subjectCode: subjectCode || null,
    description: description || null,
    weeklySessions: weeklySessions ? parseInt(weeklySessions) : 1,
  }).returning()
  return NextResponse.json(created, { status: 201 })
}
