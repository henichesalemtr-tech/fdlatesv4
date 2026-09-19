# scaffold.md — منصة الفردوس

## Directory structure

```
project/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — Cairo font, RTL, Toaster, PWA meta
│   ├── page.tsx                  # Root route — shows LandingPage or redirects to /login
│   ├── globals.css               # Tailwind base + custom CSS variables
│   │
│   ├── login/page.tsx            # Login form (no layout guard)
│   ├── register/page.tsx         # Public student registration request form
│   ├── coursereg/page.tsx        # Public course self-registration form (no auth)
│   │
│   ├── dashboard/
│   │   ├── layout.tsx            # Guards session → redirects guardian to /guardian-dashboard
│   │   ├── page.tsx              # Stats cards, recent activity, top students
│   │   └── registration-requests/page.tsx   # Pending student registration approvals
│   │
│   ├── students/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Student list, add/edit/delete, Excel import/export
│   │   └── [id]/
│   │       ├── page.tsx          # Student detail — attendance, memorization, fees
│   │       └── print/page.tsx    # Printable student card
│   │
│   ├── teachers/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Teacher list, add/edit/delete
│   │   └── [id]/page.tsx         # Teacher detail — groups, attendance, salary
│   │
│   ├── groups/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Groups + assign students + assign teachers
│   │
│   ├── attendance/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Manual attendance entry per group/date
│   │   ├── contact/page.tsx      # Contact guardian for absent student
│   │   └── scan-monitor/page.tsx # Live scan feed (barcode/QR)
│   │
│   ├── auto-attendance/
│   │   ├── layout.tsx
│   │   └── page.tsx              # QR code attendance scanner (camera)
│   │
│   ├── barcode-attendance/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Barcode display screen + scan overlay
│   │
│   ├── teacher-attendance/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Teacher attendance log
│   │
│   ├── memorization/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Quran memorization sessions + homework per student
│   │
│   ├── schedules/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Weekly schedule builder (slots per group/room/teacher)
│   │
│   ├── rooms/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Classroom management (add/edit/delete rooms)
│   │
│   ├── finance/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Fees, expenses, salaries, donations — 4 tabs
│   │
│   ├── notifications/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Send + list notifications; admin can push to all
│   │   └── settings/page.tsx     # Per-user notification preferences
│   │
│   ├── messages/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Internal messaging (inbox + compose); teacher group broadcast 📣
│   │
│   ├── ranking/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Student ranking by memorization points per group
│   │   └── print/
│   │       ├── layout.tsx
│   │       └── page.tsx          # Printable ranking table
│   │
│   ├── reports/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Attendance and student performance reports
│   │   └── cards/
│   │       ├── layout.tsx
│   │       └── page.tsx          # Printable student report cards
│   │
│   ├── courses/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Training courses management + enrolled students + registrations + print
│   │
│   ├── guardians/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Guardian list + add/edit/link to student
│   │
│   ├── guardian-dashboard/
│   │   ├── layout.tsx            # Guards guardian role only
│   │   └── page.tsx              # Guardian view: child attendance/memorization + message teacher/admin
│   │
│   ├── users/
│   │   ├── layout.tsx
│   │   └── page.tsx              # User management (admin only)
│   │
│   ├── roles/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Custom role management with permission checkboxes (admin only)
│   │
│   ├── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # System settings + landing page config + course registration toggle
│   │   ├── activity-logs/page.tsx    # Admin audit log
│   │   ├── barcode-attendance/page.tsx  # Barcode display screen settings
│   │   └── notifications/page.tsx    # Notification system settings
│   │
│   ├── profile/
│   │   ├── layout.tsx
│   │   └── page.tsx              # User profile edit (name, password)
│   │
│   └── backup/
│       ├── layout.tsx
│       └── page.tsx              # Export / import JSON backup (v4.0)
│
├── app/api/                      # API Routes (all return JSON)
│   ├── auth/
│   │   ├── login/route.ts        # POST — sets session cookie
│   │   ├── logout/route.ts       # POST — clears session cookie
│   │   └── me/route.ts           # GET — returns current user + permissions[]
│   │
│   ├── students/
│   │   ├── route.ts              # GET (list+search) | POST (create)
│   │   ├── [id]/route.ts         # GET | PUT | DELETE
│   │   ├── [id]/absences/route.ts
│   │   ├── [id]/groups/route.ts
│   │   ├── import/route.ts       # POST — Excel import
│   │   └── export/route.ts       # GET — Excel export
│   │
│   ├── teachers/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   ├── [id]/groups/route.ts
│   │   └── detail/route.ts
│   │
│   ├── groups/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   ├── [id]/students/route.ts
│   │   └── [id]/teacher/route.ts
│   │
│   ├── attendance/
│   │   ├── route.ts              # GET | POST
│   │   ├── contact/route.ts      # POST — notify guardian of absence
│   │   └── sync-status/route.ts
│   │
│   ├── teacher-attendance/route.ts
│   │
│   ├── memorization/
│   │   └── sessions/route.ts     # GET | POST
│   │
│   ├── schedules/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── generate/route.ts
│   │
│   ├── rooms/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   │
│   ├── subjects/route.ts
│   ├── surahs/route.ts           # GET — 114 Quran surahs
│   │
│   ├── notifications/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   ├── [id]/read/route.ts
│   │   ├── absence-alert/route.ts
│   │   └── my-guardians/route.ts
│   │
│   ├── push/
│   │   ├── subscribe/route.ts    # GET (vapid key) | POST (save sub) | DELETE (remove)
│   │   └── send/route.ts         # POST — send web push to target users
│   │
│   ├── messages/
│   │   ├── route.ts              # GET (inbox) | POST (send); guardians can reach admin roles
│   │   └── broadcast/route.ts    # POST — teacher sends to all guardians of their groups
│   │
│   ├── finance/
│   │   ├── fees/route.ts
│   │   ├── expenses/route.ts
│   │   ├── salaries/route.ts
│   │   └── donations/route.ts
│   │
│   ├── users/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   │
│   ├── roles/route.ts
│   │
│   ├── guardians/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   │
│   ├── guardian/dashboard/route.ts
│   │
│   ├── registration-requests/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── [id]/accept/route.ts
│   │
│   ├── courses/
│   │   ├── route.ts              # GET | POST (courses list/create)
│   │   ├── [id]/route.ts         # GET | PUT | DELETE (single course)
│   │   ├── [id]/students/route.ts    # GET | POST | DELETE (enrolled students)
│   │   └── [id]/registrations/
│   │       └── [regId]/route.ts  # PUT (accept/reject registration)
│   │
│   ├── coursereg/route.ts        # POST — public course self-registration (no auth)
│   │
│   ├── settings/route.ts         # GET | POST (upsert key-value pairs)
│   ├── landing/route.ts          # GET — public, no auth required
│   │
│   ├── backup/
│   │   ├── route.ts              # GET (export v4.0, 25 tables) | POST (restore)
│   │   └── seed/route.ts
│   │
│   ├── dashboard/
│   │   ├── stats/route.ts
│   │   └── top-students/route.ts
│   │
│   ├── scan-logs/
│   │   ├── route.ts
│   │   └── export/route.ts
│   │
│   ├── activity-logs/route.ts
│   ├── profile/route.ts
│   ├── ranking/route.ts
│   ├── health/route.ts           # GET — simple liveness check
│   └── admin/cleanup-temp/route.ts
│
├── components/
│   ├── MobileLayout.tsx          # Main shell — sidebar + header + bottom nav
│   ├── Sidebar.tsx               # Desktop sidebar, role-aware nav items + permissions
│   ├── Header.tsx                # Top bar with menu button and user info
│   ├── LandingPage.tsx           # Public marketing landing page
│   ├── PushNotificationManager.tsx
│   ├── PushEnableButton.tsx
│   ├── PushManagerClient.tsx
│   ├── SplashScreen.tsx
│   ├── SplashWrapper.tsx
│   ├── HappySeedsWatermark.tsx   # Attribution watermark (do not remove)
│   ├── AgentationGuard.tsx
│   ├── barcode-display/          # Barcode rendering components (clock, hadith, prayer times…)
│   └── ui/                       # shadcn/ui components (do not edit manually)
│
├── db/
│   ├── index.ts                  # Drizzle client — one per request via React cache()
│   └── schemas/
│       └── schema.ts             # All table definitions + relations + enums
│
├── lib/
│   ├── auth.ts                   # getSession, createSessionToken, hashPassword, hasPermission
│   ├── activity.ts               # logActivity() — silent activity log writer
│   ├── errors.ts                 # AppError, ValidationError, UnauthorizedError, NotFoundError
│   ├── vapid.ts                  # getVapidConfig(), getVapidPublicKey() — runtime env reads
│   ├── utils.ts
│   ├── utils-server.ts
│   ├── env.ts
│   ├── logger.ts
│   └── request.ts
│
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── utils/
│   └── cn.ts
│
├── drizzle/                      # SQL migration files (generated by drizzle-kit)
│   ├── 0000_open_living_mummy.sql
│   ├── 0001_curvy_skin.sql
│   └── meta/
│
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── logo.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── ferdous-bg.jpg
│   ├── pwa-icon.png
│   ├── notification-badge.png
│   └── data/hadiths.json         # Hadith data for barcode display
│
├── scripts/
│   ├── restore-new-backup.mjs    # Node script — restores backup with FD id remapping
│   └── copy-db-to-neon.mjs       # Node script — copies full DB to a Neon target
│
├── .env                          # Local secrets (not committed)
├── .env.example
├── next.config.ts                # web-push in serverExternalPackages
├── drizzle.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json
├── package.json
├── pnpm-lock.yaml
├── DEPLOY_LOCAL.md
├── USER_GUIDE.md
├── agent.md                      # AI agent instructions for this project
└── scaffold.md                   # This file — project structure reference
```

