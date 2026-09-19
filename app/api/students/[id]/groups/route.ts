import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groupStudents, groups } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const result = await db
    .select({ id: groups.id, name: groups.name, groupNumber: groups.groupNumber })
    .from(groupStudents)
    .leftJoin(groups, eq(groupStudents.groupId, groups.id))
    .where(eq(groupStudents.studentId, parseInt(id)))
  return NextResponse.json(result.filter(r => r.id !== null))
}
