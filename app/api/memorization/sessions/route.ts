import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { memorizationSessions, homework, surahs, students, groups } from '@/db/schemas/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// GET /api/memorization/sessions?groupId=X&studentId=Y
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')
    const studentId = searchParams.get('studentId')
  
    if (studentId) {
      // Get sessions for a specific student with surah info
      const sessions = await db
        .select({
          id: memorizationSessions.id,
          sessionDate: memorizationSessions.sessionDate,
          sessionType: memorizationSessions.sessionType,
          fromAyah: memorizationSessions.fromAyah,
          toAyah: memorizationSessions.toAyah,
          rating: memorizationSessions.rating,
          notes: memorizationSessions.notes,
          surahName: surahs.name,
          surahId: memorizationSessions.surahId,
        })
        .from(memorizationSessions)
        .leftJoin(surahs, eq(memorizationSessions.surahId, surahs.id))
        .where(eq(memorizationSessions.studentId, parseInt(studentId)))
        .orderBy(desc(memorizationSessions.sessionDate))
        .limit(20)
  
      // Get current homework
      const hw = await db
        .select({
          id: homework.id,
          isGroupHomework: homework.isGroupHomework,
          notes: homework.notes,
          fromSurahName: surahs.name,
          fromSurahId: homework.fromSurahId,
          toSurahId: homework.toSurahId,
        })
        .from(homework)
        .leftJoin(surahs, eq(homework.fromSurahId, surahs.id))
        .where(eq(homework.studentId, parseInt(studentId)))
        .orderBy(desc(homework.assignedAt))
        .limit(1)
  
      // Get toSurah name separately if needed
      let toSurahName = null
      if (hw[0]?.toSurahId) {
        const [ts] = await db.select().from(surahs).where(eq(surahs.id, hw[0].toSurahId)).limit(1)
        toSurahName = ts?.name ?? null
      }
  
      return NextResponse.json({
        sessions,
        homework: hw[0] ? { ...hw[0], toSurahName } : null,
      })
    }
  
    return NextResponse.json([])
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// POST /api/memorization/sessions
export async function POST(req: NextRequest) {
  const session = await getSession()
  try {
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  
    const body = await req.json()
    const {
      studentId, groupId, sessionDate, sessionType,
      surahId, fromAyah, toAyah, rating, notes,
      // homework fields
      homeworkType, fromSurahId, toSurahId, homeworkNotes,
    } = body
  
    if (!studentId || !sessionDate) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
  
    const teacherId = session.teacherId ?? null
  
    // Insert session
    const [newSession] = await db.insert(memorizationSessions).values({
      studentId: parseInt(studentId),
      groupId: groupId ? parseInt(groupId) : null,
      teacherId,
      sessionDate,
      sessionType: sessionType ?? 'new',
      surahId: surahId ? parseInt(surahId) : null,
      fromAyah: fromAyah ? parseInt(fromAyah) : null,
      toAyah: toAyah ? parseInt(toAyah) : null,
      rating: rating ?? null,
      notes: notes ?? null,
    }).returning()
  
    // Handle homework
    if (homeworkType && fromSurahId) {
      if (homeworkType === 'group' && groupId) {
        // Delete old group homework and insert new one for all group students
        const groupStudentsList = await db
          .select({ studentId: (await import('@/db/schemas/schema')).groupStudents.studentId })
          .from((await import('@/db/schemas/schema')).groupStudents)
          .where(eq((await import('@/db/schemas/schema')).groupStudents.groupId, parseInt(groupId)))
  
        const studentIds = groupStudentsList.map(r => r.studentId)
        if (studentIds.length > 0) {
          // Remove old group homework for these students
          for (const sid of studentIds) {
            await db.delete(homework).where(
              and(eq(homework.studentId, sid), eq(homework.isGroupHomework, true))
            )
          }
          // Insert new group homework
          await db.insert(homework).values(
            studentIds.map(sid => ({
              studentId: sid,
              groupId: parseInt(groupId),
              isGroupHomework: true,
              fromSurahId: parseInt(fromSurahId),
              toSurahId: toSurahId ? parseInt(toSurahId) : null,
              notes: homeworkNotes ?? null,
              assignedBy: teacherId,
            }))
          )
        }
      } else {
        // Individual homework
        await db.delete(homework).where(
          and(eq(homework.studentId, parseInt(studentId)), eq(homework.isGroupHomework, false))
        )
        await db.insert(homework).values({
          studentId: parseInt(studentId),
          groupId: groupId ? parseInt(groupId) : null,
          isGroupHomework: false,
          fromSurahId: parseInt(fromSurahId),
          toSurahId: toSurahId ? parseInt(toSurahId) : null,
          notes: homeworkNotes ?? null,
          assignedBy: teacherId,
        })
      }
    }
  
    return NextResponse.json({ success: true, session: newSession })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// ── Permission helper: who may edit/delete a memorization session ───────────
// Admin: any session. Teacher: only sessions they recorded, or sessions for a
// group they are assigned to.
async function canModifySession(
  sessionRow: { teacherId: number | null; groupId: number | null },
  user: { role: string; teacherId?: number | null },
): Promise<boolean> {
  if (user.role === 'admin') return true
  if (!user.teacherId) return false
  if (sessionRow.teacherId === user.teacherId) return true
  if (sessionRow.groupId) {
    const { teacherGroups } = await import('@/db/schemas/schema')
    const allowed = await db.select({ id: teacherGroups.id })
      .from(teacherGroups)
      .where(and(
        eq(teacherGroups.teacherId, user.teacherId),
        eq(teacherGroups.groupId, sessionRow.groupId),
      ))
      .limit(1)
    return allowed.length > 0
  }
  return false
}

// PUT /api/memorization/sessions — edit an existing session
export async function PUT(req: NextRequest) {
  const session = await getSession()
  try {
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json()
    const { id, sessionDate, sessionType, surahId, fromAyah, toAyah, rating, notes } = body
    if (!id) return NextResponse.json({ error: 'معرّف الحصة مطلوب' }, { status: 400 })

    const [existing] = await db.select()
      .from(memorizationSessions)
      .where(eq(memorizationSessions.id, parseInt(id)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 })

    if (!(await canModifySession(existing, session))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل هذه الحصة' }, { status: 403 })
    }

    const [updated] = await db.update(memorizationSessions)
      .set({
        ...(sessionDate !== undefined ? { sessionDate } : {}),
        ...(sessionType !== undefined ? { sessionType } : {}),
        ...(surahId !== undefined ? { surahId: surahId ? parseInt(surahId) : null } : {}),
        ...(fromAyah !== undefined ? { fromAyah: fromAyah ? parseInt(fromAyah) : null } : {}),
        ...(toAyah !== undefined ? { toAyah: toAyah ? parseInt(toAyah) : null } : {}),
        ...(rating !== undefined ? { rating: rating || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      })
      .where(eq(memorizationSessions.id, parseInt(id)))
      .returning()

    return NextResponse.json({ success: true, session: updated })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE /api/memorization/sessions?id=X — delete a session
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  try {
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    if (!idParam) return NextResponse.json({ error: 'معرّف الحصة مطلوب' }, { status: 400 })
    const id = parseInt(idParam)

    const [existing] = await db.select()
      .from(memorizationSessions)
      .where(eq(memorizationSessions.id, id))
      .limit(1)
    if (!existing) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 })

    if (!(await canModifySession(existing, session))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف هذه الحصة' }, { status: 403 })
    }

    // Deleting the row removes it from every report/statistic, since all
    // memorization reports aggregate directly from memorization_sessions.
    await db.delete(memorizationSessions).where(eq(memorizationSessions.id, id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
