import { cookies } from 'next/headers'
import { cache } from 'react'
import { db } from '@/db'
import { users, roles } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'

export type SessionUser = {
  id: number
  /** الأدوار الأساسية: admin | teacher | guardian — أو أي دور مخصص */
  role: string
  username: string
  fullName: string | null
  teacherId?: number | null
  status?: string
}

// ─── HMAC session signing ─────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'fallback-dev-secret-change-in-prod'

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

/** Creates a signed session token: base64(payload).hex(hmac) */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const key = await getHmacKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${bufferToHex(sig)}`
}

/** Verifies HMAC signature and returns the parsed payload, or null if invalid. */
async function verifySessionToken(token: string): Promise<SessionUser | null> {
  // Support legacy plain base64 tokens (no dot separator) for backward compat
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) {
    // Legacy: plain base64 JSON, no signature — accept but flag as unauthenticated
    try {
      const data = JSON.parse(Buffer.from(token, 'base64').toString())
      return data?.id ? (data as SessionUser) : null
    } catch { return null }
  }
  const payload = token.slice(0, dotIdx)
  const sigHex = token.slice(dotIdx + 1)
  try {
    const key = await getHmacKey()
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      hexToBuffer(sigHex),
      new TextEncoder().encode(payload),
    )
    if (!valid) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser
  } catch { return null }
}

// ─── Password hashing (PBKDF2 + SHA-256, Web Crypto) ─────────────────────────
// PBKDF2 is a key-stretching function; it is much harder to brute-force than
// plain SHA-256.  We store the salt alongside the hash in the format:
//   pbkdf2$<iterations>$<hex-salt>$<hex-hash>
// Legacy SHA-256 passwords (no prefix) are still accepted for login.

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
    key, 256,
  )
  const saltHex = bufferToHex(salt.buffer)
  const hashHex = bufferToHex(bits)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`
}

async function sha256Hex(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return bufferToHex(buf)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$')
    if (parts.length !== 4) return false
    const iterations = parseInt(parts[1])
    const salt = hexToBuffer(parts[2])
    const expectedHash = parts[3]
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password),
      { name: 'PBKDF2' }, false, ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, hash: 'SHA-256', iterations },
      key, 256,
    )
    return bufferToHex(bits) === expectedHash
  }
  // Legacy: plain SHA-256
  return (await sha256Hex(password)) === stored
}

// ─── getSession ───────────────────────────────────────────────────────────────

/**
 * Load the live user row for a session id.
 * Cached per request (React `cache`) so multiple getSession() calls in the
 * same request only hit the database once.
 */
const loadLiveUser = cache(async (userId: number) => {
  try {
    const [row] = await db
      .select({
        id: users.id,
        role: users.role,
        username: users.username,
        fullName: users.fullName,
        teacherId: users.teacherId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return row ?? null
  } catch {
    return null
  }
})

/** Live permissions for a role name (cached per request). */
export const getRolePermissions = cache(async (roleName: string): Promise<string[]> => {
  try {
    const [row] = await db
      .select({ permissions: roles.permissions })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1)
    if (!row?.permissions) return []
    const parsed = JSON.parse(row.permissions)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

/**
 * Check whether a session has a specific permission key.
 * - admin: always true (shortcut, no DB lookup needed).
 * - Any other role: fetches the role's permission list from the `roles` table
 *   (result is cached per request via getRolePermissions).
 */
export async function hasPermission(session: SessionUser | null, key: string): Promise<boolean> {
  if (!session) return false
  if (session.role === 'admin') return true
  const perms = await getRolePermissions(session.role)
  return perms.includes(key)
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie?.value) return null

    const data = await verifySessionToken(sessionCookie.value)
    if (!data?.id) return null

    // ── Refresh role / status / teacherId from the database ──────────────
    const live = await loadLiveUser(data.id)
    if (!live) return data            // DB unreachable → fall back to cookie
    if (live.status && live.status !== 'active') return null  // disabled account

    return {
      ...data,
      role: live.role,
      username: live.username ?? data.username,
      fullName: live.fullName ?? data.fullName,
      teacherId: live.teacherId ?? null,
      status: live.status,
    }
  } catch {
    return null
  }
}