---

## Database tables (37 total)

| Table | Description |
|---|---|
| `settings` | Key-value app configuration (landing_enabled, course_registration_enabled, …) |
| `users` | All login accounts (admin / teacher / guardian / custom) |
| `roles` | Custom role definitions with JSON permission arrays |
| `students` | Student records — `id` always equals FD number part |
| `teachers` | Teacher profiles linked to a `users` account |
| `groups` | Class groups (أفواج) |
| `guardians` | Guardian contact records (separate from users) |
| `rooms` | Physical classrooms |
| `subjects` | Academic subjects |
| `schedules` | Weekly class schedule slots |
| `group_students` | Many-to-many: students ↔ groups |
| `teacher_groups` | Many-to-many: teachers ↔ groups |
| `attendances` | Per-student daily attendance records |
| `teacher_attendances` | Per-teacher daily attendance |
| `memorization_sessions` | Quran memorization progress per student |
| `homework` | Assigned homework (per student or per group) |
| `surahs` | 114 Quran surah names and metadata |
| `fee_payments` | Student fee payment records |
| `session_fee_settings` | Per-group fee configuration |
| `expenses` | School expense records |
| `salary_payments` | Teacher salary payment records |
| `teacher_salary_settings` | Per-teacher salary configuration |
| `donations` | Donation records |
| `notifications` | In-app notifications (manual + auto absence alerts) — targets all/teachers/guardians/specific |
| `notification_reads` | Tracks which users read which notifications |
| `messages` | Internal direct messages between users |
| `push_subscriptions` | Web Push subscription objects per user |
| `registration_requests` | Public student registration form submissions |
| `scan_logs` | QR / barcode scan event log |
| `activity_logs` | Admin audit log of all significant actions |
| `courses` | Training courses (name, dates, capacity, price, status) |
| `course_students` | Admin-enrolled platform students per course |
| `course_registrations` | Public self-registration requests per course |

