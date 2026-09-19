import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances } from '@/db/schemas/schema'
import { eq, and, count } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getSeasonStart, afterSeasonStart } from '@/lib/academic-season'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const seasonStart = await getSeasonStart()
  const [result] = await db.select({ count: count() }).from(attendances)
    .where(and(
      eq(attendances.studentId, parseInt(id)),
      eq(attendances.status, 'absent'),
      afterSeasonStart(attendances.attendanceDate, seasonStart),
    ))
  return NextResponse.json({ count: result?.count ?? 0 })
}
