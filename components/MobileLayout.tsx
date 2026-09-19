'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import dynamic from 'next/dynamic'

const PushNotificationManager = dynamic(() => import('./PushNotificationManager'), { ssr: false })

interface MobileLayoutProps {
  role: string  // 'admin' | 'teacher' | custom roles
  fullName: string | null
  children: React.ReactNode
  /** مفاتيح الصلاحيات المحملة من الخادم لتمريرها للقائمة الجانبية */
  userPermissions?: string[]
}

// SVG icons for bottom nav
const NavIcons = {
  home:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  groups:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  clipboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  book:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  bell:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  chat:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
}

// Teacher bottom-nav items (6 Buttons)
const teacherBottomNav = [
  { href: '/dashboard',       iconKey: 'home'      as const, label: 'الرئيسية' },
  { href: '/groups',          iconKey: 'groups'    as const, label: 'الأفواج' },
  { href: '/attendance',      iconKey: 'clipboard' as const, label: 'الحضور' },
  { href: '/memorization',    iconKey: 'book'      as const, label: 'الحفظ' },
  { href: '/notifications',   iconKey: 'bell'      as const, label: 'الإشعارات' },
  { href: '/messages',        iconKey: 'chat'      as const, label: 'الرسائل' },
]

export default function MobileLayout({ role, fullName, children, userPermissions = [] }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isTeacher = role !== 'admin'  // custom roles get teacher-style bottom nav

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* ── 1. Desktop Sidebar (يعمل في الشاشات الكبيرة تلقائياً) ── */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar role={role} fullName={fullName} userPermissions={userPermissions} />
      </div>

      {/* ── 2. Mobile Sidebar Overlay (تم إزالة الغلاف الأبيض) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* خلفية تظليل شاشة الهاتف */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
          
          {/* استدعاء الـ Sidebar مباشرة دون div أبيض إضافي */}
          <div className="fixed top-0 right-0 h-full z-50">
            <Sidebar 
              role={role} 
              fullName={fullName}
              userPermissions={userPermissions}
              isOpen={true} 
              onClose={() => setSidebarOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* ── 3. Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        <Header
          role={role}
          fullName={fullName}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className={`flex-1 p-4 bg-gray-50 overflow-auto md:p-6 ${isTeacher ? 'pb-20 lg:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* ── 4. Teacher Mobile Bottom Nav (6 عناصر) ── */}
      {isTeacher && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch px-1"
          style={{
            background: 'linear-gradient(175deg, #1e6b3e 0%, #0a2b17 100%)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            height: 62,
          }}
        >
          {teacherBottomNav.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative px-0.5"
                style={isActive ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.65)' }}>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-yellow-400" />}
                {NavIcons[item.iconKey]}
                <span className="truncate w-full text-center" style={{ fontSize: 9, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      <PushNotificationManager />
    </div>
  )
}