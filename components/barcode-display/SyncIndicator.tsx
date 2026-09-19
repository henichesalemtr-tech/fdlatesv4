'use client'

import { useSyncExternalStore } from 'react'
import { getSyncSnapshot, subscribeSync } from '@/lib/local-sync/sync'
import type { SyncSnapshot } from '@/lib/local-sync/types'

function textFor(s: SyncSnapshot): { text: string; color: string; spin?: boolean } {
  if (s.kind === 'syncing') {
    return {
      text: `↻ جارٍ المزامنة ${s.pendingCount}`,
      color: '#38bdf8',
      spin: true,
    }
  }
  if (s.kind === 'error') {
    return { text: '⚠ تعذر المزامنة — إعادة المحاولة', color: '#f87171' }
  }
  if (s.kind === 'pending' && s.pendingCount > 0) {
    return { text: `${s.pendingCount} عمليات معلقة`, color: '#fbbf24' }
  }
  return { text: '✓ متزامن', color: '#4ade80' }
}

// Server-safe snapshot: during SSR there is no IndexedDB, so return a neutral
// "idle" state. The client re-renders with the real store snapshot after hydration.
const SERVER_SNAPSHOT: SyncSnapshot = { kind: 'idle', pendingCount: 0, busy: false }

export default function SyncIndicator() {
  const snapshot = useSyncExternalStore(subscribeSync, getSyncSnapshot, () => SERVER_SNAPSHOT)
  const { text, color, spin } = textFor(snapshot)

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
      style={{ borderColor: `${color}55`, background: `${color}14`, color }}
      title="حالة مزامنة الحضور مع السحابة"
      dir="rtl"
    >
      {spin ? (
        <span
          className="inline-block w-3 h-3 rounded-full border-2"
          style={{
            borderColor: `${color}40`,
            borderTopColor: color,
            animation: 'sync-spin 0.8s linear infinite',
          }}
        />
      ) : (
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      )}
      <span className="whitespace-nowrap" translate="no">
        {text}
      </span>
      <style>{`
        @keyframes sync-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
