// Shared types for the offline-first barcode attendance local-sync layer.

/** A locally-cached, minimal view of a student used for offline barcode lookup. */
export interface LocalStudent {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  groupName?: string | null
  groupId?: number | null
  status?: string | null
}

/**
 * A queued attendance operation. `operationId` is the unique idempotency key;
 * the cloud stores one attendance row per (studentId, date), so re-pushing the
 * same operation (even after retries) can never create a duplicate row.
 */
export type OperationStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'

export interface AttendanceOperation {
  operationId: string
  studentId: number
  studentNumber: string
  firstName: string
  lastName: string
  groupName?: string | null
  /** Cloud write date — kept empty once pushed successfully. */
  date: string
  status: 'present'
  createdAt: number
  syncStatus: OperationStatus
  attempts: number
  lastError?: string | null
}

export type SyncKind = 'idle' | 'syncing' | 'pending' | 'error'

export interface SyncSnapshot {
  kind: SyncKind
  /** Number of operations not yet pushed to the cloud. */
  pendingCount: number
  lastError?: string
  /** True while a flush request is in-flight. */
  busy: boolean
}
