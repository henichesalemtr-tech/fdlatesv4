import { NextResponse } from 'next/server'
import { getSession, getRolePermissions } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Live permissions — read from the roles table on every call so role or
  // permission changes take effect immediately (no re-login needed).
  const permissions = await getRolePermissions(session.role)

  return NextResponse.json({
    id: session.id,
    role: session.role,
    username: session.username,
    fullName: session.fullName,
    teacherId: session.teacherId ?? null,
    status: session.status ?? 'active',
    permissions,
  })
}
