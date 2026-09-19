# منصة الفردوس — دليل النشر الكامل

---

## 🖥️ النشر المحلي (Localhost)

### المتطلبات
- Node.js 18+ (يُنصح بـ 20 LTS)
- pnpm — `npm install -g pnpm`
- PostgreSQL 14+ محلياً أو رابط قاعدة بيانات مستضافة

### الخطوات

```bash
# 1. فك الضغط
unzip ferdous-platform.zip
cd project

# 2. تثبيت الحزم
pnpm install

# 3. إعداد ملف البيئة
cp .env.local.example .env
# افتح .env وعدّل DATABASE_URL
```

مثال على `DATABASE_URL` للـ localhost:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/ferdous
AUTH_SECRET=any_long_random_string_here
```

```bash
# 4. إنشاء قاعدة البيانات وتطبيق الـ migrations
createdb ferdous          # إنشاء قاعدة البيانات
pnpm db:migrate           # تطبيق جميع الجداول

# 5. تشغيل المشروع
pnpm dev
# التطبيق يعمل على: http://localhost:13000
```

### تسجيل الدخول الأول
بعد رفع نسخة احتياطية من صفحة **النسخ الاحتياطي**:
- المستخدم: `admin`
- كلمة المرور: `admin123`

### بناء الإنتاج محلياً
```bash
pnpm build
pnpm start
# http://localhost:13000
```

---

## ☁️ النشر على Vercel

### 1. قاعدة البيانات أولاً
Vercel لا توفر قاعدة بيانات مدمجة — يجب ربط PostgreSQL مستضاف.
الخيارات المجانية الموصى بها:

| الخدمة | الرابط | الخطة المجانية |
|--------|--------|----------------|
| **Neon** | https://neon.tech | 512 MB مجاناً |
| **Supabase** | https://supabase.com | 500 MB مجاناً |
| **Railway** | https://railway.app | 5 $ رصيد شهري |

بعد إنشاء قاعدة البيانات، احفظ رابط الاتصال (`DATABASE_URL`).

---

### 2. رفع المشروع على GitHub

```bash
cd project
git init
git add .
git commit -m "Initial commit — منصة الفردوس"
git branch -M main

# أنشئ مستودعاً على github.com ثم:
git remote add origin https://github.com/YOUR_USERNAME/ferdous-platform.git
git push -u origin main
```

---

### 3. ربط المشروع بـ Vercel

1. افتح https://vercel.com وسجّل الدخول بحساب GitHub
2. اضغط **Add New → Project**
3. اختر مستودع `ferdous-platform`
4. في قسم **Configure Project**:
   - **Framework Preset**: Next.js (يُكتشف تلقائياً)
   - **Root Directory**: `.` (اتركه كما هو)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

---

### 4. إضافة متغيرات البيئة في Vercel

في قسم **Environment Variables** أثناء الإعداد (أو لاحقاً من Settings → Environment Variables):

| المتغير | القيمة | ملاحظة |
|---------|--------|--------|
| `DATABASE_URL` | رابط Neon/Supabase | **مطلوب** |
| `AUTH_SECRET` | سلسلة عشوائية طويلة | **مطلوب** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | مفتاح VAPID العام | اختياري |
| `VAPID_PUBLIC_KEY` | مفتاح VAPID العام | اختياري |
| `VAPID_PRIVATE_KEY` | مفتاح VAPID الخاص | اختياري |

لتوليد `AUTH_SECRET`:
```bash
openssl rand -hex 32
```

لتوليد مفاتيح VAPID (للإشعارات):
```bash
npx web-push generate-vapid-keys
```

---

### 5. تطبيق migrations على قاعدة البيانات المستضافة

قبل أول نشر، شغّل الـ migrations على قاعدة بيانات Vercel/Neon:

```bash
# في مجلد المشروع المحلي، بعد إضافة DATABASE_URL للـ .env
DATABASE_URL="postgresql://..." pnpm db:migrate
```

أو عبر Neon Console → SQL Editor:
- ارفع ملفات `drizzle/*.sql` بالترتيب

---

### 6. Deploy

اضغط **Deploy** — Vercel تُبني وتُنشر المشروع تلقائياً.
بعد النشر ستحصل على رابط مثل:
```
https://ferdous-platform.vercel.app
```

---

### 7. تشغيل Migrations بعد النشر (طريقة بديلة)

إذا أردت تشغيل الـ migrations بعد النشر مباشرة من Vercel:
1. اذهب إلى **Vercel Dashboard → Project → Settings → Functions**
2. أو استخدم **Vercel CLI**:

```bash
npm install -g vercel
vercel login
vercel env pull .env.production.local
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) pnpm db:migrate
```

---

### 8. استعادة البيانات بعد النشر

1. افتح التطبيق المنشور على Vercel
2. سجّل الدخول (ستحتاج لإنشاء مستخدم admin أولاً إذا لم تستعد backup)
3. اذهب إلى **النسخ الاحتياطي**
4. ارفع ملف `.json` الخاص بك
5. كلمة المرور بعد الاستعادة: `admin123`

---

### 9. إعداد النطاق المخصص (اختياري)

في Vercel Dashboard → Project → Settings → Domains:
1. اضغط **Add Domain**
2. أدخل نطاقك مثل `ferdous.yourdomain.com`
3. اتبع تعليمات DNS

---

## 📦 المشروع القابل للتحميل (`/download`)

صفحة `/download` توفر:

- **`ferdous-platform.zip`** — الحزمة الكاملة للمشروع (لا تشمل `.env` ولا `node_modules` ولا `.next`). بعد فك الضغط: `cp .env.example .env` ثم `pnpm install` و`pnpm db:migrate`.
- **تحميل قاعدة البيانات** — عبر `/api/download/db` الذي يستدعي `pg_dump`. يتطلب تثبيت أدوات PostgreSQL على الخادم. إذا لم يُثبَّت `pg_dump` تعود الصفحة برمز 500؛ استخدم بدلاً منه نسخة JSON الاحتياطية من داخل التطبيق أو التصدير من لوحة تحكم قاعدة البيانات (مثل Neon).

> 🔒 ملاحظة: حزمة `.zip` لا تُضمّن المتغيرات السرية إطلاقاً. كل المسؤولية على المستخدم لتجهيز `.env` بقيمه الخاصة قبل النشر.

---

## 🔧 متغيرات البيئة الكاملة

```env
# مطلوب
DATABASE_URL=postgresql://user:password@host:5432/dbname
AUTH_SECRET=your_32_char_random_secret

# اختياري — للإشعارات الفورية
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## ❓ حل المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| `DATABASE_URL is not set` | أضف المتغير في Environment Variables بـ Vercel |
| خطأ في الـ build | تأكد من تشغيل `pnpm db:migrate` على قاعدة البيانات الصحيحة |
| الصفحة لا تفتح بعد النشر | تحقق من Vercel Logs → Functions |
| خطأ `relation does not exist` | الـ migrations لم تُطبَّق — شغّل `pnpm db:migrate` |
| نسيت كلمة المرور | استعد نسخة احتياطية من صفحة Backup — تُعيَّن `admin123` |
