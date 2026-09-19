import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, teachers, teacherGroups } from '@/db/schemas/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { rankStudents, getGroupStudentIds } from '@/lib/ranking'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const groupIdParam = searchParams.get('groupId')

  const isTeacher = session.role === 'teacher'
  const isAdmin   = session.role === 'admin'

  // ── Resolve teacher's groups ─────────────────────────────────────────────
  let teacherGroupIds: number[] = []
  if (isTeacher) {
    if (!session.teacherId) {
      return NextResponse.json({ error: 'حساب المعلم غير مرتبط' }, { status: 403 })
    }
    const tg = await db
      .select({ groupId: teacherGroups.groupId })
      .from(teacherGroups)
      .where(eq(teacherGroups.teacherId, session.teacherId))
    teacherGroupIds = tg.map(r => r.groupId).filter((id): id is number => id !== null)
  }

  // ── No groupId: return group list for the picker UI ──────────────────────
  if (!groupIdParam) {
    if (isAdmin) {
      const allGroups = await db
        .select({
          id: groups.id,
          name: groups.name,
          groupNumber: groups.groupNumber,
        })
        .from(groups)
        .where(eq(groups.status, 'open'))
      return NextResponse.json({ groups: allGroups })
    }
    if (isTeacher) {
      if (teacherGroupIds.length === 0) {
        return NextResponse.json({ groups: [] })
      }
      const myGroups = await db
        .select({ id: groups.id, name: groups.name, groupNumber: groups.groupNumber })
        .from(groups)
        .where(inArray(groups.id, teacherGroupIds))
      return NextResponse.json({ groups: myGroups })
    }
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  // ── Validate groupId access ──────────────────────────────────────────────
  const groupId = parseInt(groupIdParam)
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'معرّف الفوج غير صالح' }, { status: 400 })
  }

  if (isTeacher && !teacherGroupIds.includes(groupId)) {
    return NextResponse.json({ error: 'لا يحق لك الوصول إلى هذا الفوج' }, { status: 403 })
  }

  // ── Fetch group info ─────────────────────────────────────────────────────
  const [groupRow] = await db
    .select({
      id: groups.id,
      name: groups.name,
      groupNumber: groups.groupNumber,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1)

  if (!groupRow) {
    return NextResponse.json({ error: 'الفوج غير موجود' }, { status: 404 })
  }

  // ── Fetch teacher of this group (for display) ────────────────────────────
  const [teacherRow] = await db
    .select({ fullName: teachers.fullName, phone: teachers.phone })
    .from(teacherGroups)
    .leftJoin(teachers, eq(teacherGroups.teacherId, teachers.id))
    .where(eq(teacherGroups.groupId, groupId))
    .limit(1)

  // ── Score & rank all students of this group ──────────────────────────────
  const studentIds = await getGroupStudentIds(groupId)
  const ranked = await rankStudents(studentIds)

  return NextResponse.json({
    group: {
      ...groupRow,
      teacherName: teacherRow?.fullName ?? null,
      teacherPhone: teacherRow?.phone ?? null,
    },
    ranking: ranked,
  })
}
