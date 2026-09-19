# منصة الفردوس — Quran School Management Platform

A full-featured, Arabic-first management platform for Quran schools (مدارس تحفيظ القرآن الكريم).
Built with Next.js 15 App Router, PostgreSQL (Drizzle ORM), Tailwind CSS, and shadcn/ui.
Mobile-first PWA, fully RTL, supporting admin, teacher, and guardian roles.

---

## Features

### Student & Teacher Management
- Full CRUD for students with FD-numbered IDs (FD0001, FD0002, …)
- Excel import/export for bulk student management
- Teacher profiles linked to user accounts
- Groups (أفواج) with student and teacher assignments

### Attendance
- Manual attendance entry per group and date
- QR code scanner (camera-based auto-attendance)
- Barcode scanner with live display screen (prayer times, hadiths, clock)
- **Idle / kiosk display**: full-screen prayer-times screen that appears after inactivity, with the official Algerian (MWL) prayer method, an **azan sound** that plays automatically at each prayer time, a live **countdown to the next prayer**, and an **iqama countdown with progress bar** (with a blinking alert when the iqama time passes). All behavior (enable/disable, idle timeout, azan on/off, audio file path) is configurable from System Settings → شاشة الخمول.
- Teacher attendance log
- Guardian contact on absence

### Quran Memorization
- Session-based memorization tracking per student (سور + أجزاء)
- Homework assignment (per student or per group)
- 114 Quran surahs reference data

### Finance
- Student fee payments with session-based settings
- Teacher salary payments with per-teacher salary settings
- School expenses
- Donations

