/* ============================================================
 *  Ferdous AC — Service Worker v4
 *  - PWA caching (cache-first for statics, network-first for pages)
 *  - Web Push: receive & show native notifications
 *  - Notification click: open / focus app window
 * ============================================================ */

const CACHE_NAME = 'ferdous-v5'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/notification-badge.png',
]

// ── Install: pre-cache critical assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {
        // Silent fail on addAll so SW still installs if an asset 404s
      })
    )
  )
  self.skipWaiting()
})

// ── Activate: evict old cache versions ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: stale-while-revalidate for GET requests ──────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin GET requests
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return
  // Never intercept API calls
  if (url.pathname.startsWith('/api/')) return
  // Never intercept Next.js internals
  if (url.pathname.startsWith('/_next/')) return

  if (request.mode === 'navigate') {
    // Navigation: try network, fall back to cached root
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((r) => r ?? fetch(request))
      )
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// ── Push: receive push message & show notification ──────────
self.addEventListener('push', (event) => {
  const defaults = {
    title: 'منصة الفردوس',
    body: 'لديك إشعار جديد',
    icon: '/icon-192x192.png',
    badge: '/notification-badge.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: '/notifications' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
  }

  let payload = { ...defaults }
  if (event.data) {
    try {
      payload = { ...defaults, ...event.data.json() }
    } catch {
      // Fallback to defaults if payload is not valid JSON
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || defaults.icon,
      badge: payload.badge || defaults.badge,
      dir: payload.dir,
      lang: payload.lang,
      data: payload.data,
      vibrate: payload.vibrate,
      requireInteraction: payload.requireInteraction,
      renotify: payload.renotify,
      silent: payload.silent,
      tag: payload.data?.tag || 'ferdous-notification',
    })
  )
})

// ── Notification click: focus or open window ────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Try to find an existing window with the same origin
        const existingClient = clients.find(
          (c) => c.url.startsWith(self.location.origin)
        )
        if (existingClient) {
          existingClient.navigate(targetUrl)
          return existingClient.focus()
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})

// ── Push subscription change: auto-resubscribe ──────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSub) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub.toJSON()),
        })
      })
      .catch(() => {
        // Silent fail — subscription will be renewed on next page load
      })
  )
})
