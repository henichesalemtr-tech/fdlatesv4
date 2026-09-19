'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  title?: string
  schoolName?: string
  fullName?: string | null
  role?: string  // 'admin' | 'teacher' | custom roles
  onMenuClick?: () => void
}

export default function Header({
  schoolName = 'مؤسسة الفردوس فرع الدبيلة',
  fullName,
  role,
  onMenuClick,
}: HeaderProps) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  // Fetch unread notification count
  useEffect(() => {
    fetch('/api/notifications?forMe=1')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setUnread(data.filter((n: { isRead: boolean }) => !n.isRead).length)
      })
      .catch(() => {})
  }, [pathname])

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    window.location.href = '/login'
  }

  return (
    <header
      className="no-print bg-white border-b px-3 py-2 flex items-center justify-between sticky top-0 z-30"
      style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 52 }}
    >
      {/* Right: mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0"
          aria-label="القائمة"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      {/* spacer when no menu button on desktop */}
      {!onMenuClick && <div />}

      {/* Center: school name */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="text-gray-700 font-semibold text-sm hidden md:block truncate">{schoolName}</span>
        {/* Notification bell — visible on mobile for teachers */}
        {role === 'teacher' && (
          <Link href="/notifications" className="lg:hidden relative p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Left: user name + logout */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification count badge for desktop */}
        <Link href="/notifications"
          className="hidden lg:flex relative items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <span className="text-base">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 hidden sm:flex"
          style={{ background: '#1a5c35' }}>
          {fullName?.[0] ?? 'م'}
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{fullName ?? 'مستخدم'}</p>
          <p className="text-[10px] text-gray-400">{role === 'admin' ? 'مدير النظام' : 'معلم'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-white font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: '#dc2626' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
          onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">خروج</span>
        </button>
      </div>
    </header>
  )
}