### Communication
- In-app notifications (manual + auto absence alerts)
- Web Push notifications (VAPID-based, PWA)
- Internal direct messaging between users
- Teacher group broadcast (📣 sends to all guardians in teacher's groups)
- Guardian portal: message teachers or admin directly

### Guardian Portal
- Dedicated dashboard for guardians (separate login flow)
- View child's attendance and memorization progress
- Contact teachers and school administration

### Courses Module
- Create and manage training courses (dates, capacity, price, status)
- Admin-enroll platform students
- Public self-registration form (`/coursereg`) — no login required
- Print enrolled + registered students list
- Toggle course registration on/off from settings

### Reports & Rankings
- Student ranking by memorization points per group
- Attendance and performance reports
- Printable student report cards and ranking tables

### Administration
- User and role management with granular permissions
- System settings (landing page, course registration toggle, **idle/kiosk display + azan settings**, etc.)
- JSON backup/restore (v4.0 — exports all 34 tables)
- Activity log (admin audit trail)
- Registration request approvals
- **Seasonal archive**: one-click archive of the current academic season's points/attendance counters and start of a new season (no data deleted; memorization/تسميع history stays permanent and follows each student).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Forms | react-hook-form + zod |
| Charts | recharts |
| Push | web-push (VAPID) |
| Package manager | pnpm |

---

## Getting Started

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
Edit `.env` and set at minimum:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

For Web Push notifications (optional):
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_SUBJECT=mailto:admin@yourschool.com
```

### 3. Initialize the database
```bash
pnpm db:migrate
```

### 4. Run the development server (port 13000)
```bash
pnpm dev
```

Open [http://localhost:13000](http://localhost:13000).

Default admin credentials after a fresh install or restore:
- Username: `admin`
- Password: `admin123`

---

## Database commands

```bash
pnpm db:generate   # Generate migrations from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## Build & deploy

```bash
pnpm build    # Production build
pnpm start    # Start on port 13000
```

See `DEPLOY_LOCAL.md` for full deployment instructions (localhost, Vercel, Cloudflare Workers).

---

## Verification status (Aug 2026)

Ran an exhaustive feature-by-feature audit against the live Neon preview database
(`ferdaousdb`). A minted admin session token was used to exercise the API surfaces;
public pages were checked over HTTP. Results:

### ✅ Verified working
- **Student & group modules**: list / detail / groups / absences, FD-number invariant (`FD0001` ↔ id 1).
- **Teacher & room & subject modules**: CRUD and assignment endpoints.
- **Attendance**: manual entry, student absences, teacher attendance, ranking by group, `students/export` (valid `.xlsx`) and `scan-logs/export` (CSV).
- **Barcode auto-attendance**: `POST /api/attendance/barcode` inserts on first scan (`inserted:true, duplicate:false`) and dedups on repeat (`inserted:false, duplicate:true`). Config keys present: `auto_attendance`, `barcode_*`, `schedule_sync_*`.
- **Courses**: list + public `/coursereg` self-registration (HTTP 200).
- **Guardian portal**: `/api/guardian/dashboard` returns only the guardian's students.
- **Communication**: messages (inbox/unread), notifications, activity logs.
- **Auth gating**: protected routes (`/api/students`, `/api/finance/fees`, `/api/settings`, `/api/users`, `/api/backup`, `/api/activity-logs`) all return **401** anonymously.
- **Public pages**: `/`, `/login`, `/register`, `/coursereg`, `/download` all render HTTP 200.
- `pnpm exec tsc --noEmit` passes; ESLint has **0 errors**; prod build is green after the idle-screen + azan work.
- **Idle/kiosk display + azan (new)**: prayer-time grid with a persistent "next prayer" countdown, an iqama countdown + progress bar shown only between adhan and iqama, a 5-second blinking alert when iqama passes, an always-glowing purple border on the prayer whose iqama window is active (moves to the next prayer when it ends), local adhan audio playback at each prayer time, and the new System Settings → شاشة الخمول tab (enable/disable, idle timeout, azan toggle, audio URL).

### ⚠️ Known issues & security findings (documented, NOT fixed in this pass)
1. **`GET /api/roles` is unauthenticated** — returns the full roles list (incl. permission arrays) to any visitor. Minor info leak; recommend gating it.
2. **`POST /api/scan-logs` is unauthenticated** — accepts scan payloads without a session (returns 400 only because data was missing). Should require a session.
3. **`GET /api/download/db` has no auth check** — it is meant for admins but does not verify a session. It currently returns 500 only because `pg_dump` is not installed in this environment. On a host with `postgres` binaries it would dump the DB unauthenticated. **Block external exposure / add an admin guard.**
4. **Guardian (any authenticated session) can read global endpoints** — `/api/dashboard/stats`, `/api/students`, and `/api/finance/fees` return full-scale data to any valid session, not just admins. The finance GET and dashboard endpoints are session-gated but not role-gated. **Restrict finance/dashboard/students reads to admin or explicit permissions.**
5. **Hardcoded SESSION_SECRET fallback** — `lib/auth.ts` falls back to `'fallback-dev-secret-change-in-prod'` when `SESSION_SECRET` is unset. Set a strong `SESSION_SECRET`/`AUTH_SECRET` in production.
6. **Orphan settings rows** — the DB contains `barcode_idle_enabled=true` / `barcode_idle_seconds=50` left over from a reverted idle-screen feature. Harmless (the UI no longer reads them), but stale.
7. **`.env` is excluded from the download zip** — the source-code package at `/ferdous-platform.zip` contains **no** secrets; deployers must `cp .env.example .env` and set their own `DATABASE_URL` / `AUTH_SECRET`.

Recommended hardening (future work, not applied here so as not to change auth architecture):
- Guard `/api/roles` and `POST /api/scan-logs` with `getSession()`.
- Guard `/api/download/db` with an admin-only check (or drop it and rely on the Neon console / JSON backup).
- Add role checks to finance + dashboard reads so guardians only see their own data.

---

## Project documentation

| File | Description |
|---|---|
| `agent.md` | Legacy AI agent architecture guide — rules, conventions, patterns |
| `docs/AI_HANDOFF.md` | Primary AI handoff: environment separation, invariants, workflow, testing, and promotion rules |
| `docs/ARCHITECTURE.md` | Application layers, route map, data vocabulary, synchronization, database integration, and critical flows |
| `docs/OPERATIONS.md` | Local/staging operations, secrets, testing, deployment, and troubleshooting |
| `scaffold.md` | Full directory structure + DB tables + role access matrix |
| `DEPLOY_LOCAL.md` | Step-by-step deployment guide |
| `USER_GUIDE.md` | End-user guide (Arabic) |
| `docs/AI_GUIDE.md` | Code conventions for AI-generated contributions |
| `RECOMMEND.md` | Recommended next steps, hardening, and improvement suggestions |

---

## Downloadable project

The **`/download` page and its files are preview-only** — they exist so you can fetch
the final source package from the preview environment, and they are **excluded
from the delivered project** (see `scripts/make-download-package.py`, which strips
`app/download`, `app/api/download`, and the zip itself before packaging).

The ready-to-run source package is served at **`/ferdous-platform.zip`**. It contains
the full codebase, migrations, and docs — **excluding** `/download`, `.env`,
`node_modules`, `.next`, `.git`, and build artifacts, so **no secrets are shipped**
and the download feature does not leak into deployments. Rebuild it anytime with:

```bash
python3 scripts/make-download-package.py
```

If you keep `/download` in a deployment, note that "تحميل قاعدة البيانات" calls
`/api/download/db`, which requires the `pg_dump` binary on the host (500 without it).
In preview it works for the source zip; prefer the in-app JSON backup or the SQL console
for a DB dump.

---

Based on vibe-web-template by HappySeeds.
Create with HappySeeds: https://happyseeds.ai
