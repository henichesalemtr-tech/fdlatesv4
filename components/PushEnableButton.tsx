'use client'
/**
 * PushEnableButton
 * ─────────────────────────────────────────────────────
 * Displays the current push-notification state and lets
 * the user enable, disable, or refresh their subscription.
 *
 * Props:
 *   compact – render a compact version for sidebar use
 */

import { useState, useEffect, useCallback } from 'react'

/* ─── Helpers ─────────────────────────────────────────────── */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function fetchVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/push/subscribe', { credentials: 'include' })
    if (!res.ok) return ''
    const { publicKey } = await res.json()
    return publicKey ?? ''
  } catch {
    return ''
  }
}

async function getServiceWorkerReg(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SW timeout')), 8_000)
      ),
    ])
  } catch {
    return null
  }
}

async function createSubscription(publicKey: string): Promise<PushSubscription | null> {
  const reg = await getServiceWorkerReg()
  if (!reg) return null
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })
}

async function postSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  return res.ok
}

async function deleteSubscription(endpoint: string): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  return res.ok
}

/* ─── Types ───────────────────────────────────────────────── */

type PermState = 'loading' | 'unsupported' | 'default' | 'granted' | 'denied'

interface PushEnableButtonProps {
  compact?: boolean
}

/* ─── Component ───────────────────────────────────────────── */

export default function PushEnableButton({ compact = false }: PushEnableButtonProps) {
  const [permState, setPermState] = useState<PermState>('loading')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Initialise state once */
  const checkState = useCallback(async () => {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermState('unsupported')
      return
    }

    const perm = Notification.permission as PermState
    setPermState(perm)

    if (perm === 'granted') {
      const reg = await getServiceWorkerReg()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        setSubscribed(!!sub)
      }
    }
  }, [])

  useEffect(() => {
    checkState()
  }, [checkState])

  /* ── Enable notifications ────────────────────────────── */
  async function handleEnable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setPermState(perm as PermState)
      if (perm !== 'granted') return

      const publicKey = await fetchVapidPublicKey()
      if (!publicKey) return

      const reg = await getServiceWorkerReg()
      if (!reg) return

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await createSubscription(publicKey)
      }
      if (!sub) return

      const ok = await postSubscription(sub)
      setSubscribed(ok)
    } catch {
      setPermState(Notification.permission as PermState)
    } finally {
      setBusy(false)
    }
  }

  /* ── Refresh / renew subscription ───────────────────── */
  async function handleRefresh() {
    setBusy(true)
    try {
      const publicKey = await fetchVapidPublicKey()
      if (!publicKey) return

      const reg = await getServiceWorkerReg()
      if (!reg) return

      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const newSub = await createSubscription(publicKey)
      if (!newSub) return

      const ok = await postSubscription(newSub)
      setSubscribed(ok)
    } catch {
      // Silent
    } finally {
      setBusy(false)
    }
  }

  /* ── Disable notifications ───────────────────────────── */
  async function handleDisable() {
    setBusy(true)
    try {
      const reg = await getServiceWorkerReg()
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await deleteSubscription(sub.endpoint)
      }
      setSubscribed(false)
      setPermState('default')
    } catch {
      // Silent
    } finally {
      setBusy(false)
    }
  }

  /* ══════════════════════════════════════════════════════
   *  COMPACT (sidebar) variant
   * ══════════════════════════════════════════════════════ */
  if (compact) {
    if (permState === 'loading') return (
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <div className="w-3 h-3 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        <span>جاري التحقق...</span>
      </div>
    )

    if (permState === 'unsupported') return (
      <div className="px-2 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,165,0,0.15)', color: '#fbbf24' }}>
        ⚠️ المتصفح لا يدعم الإشعارات
      </div>
    )

    if (permState === 'denied') return (
      <div className="px-2 py-2 rounded-lg text-xs" style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5' }}>
        <p className="font-semibold">🚫 الإشعارات محظورة</p>
        <p className="mt-0.5 opacity-80">افتح إعدادات المتصفح لإعادة السماح</p>
      </div>
    )

    if (permState === 'granted' && subscribed) return (
      <div className="flex items-center justify-between px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span className="text-green-300 text-base">🔔</span>
          <span className="text-xs text-green-300 font-medium">مفعّلة</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleRefresh}
            disabled={busy}
            title="تجديد الاشتراك"
            className="text-xs rounded px-1.5 py-0.5 disabled:opacity-50"
            style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.2)' }}
          >
            {busy ? '...' : '🔄'}
          </button>
          <button
            onClick={handleDisable}
            disabled={busy}
            className="text-xs rounded px-2 py-0.5 disabled:opacity-50"
            style={{ color: '#fca5a5', background: 'rgba(220,38,38,0.2)' }}
          >
            تعطيل
          </button>
        </div>
      </div>
    )

    return (
      <button
        onClick={handleEnable}
        disabled={busy}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
      >
        {busy
          ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>جاري...</span></>
          : <><span className="text-base">🔕</span><span>تفعيل الإشعارات</span></>
        }
      </button>
    )
  }

  /* ══════════════════════════════════════════════════════
   *  FULL variant (settings / notifications page)
   * ══════════════════════════════════════════════════════ */
  if (permState === 'loading') return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-400">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      جاري التحقق...
    </div>
  )

  if (permState === 'unsupported') return (
    <div className="px-4 py-3 bg-orange-50 rounded-xl border border-orange-200 text-sm text-orange-700 flex items-center gap-2">
      <span>⚠️</span> متصفحك لا يدعم الإشعارات. استخدم Chrome أو Edge.
    </div>
  )

  if (permState === 'denied') return (
    <div className="px-4 py-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700 flex items-start gap-2">
      <span>🚫</span>
      <div>
        <p className="font-semibold">تم حظر الإشعارات</p>
        <p className="text-xs mt-1">
          لإعادة التفعيل: اضغط على أيقونة القفل في شريط العنوان، ثم اسمح بالإشعارات وأعِد تحميل الصفحة.
        </p>
      </div>
    </div>
  )

if (permState === 'granted' && subscribed) return (
  /* إضافة mx-auto لتوسيط المستطيل + max-w-md لتحديد عرضه */
  <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-xl border border-green-200 mx-auto max-w-md w-full">
    <div className="flex items-center gap-2 text-green-700">
      <span className="text-lg">🔔</span>
      <div>
        <p className="text-sm font-semibold">الإشعارات مفعّلة</p>
        <p className="text-xs text-green-600">ستصلك الإشعارات على هذا الجهاز</p>
      </div>
    </div>
        <div className="flex gap-2">
      <button
        onClick={handleRefresh}
        disabled={busy}
        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {busy ? '...' : '🔄'}
      </button>
      <button
        onClick={handleDisable}
        disabled={busy}
        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        🔕
      </button>
    </div>
  </div>
)
  /* Default state — not yet enabled */
  return (
    <button
      onClick={handleEnable}
      disabled={busy}
      className="w-full flex items-center gap-3 px-4 py-3 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-xl transition-colors shadow"
    >
      {busy ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span className="text-xl">🔔</span>
      )}
      <div className="text-right">
        <p className="text-sm font-bold">{busy ? 'جاري التفعيل...' : 'تفعيل إشعارات المنصة'}</p>
        <p className="text-xs opacity-80">استقبل الإشعارات حتى عند إغلاق التطبيق</p>
      </div>
    </button>
  )
}
