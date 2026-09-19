import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'

export default async function MemorizationLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'guardian') redirect('/guardian-dashboard')
  return (
    <MobileLayout role={(session.role === 'admin' ? 'admin' : 'teacher') as 'admin' | 'teacher'} fullName={session.fullName}>
      {children}
    </MobileLayout>
  )
}
