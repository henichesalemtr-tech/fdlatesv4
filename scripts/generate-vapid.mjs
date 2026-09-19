#!/usr/bin/env node
/**
 * scripts/generate-vapid.mjs
 * ──────────────────────────
 * توليد مفاتيح VAPID جديدة لـ Web Push
 * الاستخدام:
 *   node scripts/generate-vapid.mjs
 *
 * سيعرض المفاتيح ويضيفها تلقائياً إلى ملف .env إذا كان موجوداً.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load web-push
const require = createRequire(import.meta.url)
let webpush
try {
  webpush = require('web-push')
} catch {
  console.error('❌ مكتبة web-push غير مثبّتة. شغّل: pnpm install')
  process.exit(1)
}

const keys = webpush.generateVAPIDKeys()

console.log('\n✅ تم توليد مفاتيح VAPID بنجاح:\n')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('VAPID_SUBJECT=mailto:admin@ferdous.app')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log()

// Update .env file if it exists
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  let content = readFileSync(envPath, 'utf8')

  const replacements = {
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
  }

  let updated = false
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
      updated = true
    } else {
      // Append if not present
      content += `\n${key}=${value}`
      updated = true
    }
  }

  if (updated) {
    writeFileSync(envPath, content, 'utf8')
    console.log('📝 تم تحديث ملف .env بالمفاتيح الجديدة')
  }
} else {
  console.log('⚠️  ملف .env غير موجود. أضف المفاتيح يدوياً أو انسخ .env.example أولاً.')
}

console.log(`
⚠️  تذكير مهم:
   • أضف هذه المتغيرات في لوحة تحكم Vercel تحت: Settings → Environment Variables
   • لا تشارك VAPID_PRIVATE_KEY أبداً
   • إذا غيّرت المفاتيح، يجب أن يُعيد كل مستخدم تفعيل الإشعارات
`)