---

## npm scripts

```bash
pnpm dev          # Start dev server on port 13000
pnpm build        # Production build
pnpm start        # Start production server on port 13000
pnpm db:generate  # Generate Drizzle migration files from schema changes
pnpm db:migrate   # Apply pending migrations to the database
pnpm db:studio    # Open Drizzle Studio (DB GUI)
pnpm lint         # ESLint with auto-fix
```

---

## Role access matrix

| Feature | admin | teacher | guardian | custom role |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ❌ | ✅ |
| Students (full CRUD) | ✅ | view only | ❌ | by permission |
| Teachers | ✅ | ❌ | ❌ | by permission |
| Groups | ✅ | ✅ | ❌ | ✅ |
| Attendance (manual) | ✅ | ✅ | ❌ | ✅ |
| Barcode attendance | ✅ | ❌ | ❌ | by permission |
| Teacher attendance | ✅ | ❌ | ❌ | by permission |
| Memorization | ✅ | ✅ | ❌ | ✅ |
| Schedules | ✅ | ❌ | ❌ | by permission |
| Rooms | ✅ | ❌ | ❌ | by permission |
| Finance | ✅ | ❌ | ❌ | by permission |
| Notifications (send) | ✅ | ✅ | ❌ | ✅ |
| Messages | ✅ | ✅ | ✅ | ✅ |
| Ranking | ✅ | ✅ | ❌ | ✅ |
| Courses management | ✅ | ❌ | ❌ | by permission |
| Reports | ✅ | ❌ | ❌ | by permission |
| Guardians | ✅ | ❌ | ❌ | by permission |
| Users & Roles | ✅ | ❌ | ❌ | ❌ |
| Settings & Backup | ✅ | ❌ | ❌ | ❌ |
| Guardian dashboard | ❌ | ❌ | ✅ | ❌ |

---

## Deployment targets

| Target | Notes |
|---|---|
| **Localhost** | `pnpm dev` on port 13000; PostgreSQL local or hosted |
| **Vercel** | Connect GitHub repo; set env vars; use Neon/Supabase for DB |
| **Cloudflare Workers** | `pnpm build:worker` via opennextjs-cloudflare; requires edge-compatible DB proxy |

See `DEPLOY_LOCAL.md` for step-by-step instructions.
