'use client'
/**
 * PushNotificationManager
 * ─────────────────────────────────────────────────────
 * Silently syncs the browser's push subscription to the
 * server whenever the user has already granted permission.
 * Runs once per page load; renders nothing.
 *
 * Flow:
 *  1. Check browser support + notification permission
 *  2. Fetch VAPID public key from /api/push/subscribe (GET)
 *  3. Fetch current user session from /api/auth/me
 *  4. Subscribe (or reuse existing subscription) via PushManager
 *  5. POST subscription to /api/push/subscribe to link it to the user
 */

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function syncPushSubscription(): Promise<void> {
  // Guard: browser support
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) return

  // Guard: permission must already be granted (don't prompt here)
  if (Notification.permission !== 'granted') return

  // Fetch VAPID key and user session in parallel
  const [keyRes, meRes] = await Promise.all([
    fetch('/api/push/subscribe', { credentials: 'include' }),
    fetch('/api/auth/me', { credentials: 'include' }),
  ])

  if (!keyRes.ok) return
  const { publicKey } = await keyRes.json()
  if (!publicKey) return

  // User must be authenticated
  const me = meRes.ok ? await meRes.json() : null
  if (!me?.id) return

  // Wait for SW to be ready (max 10 s timeout)
  let reg: ServiceWorkerRegistration
  try {
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SW timeout')), 10_000)
      ),
    ])
  } catch {
    return
  }

  // Reuse existing subscription if one exists
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }

  // Always POST to link (or re-link) this endpoint to the current user
  await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

export default function PushNotificationManager() {
  useEffect(() => {
    // Defer slightly so the page renders first
    const timer = setTimeout(() => {
      syncPushSubscription().catch(() => {
        // Best-effort: silent fail
      })
    }, 2_000)

    return () => clearTimeout(timer)
  }, [])

  return null
}
