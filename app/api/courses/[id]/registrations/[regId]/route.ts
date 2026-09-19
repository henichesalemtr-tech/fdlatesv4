import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { courseRegistrations } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession, hasPermission } from '@/lib/auth'

// PATCH /api/courses/[id]/registrations/[regId] — accept or reject a registration
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, regId } = await params
  const courseId = parseInt(id)
  const regIdNum = parseInt(regId)
  if (isNaN(courseId) || isNaN(regIdNum)) {
    return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })
  }

  const { status, acceptedStudentId } = await req.json()
  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 })
  }

  const [updated] = await db
    .update(courseRegistrations)
    .set({
      status,
      acceptedStudentId: acceptedStudentId ? parseInt(acceptedStudentId) : null,
    })
    .where(eq(courseRegistrations.id, regIdNum))
    .returning()

  return NextResponse.json(updated)
}

// DELETE /api/courses/[id]/registrations/[regId] — delete a registration
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  const session = await getSession()
  if (!session || !hasPermission(session, 'courses.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { regId } = await params
  const regIdNum = parseInt(regId)
  if (isNaN(regIdNum)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  await db.delete(courseRegistrations).where(eq(courseRegistrations.id, regIdNum))
  return NextResponse.json({ success: true })
}
