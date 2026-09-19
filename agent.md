# agent.md — منصة الفردوس

## What this project is

A full-featured Arabic Quran school management platform (**منصة الفردوس**) built with Next.js App Router.
It manages students, teachers, groups, attendance (manual / QR / barcode), Quran memorization tracking,
weekly schedules, finance (fees / salaries / expenses / donations), notifications (in-app + Web Push),
internal messaging, guardian portal, training courses, backup/restore, and admin settings.
The entire UI is RTL Arabic, mobile-first, wrapped in a PWA shell.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, server components) |
| Language | TypeScript — strict, no `@ts-ignore` |
| Database | PostgreSQL via Drizzle ORM + `postgres` driver |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Forms | react-hook-form + zod |
| Charts | recharts |
| Push notifications | web-push (VAPID) |
| Package manager | pnpm |
| Port | 13000 (dev and start) |

---

## Architecture rules

### Auth
- Sessions are base64-encoded JSON cookies named `session`, set as `httpOnly` for 7 days.
- `lib/auth.ts` provides `getSession()`, `createSessionToken()`, `hashPassword()`, `verifyPassword()`.
- Passwords are SHA-256 hex strings (no salt). Default admin password after any restore: `admin123`.
- `getSession()` falls back to a hardcoded secret (`'fallback-dev-secret-change-in-prod'`) when `SESSION_SECRET`/`AUTH_SECRET` is unset. **Set a strong secret in production.**
- `SessionUser.role` is a plain `string` — never an enum. Built-in roles: `admin`, `teacher`, `guardian`. Custom roles behave identically to `teacher` in the UI.

### Database
- One `postgres` client per request via React `cache()` — never a global singleton.
- All DB access goes through `db/index.ts`; never import `postgres` directly in pages or API routes.
- `db/schemas/schema.ts` is the single source of truth for all table definitions.
- Drizzle migrations live in `drizzle/` — run with `pnpm db:migrate`.
- `users.role` is `varchar(50)` — the legacy `user_role` enum still exists in DB but the column no longer uses it.

### Student numbering invariant
- Every student's `id` must equal the numeric part of their `studentNumber`.
- `FD0001` → `id = 1`, `FD0109` → `id = 109`, `FD0374` → `id = 374`.
- This is enforced on creation (auto-generate `studentNumber` from `id`) and on restore (remap old ids to FD numbers).
- Never break this invariant. Any restore script must remap all FK references (group_students, attendances, memorization_sessions, homework, fee_payments).

### API routes
- Every route must return JSON — never raw HTML — on error.
- Auth check pattern: `const session = await getSession(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`.
- Admin-only routes additionally check `session.role !== 'admin'`.
- Use `logActivity()` from `lib/activity.ts` after significant mutations (create / update / delete / login). Errors from `logActivity` are silently swallowed.
- Error handling: use `lib/errors.ts` classes (`AppError`, `ValidationError`, `UnauthorizedError`, `NotFoundError`) and `handleApiError()` for consistent error shapes.

### Layout / Role routing
- Every protected page has a `layout.tsx` that calls `getSession()` and redirects to `/login` if unauthenticated.
- Guardian sessions redirect to `/guardian-dashboard`.
- Custom roles get the teacher-style bottom nav and teacher-visible sidebar items.
- `MobileLayout` wraps all protected pages. The `role` prop accepts any string — custom roles use teacher-style nav (`role !== 'admin'`).

### Sidebar & Permissions
- `components/Sidebar.tsx` holds all nav items with `adminOnly` / `teacherVisible` / `permission` flags.
- `hasPermission(permissions, key)` from `lib/auth.ts` is used server-side in API guards.
- `/api/auth/me` returns `{ ...user, permissions: string[] }` — the client Sidebar reads this to show/hide items.
- Custom role permissions are stored as a JSON array in `roles.permissions`.

### Landing page
- Controlled by `settings.key = 'landing_enabled'` (value `'true'` / `'false'`).
- `app/page.tsx` reads this setting: if enabled renders `<LandingPage>`, otherwise redirects to `/login`.
- `/api/landing` is a public endpoint (no auth) that returns landing page settings.

### Courses module
- `courses` table stores training courses (name, dates, capacity, price, status).
- `course_students` stores admin-enrolled platform students (FK to students.id).
- `course_registrations` stores public self-registration requests via `/coursereg` (no login required).
- `/courses` page is admin-only (`courses.manage` permission); shows enrolled + registrations with print button.
- `/coursereg` is the public-facing registration form; controlled by `settings.course_registration_enabled`.
- Education levels: 14 values from أولى ابتدائي → ثالثة ثانوي + جامعي + غير ذلك.

### Messaging
- Internal messages between users stored in `messages` table.
- Teachers can broadcast to all guardians of their groups via `POST /api/messages/broadcast`.
- Guardians can message teachers (role=teacher) and admin roles (admin/supervisor/manager).
- Guardian dashboard has two separate compose modals: مراسلة معلم and مراسلة الإدارة.

