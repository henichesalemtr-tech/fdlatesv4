import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { registrationRequests, students } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
  
    const [req_record] = await db.select().from(registrationRequests)
      .where(eq(registrationRequests.id, parseInt(id))).limit(1)
    if (!req_record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (req_record.status === 'accepted') return NextResponse.json({ error: 'تم قبول الطلب مسبقاً' }, { status: 400 })
  
    // Generate student number — based on max id for consistency with FD prefix
    const [lastStudent] = await db.select({ id: students.id }).from(students).orderBy(desc(students.id)).limit(1)
    const nextId = (lastStudent?.id ?? 0) + 1
    const studentNumber = `FD${String(nextId).padStart(4, '0')}`
  
    // Create student record from registration request
    const [newStudent] = await db.insert(students).values({
      studentNumber,
      firstName: req_record.firstName,
      lastName: req_record.lastName,
      gender: req_record.gender as 'male' | 'female' | null ?? null,
      birthDate: req_record.birthDate,
      birthPlace: req_record.birthPlace,
      address: req_record.address,
      phone: req_record.phone,
      educationalLevel: req_record.educationalLevel,
      guardianName: req_record.guardianName,
      guardianPhone: req_record.guardianPhone,
      notes: req_record.notes,
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
    }).returning()
  
    // Update request status
    await db.update(registrationRequests)
      .set({ status: 'accepted', acceptedStudentId: newStudent.id, updatedAt: new Date() })
      .where(eq(registrationRequests.id, parseInt(id)))
  
    return NextResponse.json({ success: true, student: newStudent })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
