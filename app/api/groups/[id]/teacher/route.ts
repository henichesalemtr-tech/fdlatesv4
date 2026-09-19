import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teacherGroups, teachers } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// GET /api/groups/[id]/teacher — returns the first teacher assigned to this group
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const groupId = parseInt(id)
  if (isNaN(groupId)) return NextResponse.json(null)

  const [row] = await db
    .select({ id: teachers.id, fullName: teachers.fullName, teacherNumber: teachers.teacherNumber })
    .from(teacherGroups)
    .innerJoin(teachers, eq(teacherGroups.teacherId, teachers.id))
    .where(eq(teacherGroups.groupId, groupId))
    .limit(1)

  return NextResponse.json(row ?? null)
}
