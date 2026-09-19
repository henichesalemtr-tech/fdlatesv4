/**
 * Offline-first background sync engine for barcode attendance.
 *
 * Flow:
 *  1. Scans are recorded locally in IndexedDB first (near-instant UI).
 *  2. A unique `operationId` per scan makes re-pushes idempotent; the cloud
 *     endpoint plus the `attendances_student_date_unique` constraint prevent
 *     duplicate attendance rows on retry.
 *  3. A background flush pushes pending operations to `/api/attendance/barcode`.
 *
 * If IndexedDB is unavailable, `enqueueAttendance` returns null and the caller
 * falls back to the existing direct cloud call.
 */

import { create } from 'zustand'
import { createLocalDb, type LocalDb } from './db'
import type {
  AttendanceOperation,
  LocalStudent,
  SyncSnapshot,
} from './types'

// ── State store (Zustand already ships with the project) ──────────────────
interface SyncStore extends SyncSnapshot {
  set: (patch: Partial<SyncSnapshot>) => void
  ready: boolean
}

const useSyncStore = create<SyncStore>((set) => ({
  kind: 'idle',
  pendingCount: 0,
  busy: false,
  ready: false,
  set: (patch) => set(patch),
}))

export function subscribeSync(listener: () => void): () => void {
  return useSyncStore.subscribe(listener)
}

export function getSyncSnapshot(): SyncSnapshot {
  // Return the exact state object stored by zustand. This reference is stable
  // unless the store actually changes, so useSyncExternalStore will not treat
  // every read as a store mutation (which would cause infinite re-renders).
  return useSyncStore.getState() as SyncSnapshot
}

// ── Engine internals ────────────────────────────────────────────────────────
let db: LocalDb | null = null
let initialized = false
let flushing = false
let lastFlushFailed = false
let flushTimer: ReturnType<typeof setInterval> | null = null
let onlineHandler: (() => void) | null = null

const FLUSH_INTERVAL_MS = 15000
const MAX_ATTEMPTS = 5

function newOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function setSnapshot(patch: Partial<SyncSnapshot> & { ready?: boolean }) {
  useSyncStore.getState().set(patch)
}

async function countPending(): Promise<number> {
  if (!db) return 0
  const ops = await db.listOperations('pending', 'failed')
  return ops.length
}

async function refreshPendingCount() {
  try {
    const n = await countPending()
    const { busy } = useSyncStore.getState()
    let kind: SyncSnapshot['kind'] = busy
      ? 'syncing'
      : n > 0
        ? 'pending'
        : 'idle'
    // Keep showing the error state after a failed flush until the next flush
    // succeeds, so operators can see that a retry is needed.
    if (!busy && lastFlushFailed) kind = 'error'
    setSnapshot({ pendingCount: n, kind })
  } catch {
    /* non-fatal */
  }
}

/** Push every pending/failed operation to the cloud once. */
async function flush(): Promise<void> {
  if (!db || flushing) return
  flushing = true
  lastFlushFailed = false
  setSnapshot({ busy: true, kind: 'syncing' })
  try {
    const ops = await db.listOperations('pending', 'failed')
    if (ops.length > 0) {
      await pushBatch(ops)
    }
  } finally {
    flushing = false
    setSnapshot({ busy: false })
    await refreshPendingCount()
  }
}

