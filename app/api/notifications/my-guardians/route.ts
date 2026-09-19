import { NextResponse } from 'next/server'
import { db } from '@/db'
import { groupStudents, teacherGroups, students, users } from '@/db/schemas/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

// GET /api/notifications/my-guardians
// Returns guardian users linked to the logged-in teacher's group students
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'teacher' || !session.teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Teacher's group IDs
  const tGroups = await db
    .select({ groupId: teacherGroups.groupId })
    .from(teacherGroups)
    .where(eq(teacherGroups.teacherId, session.teacherId))
  const groupIds = tGroups.map(g => g.groupId).filter((id): id is number => id !== null)
  if (groupIds.length === 0) return NextResponse.json([])

  // 2. Students in those groups
  const gs = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(inArray(groupStudents.groupId, groupIds))
  const studentIds = [...new Set(gs.map(g => g.studentId))]
  if (studentIds.length === 0) return NextResponse.json([])

  // 3. Guardian user IDs + student name mapping
  const studs = await db
    .select({
      guardianUserId: students.guardianUserId,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(students)
    .where(inArray(students.id, studentIds))

  const guardianUserIds = [...new Set(
    studs.map(s => s.guardianUserId).filter((id): id is number => id !== null)
  )]
  if (guardianUserIds.length === 0) return NextResponse.json([])

  // 4. Fetch guardian user records
  const guardianUsers = await db
    .select({ id: users.id, fullName: users.fullName, username: users.username, role: users.role })
    .from(users)
    .where(inArray(users.id, guardianUserIds))

  // Attach student name for display
  const result = guardianUsers.map(u => {
    const linked = studs.filter(s => s.guardianUserId === u.id)
    const studentNames = linked.map(s => `${s.firstName} ${s.lastName}`).join('، ')
    return { ...u, studentNames }
  })

  return NextResponse.json(result)
}
