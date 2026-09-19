'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Only show splash when launched as PWA (standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    if (!isStandalone) { setVisible(false); return }

    // Already shown this session? Skip
    if (sessionStorage.getItem('splash_shown')) { setVisible(false); return }

    const fadeTimer = setTimeout(() => setFading(true), 1800)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('splash_shown', '1')
    }, 2200)

    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #061a0d 0%, #0a2b17 45%, #0f3d22 100%)',
        transition: 'opacity 0.4s ease',
        opacity: fading ? 0 : 1,
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      {/* Decorative ring */}
      <div style={{
        position: 'absolute',
        width: 280, height: 280,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.07)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -58%)',
      }} />
      <div style={{
        position: 'absolute',
        width: 220, height: 220,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.05)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -58%)',
      }} />

      {/* Icon */}
      <div style={{
        width: 110, height: 110,
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        marginBottom: 28,
        animation: 'splashPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        <Image src="/icon-192x192.png" alt="منصة الفردوس" width={110} height={110} priority />
      </div>

      {/* App name */}
      <p style={{
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: 0.5,
        margin: 0,
        animation: 'splashFadeUp 0.5s 0.2s ease both',
      }}>
        منصة الفردوس
      </p>
      <p style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        marginTop: 6,
        animation: 'splashFadeUp 0.5s 0.35s ease both',
      }}>
        إدارة المدارس القرآنية
      </p>

      {/* Loading dots */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 48,
        animation: 'splashFadeUp 0.5s 0.5s ease both',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: '#22c55e',
            opacity: 0.7,
            animation: `splashDot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