async function pushBatch(ops: AttendanceOperation[]): Promise<void> {
  if (!db) return
  let sawError = false
  for (const op of ops) {
    if (op.syncStatus === 'synced') continue
    // Guard so we don't re-push an already-pushed op between reads.
    const fresh = await db.getOperation(op.operationId)
    if (fresh && fresh.syncStatus === 'synced') continue

    await db.patchOperation(op.operationId, {
      syncStatus: 'syncing',
      attempts: op.attempts + 1,
    })

    try {
      const res = await fetch('/api/attendance/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: op.studentId, date: op.date }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? 'attendance_failed')
      }
      await db.patchOperation(op.operationId, { syncStatus: 'synced' })
    } catch (err) {
      sawError = true
      const msg = err instanceof Error ? err.message : 'sync_failed'
      const attempts = op.attempts + 1
      const next: AttendanceOperation['syncStatus'] =
        attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
      await db.patchOperation(op.operationId, {
        syncStatus: next,
        attempts,
        lastError: msg,
      })
    }
  }
  if (sawError) {
    lastFlushFailed = true
    setSnapshot({ kind: 'error', lastError: 'تعذر المزامنة — إعادة المحاولة' })
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Fetch the minimal student list into the local cache (best-effort). */
export async function seedLocalStudents(): Promise<boolean> {
  if (!db) return false
  try {
    const res = await fetch('/api/students?includeGroup=true')
    if (!res.ok) return false
    const students = (await res.json()) as LocalStudent[]
    const minimal: LocalStudent[] = students.map((s) => ({
      id: s.id,
      studentNumber: s.studentNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      groupName: s.groupName ?? null,
      groupId: s.groupId ?? null,
      status: s.status ?? null,
    }))
    await db.replaceStudents(minimal)
    return true
  } catch {
    return false
  }
}

/** Local-only lookup of a student by barcode (number). */
export async function findStudentLocal(
  studentNumber: string
): Promise<LocalStudent | null> {
  if (!db) return null
  try {
    return await db.findStudent(studentNumber)
  } catch {
    return null
  }
}

/**
 * Whether the local station already recorded this student on the given day.
 * Survives page refresh because the operations store is the durable, offline
 * copy of what this station has scanned. Returns false when the local layer is
 * unavailable so callers can fall back to the cloud duplicate check.
 */
export async function getLocalScannedStudentIds(date: string, groupId?: number): Promise<number[] | null> {
  if (!db) return null
  try {
    const operations = await db.listOperationsForDate(date)
    const groupStudentIds = groupId == null
      ? null
      : new Set((await db.allStudents())
        .filter((student) => student.groupId === groupId)
        .map((student) => student.id))
    return [...new Set(
      operations
        .filter((operation) => groupStudentIds == null || groupStudentIds.has(operation.studentId))
        .map((operation) => operation.studentId)
    )]
  } catch {
    return null
  }
}

export async function hasLocalAttendance(
  studentId: number,
  date: string
): Promise<boolean> {
  if (!db) return false
  try {
    return await db.hasOperationFor(studentId, date)
  } catch {
    return false
  }
}

/**
 * Store one attendance locally. Returns the stored operation, or null when the
 * local DB is unavailable (caller falls back to the cloud directly).
 */
export async function enqueueAttendance(input: {
  studentId: number
  studentNumber: string
  firstName: string
  lastName: string
  groupName?: string | null
  date: string
}): Promise<AttendanceOperation | null> {
  if (!db) return null
  const op: AttendanceOperation = {
    operationId: newOperationId(),
    studentId: input.studentId,
    studentNumber: input.studentNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    groupName: input.groupName ?? null,
    date: input.date,
    status: 'present',
    createdAt: Date.now(),
    syncStatus: 'pending',
    attempts: 0,
  }
  try {
    await db.putOperation(op)
  } catch {
    return null
  }
  await refreshPendingCount()
  // Fire-and-forget immediate push so the cloud catches up right after the UI.
  void flush()
  return op
}

/** Start the engine: open IDB, seed students, schedule background sync. */
export async function initLocalSync(): Promise<void> {
  if (initialized) return
  initialized = true
  try {
    db = createLocalDb()
    // Touch the DB to surface availability early.
    await db.listOperations()
    setSnapshot({ ready: true })

    // Best-effort student cache refresh.
    flushTimer = setInterval(() => {
      void flush().catch(() => {})
    }, FLUSH_INTERVAL_MS)

    onlineHandler = () => {
      void flush().catch(() => {})
      void seedLocalStudents()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onlineHandler)
      // Attempt an early background flush shortly after mount.
      setTimeout(() => {
        void flush().catch(() => {})
      }, 800)
    }
    void seedLocalStudents()
  } catch {
    // IndexedDB is unavailable → disable local layer, fall back to cloud.
    db = null
    setSnapshot({ ready: false })
  }
}

/** Stop timers / listeners (useful on page unmount). */
export function destroyLocalSync(): void {
  if (flushTimer !== null) clearInterval(flushTimer)
  flushTimer = null
  if (onlineHandler && typeof window !== 'undefined') {
    window.removeEventListener('online', onlineHandler)
  }
  onlineHandler = null
}
