import { readFileSync } from 'fs'
import { createRequire } from 'module'

// Read DATABASE_URL from .env
const envContent = readFileSync('.env', 'utf8')
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim()

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in .env')
  process.exit(1)
}

// Hash password (SHA-256) - same as lib/auth.ts
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const { default: postgres } = await import('postgres')
const client = postgres(dbUrl, { prepare: false, max: 1 })

const username = 'admin'
const password = 'admin123'
const hashed = await hashPassword(password)

try {
  const existing = await client`SELECT id FROM users WHERE username = ${username} LIMIT 1`

  if (existing.length > 0) {
    await client`UPDATE users SET password = ${hashed}, status = 'active', role = 'admin' WHERE username = ${username}`
    console.log('✅ تم تحديث كلمة مرور admin بنجاح')
  } else {
    await client`INSERT INTO users (role, username, password, full_name, status) VALUES ('admin', ${username}, ${hashed}, 'المدير', 'active')`
    console.log('✅ تم إنشاء مستخدم admin بنجاح')
  }

  console.log('👤 اسم المستخدم: admin')
  console.log('🔑 كلمة المرور: admin123')
} catch (err) {
  console.error('❌ خطأ:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
