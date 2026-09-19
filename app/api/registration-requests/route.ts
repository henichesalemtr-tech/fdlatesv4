import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { registrationRequests, students, settings } from '@/db/schemas/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { normalizeRegistrationRequestIds } from '@/lib/registration-request-bulk'

// GET — list all (admin only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await db.select().from(registrationRequests).orderBy(desc(registrationRequests.createdAt))
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// POST — admin bulk accept or public registration submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body?.action === 'bulk_accept') {
      const session = await getSession()
      if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const ids = normalizeRegistrationRequestIds(body.ids)
      if (ids.length === 0) return NextResponse.json({ error: 'يجب اختيار طلب واحد على الأقل' }, { status: 400 })

      const results: Array<{ id: number; status: 'accepted' | 'skipped'; studentId?: number }> = []
      for (const id of ids) {
        const [request] = await db.select().from(registrationRequests).where(eq(registrationRequests.id, id)).limit(1)
        if (!request || request.status !== 'pending') {
          results.push({ id, status: 'skipped' })
          continue
        }

        const [lastStudent] = await db.select({ id: students.id }).from(students).orderBy(desc(students.id)).limit(1)
        const studentNumber = `FD${String((lastStudent?.id ?? 0) + 1).padStart(4, '0')}`
        const [student] = await db.insert(students).values({
          studentNumber,
          firstName: request.firstName,
          lastName: request.lastName,
          gender: request.gender as 'male' | 'female' | null ?? null,
          birthDate: request.birthDate,
          birthPlace: request.birthPlace,
          address: request.address,
          phone: request.phone,
          educationalLevel: request.educationalLevel,
          guardianName: request.guardianName,
          guardianPhone: request.guardianPhone,
          notes: request.notes,
          status: 'active',
          enrollmentDate: new Date().toISOString().split('T')[0],
        }).returning()

        await db.update(registrationRequests)
          .set({ status: 'accepted', acceptedStudentId: student.id, updatedAt: new Date() })
          .where(eq(registrationRequests.id, id))
        results.push({ id, status: 'accepted', studentId: student.id })
      }

      return NextResponse.json({
        success: true,
        acceptedCount: results.filter(result => result.status === 'accepted').length,
        skippedCount: results.filter(result => result.status === 'skipped').length,
        results,
      })
    }

    // Public registration submission. No authentication is required.
    const [setting] = await db.select().from(settings).where(eq(settings.key, 'online_registration_enabled')).limit(1)
    if (setting?.value === 'false') {
      return NextResponse.json({ error: 'registration_closed' }, { status: 403 })
    }

    const { firstName, lastName, gender, birthDate, birthPlace, address, phone,
      educationalLevel, guardianName, guardianPhone, guardianRelation, guardianEmail, notes } = body

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'الاسم الأول والأخير مطلوبان' }, { status: 400 })
    }

    const [created] = await db.insert(registrationRequests).values({
      firstName, lastName, gender: gender ?? null,
      birthDate: birthDate ?? null, birthPlace: birthPlace ?? null,
      address: address ?? null, phone: phone ?? null,
      educationalLevel: educationalLevel ?? null,
      guardianName: guardianName ?? null, guardianPhone: guardianPhone ?? null,
      guardianRelation: guardianRelation ?? null, guardianEmail: guardianEmail ?? null,
      notes: notes ?? null, status: 'pending',
    }).returning()

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE — admin bulk delete
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const ids = normalizeRegistrationRequestIds(body?.ids)
    if (ids.length === 0) return NextResponse.json({ error: 'يجب اختيار طلب واحد على الأقل' }, { status: 400 })

    const deleted = await db.delete(registrationRequests)
      .where(inArray(registrationRequests.id, ids))
      .returning({ id: registrationRequests.id })
    return NextResponse.json({ success: true, deletedCount: deleted.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الطلبات' }, { status: 500 })
  }
}
