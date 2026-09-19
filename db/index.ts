import 'server-only'
import { cache } from 'react'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

// Use Neon HTTP driver for Cloudflare Workers compatibility.
// postgres.js (raw TCP) is not supported in CF Workers / V8 isolates.
// The Neon HTTP driver uses fetch() which is available in all runtimes.

const getSql = cache(() => {
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
}
  return neon(process.env.DATABASE_URL)
})

function getDb() {
  return drizzle(getSql())
}

// Lazy proxy: the DB connection is only established at runtime (not at build /
// module-eval time) and is resolved per request through getSql().
export const db = new Proxy({} as ReturnType<typeof getDb>, {
get(_target, prop: string | symbol) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
},
})
