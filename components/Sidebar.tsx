'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
      <span>🔔</span><span>الإشعارات</span>
    </div>
  ),
})

/* ── Outlined SVG icon map ── */
const S = 17 // default size
const icons: Record<string, React.ReactElement> = {
  'home':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'clipboard':     <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  'qr':            <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3"/><path d="M12 16v.01"/><path d="M12 12h3"/><path d="M3 12h6"/></svg>,
  'barcode':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M15 5v14"/><path d="M19 5v14"/><rect x="1" y="3" width="22" height="18" rx="2"/></svg>,
  'book':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  'bell':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  'users':         <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'user-check':    <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  'calendar':      <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'grid':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  'users-2':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'dollar':        <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  'bar-chart':     <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  'settings-users':<svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>,
  'settings':      <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  'list':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  'archive':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  'user':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  'quran':         <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  'teacher-check': <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  'chat':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  'shield':        <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
}

type NavItem = {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
  teacherVisible?: boolean
  /** صلاحية محددة تُعطي الوصول لهذا العنصر حتى لو كان adminOnly */
  permission?: string
}

const navItems: NavItem[] = [
  { href: '/dashboard',                       label: 'لوحة التحكم',          icon: 'home' },
  { href: '/attendance',                      label: 'الحضور والغياب',       icon: 'clipboard' },
  { href: '/auto-attendance',                 label: 'تحضير بالـ QR',        icon: 'qr' },
  { href: '/barcode-attendance',              label: 'تحضير بالباركود',      icon: 'barcode', adminOnly: true, permission: 'attendance.barcode' },
  { href: '/attendance/scan-monitor',         label: 'متابعة المسح',         icon: 'list', adminOnly: true, permission: 'attendance.scan_monitor' },
  { href: '/memorization',                    label: 'حفظ الطلبة',           icon: 'quran', teacherVisible: true },
  { href: '/teacher-attendance',              label: 'حضور المعلمين',        icon: 'teacher-check', adminOnly: true, permission: 'teacher_attendance.manage' },
  { href: '/groups',                          label: 'الأفواج',              icon: 'book' },
  { href: '/ranking',                         label: 'ترتيب الفوج',          icon: 'bar-chart', teacherVisible: true },
  { href: '/notifications',                   label: 'الإشعارات',            icon: 'bell', teacherVisible: true },
  { href: '/messages',                        label: 'الرسائل',              icon: 'chat', teacherVisible: true },
  { href: '/students',                        label: 'الطلاب',               icon: 'users', adminOnly: true, permission: 'students.view' },
  { href: '/teachers',                        label: 'المعلمين',             icon: 'user-check', adminOnly: true, permission: 'teachers.view' },
  { href: '/schedules',                       label: 'الجداول الدراسية',     icon: 'calendar', adminOnly: true, permission: 'schedules.view' },
  { href: '/rooms',                           label: 'القاعات',              icon: 'grid', adminOnly: true, permission: 'rooms.manage' },
  { href: '/guardians',                       label: 'أولياء الأمور',        icon: 'users-2', adminOnly: true, permission: 'guardians.view' },
  { href: '/finance',                         label: 'المالية والرسوم',      icon: 'dollar', adminOnly: true, permission: 'finance.view' },
  { href: '/reports',                         label: 'التقارير',             icon: 'bar-chart', adminOnly: true, permission: 'reports.view' },
  { href: '/dashboard/registration-requests', label: 'طلبات التسجيل',        icon: 'user-check', adminOnly: true, permission: 'students.create' },
  { href: '/courses',                         label: 'الدورات التعليمية',    icon: 'book', adminOnly: true, permission: 'courses.manage' },
  { href: '/roles',                           label: 'الأدوار والصلاحيات',   icon: 'shield', adminOnly: true, permission: 'roles.manage' },
  { href: '/users',                           label: 'المستخدمون',           icon: 'settings-users', adminOnly: true, permission: 'users.manage' },
  { href: '/settings',                        label: 'إعدادات النظام',       icon: 'settings', adminOnly: true, permission: 'settings.manage' },
  { href: '/settings/activity-logs',          label: 'سجل العمليات',         icon: 'list', adminOnly: true, permission: 'settings.activity_logs' },
  { href: '/backup',                          label: 'النسخ الاحتياطي',      icon: 'archive', adminOnly: true, permission: 'backup.manage' },
  { href: '/profile',                         label: 'ملفي الشخصي',          icon: 'user', teacherVisible: true },
]

interface SidebarProps {
  role: string  // 'admin' | 'teacher' | custom roles
  fullName: string | null
  isOpen?: boolean
  onClose?: () => void
  /** مفاتيح الصلاحيات التي يملكها المستخدم الحالي (محملة من الخادم) */
  userPermissions?: string[]
}

