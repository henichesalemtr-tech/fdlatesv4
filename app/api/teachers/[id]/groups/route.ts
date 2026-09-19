import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teacherGroups, groups } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// Get groups assigned to a teacher
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const assigned = await db
    .select({ group: groups })
    .from(teacherGroups)
    .leftJoin(groups, eq(teacherGroups.groupId, groups.id))
    .where(eq(teacherGroups.teacherId, parseInt(id)))
  return NextResponse.json(assigned.map(r => r.group).filter(Boolean))
}

// Assign groups to teacher
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { groupIds } = await req.json() // array of group ids
  const teacherId = parseInt(id)

  // Remove existing assignments
  await db.delete(teacherGroups).where(eq(teacherGroups.teacherId, teacherId))

  // Add new assignments
  if (groupIds && groupIds.length > 0) {
    await db.insert(teacherGroups).values(
      groupIds.map((gid: number) => ({ teacherId, groupId: gid }))
    )
  }

  return NextResponse.json({ success: true })
}
