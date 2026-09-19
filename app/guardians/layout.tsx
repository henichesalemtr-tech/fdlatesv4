import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function GuardiansLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')
  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar role={(session.role === 'admin' ? 'admin' : 'teacher') as 'admin' | 'teacher'} fullName={session.fullName} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header title="" fullName={session.fullName} />
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