export default function Sidebar({ role, fullName, isOpen = false, onClose, userPermissions: propPermissions }: SidebarProps) {
  const pathname = usePathname()
  const [userPermissions, setUserPermissions] = useState<string[]>(propPermissions ?? [])

  // اجلب الصلاحيات من /api/auth/me إذا لم تُمرَّر صراحةً
  useEffect(() => {
    if (role === 'admin') { setUserPermissions([]); return }
    if (propPermissions !== undefined) { setUserPermissions(propPermissions); return }
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.permissions && Array.isArray(data.permissions)) {
          setUserPermissions(data.permissions)
        }
      })
      .catch(() => {})
  }, [role, propPermissions])

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // Filtering logic:
  // Show item if:
  //   1. user is admin (sees everything), OR
  //   2. item is not adminOnly (accessible to all logged-in users), OR
  //   3. item is teacherVisible (accessible to teachers and similar roles), OR
  //   4. item has a permission key and the user has that permission
  const visibleItems = navItems.filter(item => {
    if (role === 'admin') return true
    if (!item.adminOnly) return true
    if (item.teacherVisible) return true
    if (item.permission && userPermissions.includes(item.permission)) return true
    return false
  })

  const navSections: Array<{ title: string; hrefs: string[] }> = [
    { title: 'الرئيسية', hrefs: ['/dashboard'] },
    {
      title: 'الحضور والمتابعة',
      hrefs: ['/attendance', '/auto-attendance', '/barcode-attendance', '/attendance/scan-monitor', '/teacher-attendance'],
    },
    {
      title: 'التعليم والأفواج',
      hrefs: ['/groups', '/memorization', '/ranking', '/schedules', '/rooms', '/courses'],
    },
    { title: 'التواصل', hrefs: ['/notifications', '/messages'] },
    {
      title: 'المستخدمون',
      hrefs: ['/students', '/guardians', '/teachers', '/dashboard/registration-requests'],
    },
    { title: 'المالية والتقارير', hrefs: ['/finance', '/reports'] },
    {
      title: 'الإدارة والإعدادات',
      hrefs: ['/roles', '/users', '/settings', '/settings/activity-logs', '/backup'],
    },
    { title: 'الحساب', hrefs: ['/profile'] },
  ]

  const visibleSections = navSections
    .map(section => ({ ...section, items: visibleItems.filter(item => section.hrefs.includes(item.href)) }))
    .filter(section => section.items.length > 0)

  return (
    <>
      {/* ── Overlay خلفية سوداء شفافة للهاتف ── */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar الحاوية الرئيسية ── */}
      <aside
        className={`
          fixed md:sticky top-0 right-0 z-50 md:z-auto h-screen w-[248px] flex-shrink-0 flex flex-col 
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(175deg, #1e6b3e 0%, #0f3d22 60%, #071a0e 100%)',
          boxShadow: '3px 0 20px rgba(0,0,0,0.35)',
        }}
      >
        {/* ── Brand ── */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0 shadow-lg ring-2 ring-white/20">
              <img src="/logo.png" alt="شعار منصة الفردوس" width={40} height={40} className="object-contain w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">منصة الفردوس</p>
              <p className="text-green-300/80 text-xs truncate">إدارة المدارس القرآنية</p>
            </div>
          </div>
          {/* زر إغلاق القائمة في الهاتف فقط */}
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden text-white/70 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Scrollable nav ── */}
        <nav
          aria-label="التنقل الرئيسي"
          className="flex-1 overflow-y-auto px-2 py-3"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent', minHeight: 0 }}>
          {visibleSections.map((section, index) => (
            <section key={section.title} className={index === visibleSections.length - 1 ? '' : 'mb-3'}>
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
                <p className="text-green-200/65 text-[10px] font-bold tracking-wide">{section.title}</p>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </div>
            </section>
          ))}
        </nav>

        {/* ── Push Notifications ── */}
        <div className="px-3 py-2.5 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <PushEnableButton compact />
        </div>

        {/* ── User info + logout ── */}
        <div className="px-3 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              {fullName?.[0] ?? 'م'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{fullName ?? 'مستخدم'}</p>
              <p className="text-green-300/80 text-[11px]">{role === 'admin' ? 'مدير النظام' : role === 'teacher' ? 'معلم' : role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-white text-xs font-semibold py-2 rounded-lg transition-all"
            style={{ background: 'rgba(220,38,38,0.75)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.75)')}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose?: () => void }) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  return (
    <Link href={item.href} onClick={onClose}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
      style={isActive
        ? { background: 'rgba(255,255,255,0.15)', color: '#fbbf24', fontWeight: 700, borderRight: '3px solid #fbbf24' }
        : { color: 'rgba(255,255,255,0.72)', borderRight: '3px solid transparent' }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <span className="flex-shrink-0 opacity-90">{icons[item.icon] ?? <span style={{ width: 17 }} />}</span>
      <span style={{ fontSize: 13.5 }} className="truncate">{item.label}</span>
    </Link>
  )
}