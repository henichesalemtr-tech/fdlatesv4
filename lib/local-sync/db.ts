/**
 * Minimal IndexedDB wrapper for the offline-first local sync layer.
 *
 * Uses only the native IndexedDB API (no extra dependency). Failures are
 * caught and reported so callers can transparently fall back to the cloud.
 */

import type { AttendanceOperation, LocalStudent } from './types'

const DB_NAME = 'fdlatest-sync'
const DB_VERSION = 1

export interface LocalDb {
  /** List all cached students. */
  allStudents(): Promise<LocalStudent[]>
  /** Find a single student by barcode (studentNumber). */
  findStudent(number: string): Promise<LocalStudent | null>
  /** Replace the local student cache in one transaction. */
  replaceStudents(students: LocalStudent[]): Promise<void>
  /** Insert (or overwrite) one attendance operation by operationId. */
  putOperation(op: AttendanceOperation): Promise<void>
  /** Read a single operation by id. */
  getOperation(id: string): Promise<AttendanceOperation | undefined>
  /** Whether an operation already exists for a student on a given day. */
  hasOperationFor(studentId: number, date: string): Promise<boolean>
  /** List operations by sync status (ascending id order). */
  listOperations(...statuses: Array<AttendanceOperation['syncStatus']>): Promise<AttendanceOperation[]>
  /** List all locally recorded attendance operations for a date. */
  listOperationsForDate(date: string): Promise<AttendanceOperation[]>
  /** Update only the sync bookkeeping fields of an operation. */
  patchOperation(
    id: string,
    patch: Partial<Pick<AttendanceOperation, 'syncStatus' | 'attempts' | 'lastError'>>
  ): Promise<void>
  destroy(): void
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('students')) {
        // studentNumber doubles as both the barcode and the natural key here.
        db.createObjectStore('students', { keyPath: 'studentNumber' })
      }
      if (!db.objectStoreNames.contains('operations')) {
        db.createObjectStore('operations', { keyPath: 'operationId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB open blocked'))
  })
}

async function dbRequest<T>(op: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb()
  try {
    return await op(db)
  } finally {
    db.close()
  }
}

export function createLocalDb(): LocalDb {
  const api: LocalDb = {
    async allStudents() {
      return dbRequest((db) =>
        new Promise<LocalStudent[]>((resolve, reject) => {
          const store = db.transaction('students', 'readonly').objectStore('students')
          const req = store.getAll()
          req.onsuccess = () => resolve((req.result as LocalStudent[]) ?? [])
          req.onerror = () => reject(req.error)
        })
      )
    },

    async findStudent(number: string) {
      return dbRequest(
        (db) =>
          new Promise<LocalStudent | null>((resolve, reject) => {
            const store = db.transaction('students', 'readonly').objectStore('students')
            const req = store.get(number)
            req.onsuccess = () => resolve((req.result as LocalStudent) ?? null)
            req.onerror = () => reject(req.error)
          })
      )
    },

    async replaceStudents(students: LocalStudent[]) {
      await dbRequest(
        (db) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction('students', 'readwrite')
            const store = tx.objectStore('students')
            store.clear()
            for (const s of students) store.put(s)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
          })
      )
    },

    async putOperation(op) {
      await dbRequest(
        (db) =>
          new Promise<void>((resolve, reject) => {
            const store = db.transaction('operations', 'readwrite').objectStore('operations')
            const req = store.put(op)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
          })
      )
    },

    async getOperation(id) {
      return dbRequest(
        (db) =>
          new Promise<AttendanceOperation | undefined>((resolve, reject) => {
            const store = db.transaction('operations', 'readonly').objectStore('operations')
            const req = store.get(id)
            req.onsuccess = () => resolve(req.result as AttendanceOperation | undefined)
            req.onerror = () => reject(req.error)
          })
      )
    },

    async hasOperationFor(studentId, date) {
      return dbRequest(
        (db) =>
          new Promise<boolean>((resolve, reject) => {
            const store = db.transaction('operations', 'readonly').objectStore('operations')
            const req = store.getAll()
            req.onsuccess = () => {
              const all = (req.result as AttendanceOperation[]) ?? []
              resolve(
                all.some(
                  (o) =>
                    o.studentId === studentId && o.date === date
                )
              )
            }
            req.onerror = () => reject(req.error)
          })
      )
    },

    async listOperationsForDate(date) {
      return dbRequest(
        (db) =>
          new Promise<AttendanceOperation[]>((resolve, reject) => {
            const store = db.transaction('operations', 'readonly').objectStore('operations')
            const req = store.getAll()
            req.onsuccess = () => {
              const all = (req.result as AttendanceOperation[]) ?? []
              resolve(all.filter((o) => o.date === date).sort((a, b) => a.createdAt - b.createdAt))
            }
            req.onerror = () => reject(req.error)
          })
      )
    },

    async listOperations(...statuses) {
      return dbRequest(
        (db) =>
          new Promise<AttendanceOperation[]>((resolve, reject) => {
            const store = db.transaction('operations', 'readonly').objectStore('operations')
            const req = store.getAll()
            req.onsuccess = () => {
              const all = (req.result as AttendanceOperation[]) ?? []
              const wanted = new Set(statuses)
              const filtered = statuses.length
                ? all.filter((o) => wanted.has(o.syncStatus))
                : all
              filtered.sort((a, b) => a.createdAt - b.createdAt)
              resolve(filtered)
            }
            req.onerror = () => reject(req.error)
          })
      )
    },

    async patchOperation(id, patch) {
      await dbRequest(
        (db) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction('operations', 'readwrite')
            const store = tx.objectStore('operations')
            const getReq = store.get(id)
            getReq.onsuccess = () => {
              const op = getReq.result as AttendanceOperation | undefined
              if (!op) {
                resolve()
                return
              }
              Object.assign(op, patch)
              store.put(op)
              resolve()
            }
            getReq.onerror = () => reject(getReq.error)
            tx.onerror = () => reject(tx.error)
          })
      )
    },

    destroy() {
      // No-op: the page owns the DB lifetime; provided for parity/testing.
    },
  }
  return api
}