### Backup / Restore
- Backup version: **4.0**. Exports **25 tables** including courses/course_students/course_registrations/notifications/messages.
- Restore remaps student ids to FD numbers, fixes all FK references, resets admin passwords to `admin123`, and syncs all sequences.
- TRUNCATE in restore includes: `course_registrations, course_students, courses` (added in v4.0).
- The backup API is at `GET /api/backup` (export) and `POST /api/backup` (restore).

### Push notifications
- VAPID keys must be set in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`.
- `lib/vapid.ts` reads them at runtime (not build time) to avoid baking empty strings.
- `web-push` is in `serverExternalPackages` in `next.config.ts` — keep it there.
- Subscriptions stored in `push_subscriptions` table. Expired endpoints (410/404) are auto-cleaned on send.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `VAPID_PUBLIC_KEY` | For push | Server-side public key |
| `VAPID_PRIVATE_KEY` | For push | Server-side private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Client-side public key (same value as `VAPID_PUBLIC_KEY`) |
| `VAPID_SUBJECT` | For push | `mailto:` or `https://` URI |

---

## Key conventions

- All DB column names are `snake_case`; TypeScript fields are `camelCase` (Drizzle maps automatically).
- Dates stored as `date` columns use ISO string `YYYY-MM-DD` in API responses.
- Timestamps use ISO 8601 with `Z` suffix.
- Arabic text direction: the root `<html>` has `dir="rtl" lang="ar"`.
- Font: Cairo (Google Fonts) loaded via `next/font`.
- Never add `notranslate` or disable browser translation globally.
- Print/PDF: use `window.open` + `document.write` + `win.print()` pattern — no PDF libraries.
- Never use hand-written SQL for migrations; always use `pnpm db:generate` then `pnpm db:migrate`.

---

## Academic season archive

- Season boundary lives in settings `academic_season_start` (ISO `YYYY-MM-DD`); default `1970-01-01` so all historical data counts until an admin archives. Season-scope helpers: `lib/academic-season.ts` (`getSeasonStart`, `afterSeasonStart`).
- Seasonal counters (points, present/absent/late/excused, memo sessions) are **computed on the fly** and filtered by `>= season_start`, **not** stored/deleted per row.
- `POST /api/academic-year/archive` (admin-only) snapshots each student's season counters into `student_season_archive`, then advances `academic_season_start` to today and rolls `academic_year` forward. It never deletes attendance or memorization rows — memorization/تسميع history stays permanent and follows each student.
- Season-scoped aggregates: `lib/ranking.ts`, `GET /api/dashboard/top-students`, `GET /api/students/[id]/absences`, `GET /api/guardian/dashboard`. All-time history views remain unscoped.
- UI: Settings page, "📅 الموسم الدراسي والأرشفة" tab (archive button + confirmation).
- Backups include `student_season_archive` in both export and restore.
- Prayer times (barcode display, `components/barcode-display/PrayerDisplay.tsx`): fixed to the mosque at **Debila, El Oued** (33.5056745°N, 6.9379105°E, tz `Africa/Algiers`). Uses **MWL** (Fajr 18°, Isha 17° — the official Algerian ministry method) plus minute offsets (fajr +1, asr +3, maghrib +4, isha +2) so the computed times match the mosque's published Mawaqit schedule. `adhan` v4 has no built-in Algeria method.

## Adding a new feature — checklist

1. Add table to `db/schemas/schema.ts` → run `pnpm db:generate` then `pnpm db:migrate`.
2. Add API route under `app/api/<feature>/route.ts` — always return JSON, always check session.
3. Add page under `app/<feature>/page.tsx` with a `layout.tsx` that guards the session.
4. If the page needs sidebar access, add it to `components/Sidebar.tsx` under the appropriate role block.
5. If data must survive backup/restore, add the table to both export (GET) and restore (POST) blocks in `app/api/backup/route.ts`.
6. Run `pnpm build` — fix all TypeScript errors before committing.

---

## Security audit findings (Aug 2026 — documented, to fix)

Audited against the live preview DB. The following are confirmed gaps; they are
**documented here but intentionally not changed** in the last pass to respect the
"do not change auth architecture" constraint. New work should not broaden them.

| # | Endpoint | Issue | Recommended fix |
|---|---|---|---|
| 1 | `GET /api/download/db` | No auth check (500 here only because `pg_dump` is absent) | Require `session.role === 'admin'` |
| 2 | `POST /api/scan-logs` | Accepts payloads with no session | Add `getSession()` guard |
| 3 | `GET /api/roles` | Returns role + permission data anonymously | Add `getSession()` guard |
| 4 | `GET /api/finance/*`, `GET /api/dashboard/stats`, `GET /api/students` | Any valid session (incl. guardian) reads full data | Gate reads by admin / permission |
| 5 | `lib/auth.ts` | Hardcoded SESSION_SECRET fallback | Fail fast when unset in prod |

Test pattern used for the audit: a signed admin session token (`createSessionToken`)
against `http://localhost:13000`, asserting 200/401 codes per endpoint, plus verified
dedup on `POST /api/attendance/barcode` (`inserted:true` → `duplicate:true` on repeat).
