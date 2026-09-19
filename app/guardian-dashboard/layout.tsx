import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Image from 'next/image'
import GuardianLogout from './GuardianLogout'
import PushManagerClient from '@/components/PushManagerClient'

export default async function GuardianDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'guardian') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Simple header for guardians */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
      {/*  <GuardianLogout /> */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
            {(session.fullName ?? 'و')[0]}
          </div>
          <div className="text-right">
            <p className="text-gray-800 font-bold text-sm">{session.fullName ?? 'ولي الأمر'}</p>
            <p className="text-gray-500 text-xs">ولي الأمر</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="منصة الفردوس" width={36} height={36} className="rounded-full" />
          <div>
            <p className="font-bold text-gray-800 text-sm">منصة الفردوس</p>
            <p className="text-gray-500 text-xs">بوابة ولي الأمر</p>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-5xl mx-auto">{children}</main>
      <PushManagerClient />
    </div>
  )
}
