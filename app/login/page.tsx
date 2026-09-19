'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'

/* ─── Types ─────────────────────────────────────────────── */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallEnv =
  | 'installed'   // already running as PWA
  | 'android'     // Chrome/Edge on Android or Desktop — has beforeinstallprompt
  | 'ios'         // Safari on iPhone/iPad — manual share flow
  | 'desktop'     // Desktop Chrome/Edge before prompt fires
  | 'other'       // Firefox, older browsers — show generic guide

/* ─── Detect environment ─────────────────────────────────── */
function detectEnv(isStandalone: boolean): InstallEnv {
  if (isStandalone) return 'installed'
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  if (isIOS) return 'ios'
  if (isAndroid) return 'android'
  return 'desktop'
}

/* ─── Push subscription sync after login ────────────────── */
async function syncPushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'granted') return
    const keyRes = await fetch('/api/push/subscribe')
    const { publicKey } = await keyRes.json()
    if (!publicKey) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  } catch { /* silent */ }
}

/* ═══════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState({ username: '', password: '' })
  const [env, setEnv]               = useState<InstallEnv | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)
  const [promptReady, setPromptReady] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  /* ── Detect install environment once on mount ── */
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true

    if (standalone) {
      setEnv('installed')
      return
    }

    // Listen for native prompt (Chrome/Edge Android + Desktop)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setPromptReady(true)
      // If we haven't set android/desktop yet, set now
      setEnv(prev => (prev === 'ios' || prev === 'installed') ? prev : detectEnv(false))
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // Listen for successful install
    window.addEventListener('appinstalled', () => setEnv('installed'))

    // Set initial env without waiting for beforeinstallprompt
    setEnv(detectEnv(false))

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  /* ── Trigger native install prompt (Android / Desktop) ── */
  async function handleNativeInstall() {
    // If native prompt is ready, use it directly
    if (promptRef.current) {
      setInstalling(true)
      try {
        await promptRef.current.prompt()
        const { outcome } = await promptRef.current.userChoice
        if (outcome === 'accepted') {
          toast.success('✅ تم تثبيت التطبيق بنجاح!')
          setEnv('installed')
        }
        promptRef.current = null
        setPromptReady(false)
      } catch { /* silent */ }
      setInstalling(false)
      return
    }
    // Prompt not yet fired — show browser guide
    setShowDesktopGuide(v => !v)
  }

  /* ── Login handler ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم تسجيل الدخول بنجاح')
        syncPushSubscription()
        // Use hard redirect so the server can read the new session cookie
        window.location.href = data.redirectTo ?? '/dashboard'
      } else {
        toast.error(data.error || 'خطأ في تسجيل الدخول')
        setLoading(false)
      }
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مجدداً')
      setLoading(false)
    }
  }

  /* ─── Install button / badge renderer ─────────────────── */
  function renderInstallSection() {
    // Not detected yet — show skeleton placeholder to avoid layout shift
    if (env === null) return (
      <div className="w-full mt-3 h-12 rounded-xl bg-gray-100 animate-pulse" />
    )

    // Already installed — green badge
    if (env === 'installed') return (
      <div className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-green-700 bg-green-50 border border-green-200">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        التطبيق مثبّت على هذا الجهاز ✅
      </div>
    )

    // iOS — show button that opens step-by-step guide
    if (env === 'ios') return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(v => !v)}
          className="w-full mt-3 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
          style={{ borderColor: '#1a5c35', color: '#1a5c35', background: showIOSGuide ? '#f0fdf4' : 'transparent' }}
        >
          {/* Share icon (iOS style) */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          تثبيت التطبيق على iPhone / iPad
        </button>

        {showIOSGuide && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-2">
            <p className="font-bold text-sm text-blue-900 mb-1">📲 خطوات تثبيت التطبيق على iOS</p>
            {[
              { n: '1', icon: '□↑', text: 'اضغط على زر المشاركة في شريط Safari (الأيقونة أسفل الشاشة)' },
              { n: '2', icon: '⊞+', text: 'اختر «إضافة إلى الشاشة الرئيسية» من القائمة' },
              { n: '3', icon: '✓',  text: 'اضغط «إضافة» في الزاوية العلوية لتأكيد التثبيت' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {step.n}
                </span>
                <p className="leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        )}
      </>
    )

    // Android / Desktop — always show an active install button
    if (env === 'android' || env === 'desktop') return (
      <>
        <button
          type="button"
          onClick={handleNativeInstall}
          disabled={installing}
          className="w-full mt-3 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-60"
          style={{ borderColor: '#1a5c35', color: '#1a5c35', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
          onMouseLeave={e => { if (!installing) e.currentTarget.style.background = 'transparent' }}
        >
          {installing ? (
            <div className="w-4 h-4 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          {installing ? 'جاري التثبيت...' : promptReady ? 'تثبيت التطبيق على الجهاز' : 'تثبيت التطبيق'}
        </button>

        {/* Guide shown when prompt not yet available */}
        {showDesktopGuide && !promptReady && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
            <p className="font-bold text-sm text-amber-900 mb-1">📲 كيفية تثبيت التطبيق</p>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <p className="leading-relaxed">تأكد من استخدام متصفح <strong>Chrome</strong> أو <strong>Edge</strong></p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <p className="leading-relaxed">ابحث عن أيقونة <strong>⊕ تثبيت</strong> في شريط العنوان يميناً</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <p className="leading-relaxed">أو حاول <strong>تحديث الصفحة</strong> ثم اضغط الزر مجدداً</p>
            </div>
          </div>
        )}
      </>
    )

    // Other browsers — generic guide
    return (
      <div className="mt-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center leading-relaxed">
        💡 لتثبيت التطبيق: افتح الصفحة في Chrome أو Safari واتبع خيار «إضافة إلى الشاشة الرئيسية»
      </div>
    )
  }

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{ background: 'linear-gradient(135deg, #0a2b17 0%, #1a5c35 50%, #0f3d22 100%)' }}
    >
      {/* Background decorations */}
      <div style={{ position: 'fixed', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -120, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="py-8 px-6 text-center" style={{ background: 'linear-gradient(135deg, #1a5c35, #0f3d22)' }}>
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-xl ring-4 ring-white/30">
                <Image src="/logo.png" alt="شعار منصة الفردوس" width={88} height={88} className="rounded-full object-contain" />
              </div>
            </div>
            <h1 className="text-white font-bold text-2xl">منصة الفردوس</h1>
            <p className="text-green-200 text-sm mt-1">منصة إدارة المدارس القرآنية</p>
          </div>

          {/* Form */}
          <div className="p-6">
            <h2 className="text-gray-700 font-bold text-center mb-5 text-base">تسجيل الدخول</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">اسم المستخدم أو رقم الهاتف</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#1a5c35' } as React.CSSProperties}
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': '#1a5c35' } as React.CSSProperties}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-60 shadow-lg mt-2"
                style={{ background: 'linear-gradient(to left, #1a5c35, #2d7a4a)' }}
              >
                {loading ? 'جاري تسجيل الدخول...' : 'دخول ←'}
              </button>
            </form>

            {/* Install section — always visible, adapts to environment */}
            {renderInstallSection()}
          </div>
        </div>

        <p className="text-center text-green-200/60 text-xs mt-5">
          منصة الفردوس لإدارة المدارس القرآنية © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
