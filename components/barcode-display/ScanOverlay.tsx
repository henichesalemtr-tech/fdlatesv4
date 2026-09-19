'use client'

import { useEffect, useState, memo } from 'react'

interface ScanResult {
  studentNumber: string
  firstName: string
  lastName: string
  groupName?: string | null
  time: string
  status: 'success' | 'duplicate' | 'error'
  message?: string
}

interface ScanOverlayProps {
  scan: ScanResult | null
  visible: boolean
  onClose?: () => void
}

const ScanOverlay = memo(function ScanOverlay({ scan, visible, onClose }: ScanOverlayProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible && scan) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onClose?.()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [visible, scan, onClose])

  if (!show || !scan) return null

  const statusConfig = {
    success: { icon: '✅', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' },
    duplicate: { icon: '⚠️', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' },
    error: { icon: '❌', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  }

  const config = statusConfig[scan.status]

  return (
    <div className="fixed inset-0 isolate flex items-center justify-center pointer-events-none z-50">
      {/* Keep the scan card crisp while softly separating it from the scanner view. */}
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" aria-hidden="true" />
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-20px); opacity: 0; }
        }
        .scan-overlay-enter {
          animation: slideDown 0.3s ease-out;
        }
        .scan-overlay-exit {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      <div
        className={`relative z-10 scan-overlay-enter ${!show ? 'scan-overlay-exit' : ''} bg-gray-900 rounded-3xl border-2 shadow-2xl p-10 max-w-[44rem] w-[40rem] mx-4`}
        style={{
          borderColor: config.borderColor,
          borderWidth: '6px',
          background: `linear-gradient(135deg, ${config.bgColor}, rgba(15, 23, 42, 0.8))`,
          minHeight: '24rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Icon */}
        <div className="text-9xl text-center mb-8">{config.icon}</div>

        {/* Content */}
        <div className="text-center space-y-6">
          {scan.status === 'success' ? (
            <>
              <h3 className="text-6xl font-bold text-white leading-tight">{scan.firstName} {scan.lastName}</h3>
              {scan.groupName && (
                <p className="text-3xl text-blue-400 font-semibold">📚 {scan.groupName}</p>
              )}
              <p className="text-2xl font-mono text-gray-400">{scan.studentNumber}</p>
              <p className="text-4xl font-bold mt-6" style={{ color: config.color }}>
                تم تسجيل الحضور ✓
              </p>
            </>
          ) : (
            <>
              <h3 className="text-5xl font-bold text-gray-200 leading-tight">
                {scan.firstName !== '—' ? `${scan.firstName} ${scan.lastName}` : scan.studentNumber}
              </h3>
              {scan.groupName && (
                <p className="text-3xl text-blue-400 font-semibold">📚 {scan.groupName}</p>
              )}
              <p className="text-4xl font-semibold mt-6" style={{ color: config.color }}>
                {scan.message}
              </p>
            </>
          )}

          {/* Time */}
          <p className="text-2xl text-gray-500 mt-6 pt-5 border-t-2 border-gray-700">
            {scan.time}
          </p>
        </div>
      </div>
    </div>
  )
})

export default ScanOverlay
