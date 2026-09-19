# Architecture Reference

## System shape

Ferdous is a server-backed Next.js application with an Arabic RTL user interface. Pages and API route handlers are colocated under the App Router. The server uses PostgreSQL through Drizzle ORM. The browser contains an offline-first IndexedDB layer for barcode attendance, while durable business data remains in PostgreSQL. The database connection is provided through the server-only `DATABASE_URL` environment variable and must never be placed in client code or committed files.

```text
Browser / PWA
  ├── App Router pages and React components
  ├── MobileLayout, Header, Sidebar, role-aware navigation
  ├── Barcode scanner + IndexedDB local queue
  ├── Web Push subscription and service worker
  └── API requests
          │
          ▼
Next.js route handlers: app/api/**/route.ts
  ├── session and permission checks
  ├── validation and business rules
  ├── Drizzle queries and transactions
  ├── internal notifications and Web Push dispatch
  └── JSON responses / downloads
          │
          ▼
PostgreSQL via db/index.ts and db/schemas/schema.ts
```

## Directory map

| Path | Responsibility | Typical change |
|---|---|---|
| `app/**/page.tsx` | Page UI and route entry points | Layout, form, table, dashboard behavior |
| `app/**/layout.tsx` | Page-level shells and access boundaries | Navigation or shared page framing |
| `app/api/**/route.ts` | Server endpoints | Validation, authorization, database mutation |
| `components/` | Shared UI and feature components | Sidebar, header, barcode display, overlays |
| `components/barcode-display/` | Barcode attendance station | Scan UI, local sync display, idle/prayer view |
| `db/index.ts` | Drizzle client and database access setup | Connection or shared query helper |
| `db/schemas/schema.ts` | PostgreSQL table definitions and inferred types | Schema changes, followed by migration |
| `db/migrations/` | SQL migrations and indexes | Generated or reviewed database changes |
| `lib/auth.ts` | Session, password, and role-related helpers | Authentication behavior |
| `lib/local-sync/` | IndexedDB persistence and synchronization | Offline attendance only; high risk |
| `lib/algeria-time.ts` | `Africa/Algiers` business-time utilities | Time-sensitive rules |
| `lib/push.ts`, `lib/web-push-cf.ts`, `lib/vapid.ts` | Push notification support | Subscription and delivery behavior |
| `public/` | Small static assets and PWA files | Icons, manifest, service worker, audio |
| `scripts/` | Maintenance and packaging scripts | Backups or source-package generation |
| `docs/` | Human and AI-maintainer documentation | Keep synchronized with behavior |

## Major business modules

### Identity and roles

Users authenticate through the platform's username/phone/password flow. User records are associated with domain records such as teachers and guardians. Authorization is implemented with session checks and permission helpers. The UI filters navigation items, but the server remains the authority.

### Students, guardians, teachers, and groups

Students have stable FD-number identifiers such as `FD0001`. A student may be linked to a guardian and assigned to a group. Teachers are linked to user accounts and may be assigned to groups and subjects. Groups are the central unit for schedules, attendance, rankings, and teacher responsibility.

### Attendance

Manual attendance, QR attendance, teacher attendance, and barcode attendance converge on attendance records. The barcode station can continue recording locally without connectivity. The sync process later reconciles local records with the server and can evaluate schedule-based late and absence thresholds for all selected groups.

The scan history shown in the barcode station is a display concern. It is intentionally bounded to ten visible rows, uses a thin scroll bar, and keeps the latest scan visible at the bottom. Do not use the scan-history list as the durable attendance source.

### Schedules

Schedules define group sessions, teacher/subject assignments, room usage, day, and start/end time. Schedule deletion is protected and supports validated bulk deletion. Schedule-based attendance decisions must use Algeria local time and must not depend on the machine's timezone.

### Memorization and ranking

Memorization sessions and homework represent the long-lived learning history. Seasonal archiving must not delete this history. Ranking and reports derive from memorization and attendance-related data according to the current business rules.

### Communication and notifications

Messages are directed between users or broadcast to the guardians associated with a teacher's groups. Internal notifications are database records. Web Push is an additional delivery channel and may fail independently when a browser subscription or VAPID configuration is missing.

### Registration requests

The registration-request page supports single and bulk operations. Bulk accept must reuse the existing creation semantics for student and guardian records. Bulk delete is a destructive operation and must be confirmed in the UI and authorized on the server.

### Academic seasons and archive

The academic season setting controls the active period. The archive endpoint creates an archival snapshot of season-specific counters and then advances the active season. It is intended to be repeat-safe. The current implementation uses Drizzle's `inArray` for PostgreSQL list predicates; this is important because interpolated `ANY` expressions previously produced invalid SQL.

### Idle display and prayer time

The barcode display includes an idle/kiosk mode with prayer information, configurable display settings, and local audio support. The adhan path is a web URL or a file served by the application; a browser deployment cannot directly read an arbitrary Windows path such as `C:\audio\adhan.mp3`. Prayer and schedule calculations must use the project's Algeria-time utilities.

## Important UI components

| Component | Role |
|---|---|
| `components/Sidebar.tsx` | Grouped role-aware navigation sections |
| `components/MobileLayout.tsx` | Mobile shell, drawer/backdrop, bottom navigation, safe-area spacing |
| `components/Header.tsx` | Header actions and responsive account controls |
| `components/barcode-display/BarcodeScannerPage.tsx` | Barcode station, scan log, sync feedback, idle display integration |
| `components/barcode-display/ScanOverlay.tsx` | Success/error/duplicate scan message card and backdrop |
| `components/barcode-display/PrayerDisplay.tsx` | Prayer grid, countdown, and adhan playback |
| `components/PushNotificationManager.tsx` | Client subscription setup and permission flow |
| `lib/local-sync/db.ts` | IndexedDB stores and local record operations |
| `lib/local-sync/sync.ts` | Queue reconciliation with server APIs |

## API conventions

API route handlers generally validate input, obtain a session, check permission, execute a Drizzle query or transaction, and return a JSON response using the existing response helpers. Collection endpoints use collection-level methods for bulk actions; item endpoints remain available for single-item flows.

Before adding an endpoint, search for an existing route serving the same resource. Before changing a response shape, search all callers, including the barcode station, dashboard, and background sync code. Keep error messages useful for logs but avoid returning secrets or sensitive internal details to clients.

## Database change workflow

1. Update `db/schemas/schema.ts`.
2. Generate a migration using the project's database command.
3. Read and review the generated SQL.
4. Apply schema changes only to the intended environment.
5. Verify the resulting columns, indexes, constraints, and affected APIs.
6. Add or update tests and document the migration.

Never use a destructive database operation as a test shortcut. Staging fixtures must be uniquely named, reversible, and removed after verification.

## Synchronization and database integration guide

This section describes the real synchronization contract between the barcode station, the browser's IndexedDB cache, Next.js route handlers, Neon PostgreSQL, and schedule-based status evaluation. These are two related but separate flows: **attendance upload** transfers scans from the station to the database, while **schedule reconciliation** evaluates students who have not scanned and may create late/absence records and guardian notifications.

### 1. How the application connects to PostgreSQL

The database client is defined in `db/index.ts`. It uses `@neondatabase/serverless` with Drizzle's Neon HTTP driver. The HTTP driver is intentional: it uses `fetch()` and is compatible with Vercel and Cloudflare-style runtimes, whereas a raw TCP PostgreSQL client is not suitable for edge isolates.

The connection string is read only on the server from `process.env.DATABASE_URL`. The Drizzle client is exposed through a lazy proxy, so the connection is not opened while the application bundle is being built or merely imported. At request time, the proxy resolves the Neon client and executes the Drizzle query. This keeps credentials out of browser bundles and avoids requiring a live database connection during static build steps.

| Layer | Implementation | Rule |
|---|---|---|
| Browser | `fetch()` to `/api/attendance/barcode` and `/api/attendance/sync-status` | Never access `DATABASE_URL` or PostgreSQL directly. |
| Next.js server | Route handlers under `app/api/**/route.ts` | Authenticate, validate, authorize, then query through `db`. |
| ORM | Drizzle ORM | Keep schema definitions and query predicates aligned with PostgreSQL. |
| Driver | Neon HTTP serverless driver | Use HTTP-based database access for deployment-runtime compatibility. |
| Database | Neon PostgreSQL | Durable source of truth for students, groups, schedules, attendance, and notifications. |

**Environment separation is mandatory.** The staging deployment must use the staging `DATABASE_URL`, and production must use its own production secret. Never copy a production connection string into local fixtures, client code, documentation, or a staging deployment. Schema changes must be applied to the intended database only and then verified against that same environment.

### 2. Local IndexedDB data model

The barcode station initializes the local engine through `initLocalSync()` in `lib/local-sync/sync.ts`. The native database is named `fdlatest-sync` and currently contains two object stores:

| Object store | Key | Contents | Purpose |
|---|---|---|---|
| `students` | `studentNumber` | Minimal student identity and group fields | Fast barcode lookup while the network is slow or unavailable. |
| `operations` | `operationId` | Student ID, ISO date, `present` status, creation time, attempt count, sync status, and last error | Durable local queue for attendance writes and duplicate protection across refreshes. |

The local student cache is refreshed from `GET /api/students?includeGroup=true`. The response is reduced to the minimal fields needed by the scanner and replaces the cache in one IndexedDB read/write transaction. A cache failure is non-fatal; it only disables local lookup until a later refresh.

A scan operation is assigned a unique `operationId`, stores the attendance date as `YYYY-MM-DD`, starts with `syncStatus: pending`, and is written to IndexedDB before the UI treats the scan as accepted. The local operation store is therefore the offline record for the station, but it is not the application's durable attendance database. The visible scan-history list is only presentation state and must never be used as the recovery queue.

### 3. Local-first scan lifecycle

The browser-side barcode flow is implemented in `components/barcode-display/BarcodeScannerPage.tsx` and `lib/local-sync/sync.ts`:

1. The scanner normalizes the barcode and checks the in-memory duplicate guard.
2. It looks up the student in the IndexedDB `students` store. If the cache is unavailable, the page may use the existing direct server lookup/fallback path.
3. It checks the local `operations` store for an operation for the same student and date, which prevents repeated local scans after a page refresh.
4. It creates an attendance operation with status `present` and writes it to IndexedDB.
5. The UI displays the scan result immediately. A background flush then sends the operation to `POST /api/attendance/barcode`.
6. If IndexedDB cannot be opened or the local write fails, the caller falls back to the direct cloud request. This preserves online operation without weakening the offline queue when IndexedDB is available.

The local queue is flushed immediately after enqueue, again shortly after initialization, every 15 seconds, and when the browser emits an `online` event. Only one flush runs at a time. Pending and previously failed operations are processed in creation order. Each attempt marks the operation as `syncing`, increments its attempt count, and sends only `{ studentId, date }` to the server; local identity fields are for the station cache and diagnostics, not for authoritative writes.

| Local state | Meaning | Next action |
|---|---|---|
| `pending` | Locally stored but not yet confirmed by the server | Retry during the next flush. |
| `syncing` | A request is currently being attempted | Do not start a second flush for the same engine. |
| `synced` | The server accepted the operation or confirmed the existing attendance | Keep as the station's local audit/recovery record. |
| `failed` | The operation reached the maximum of five attempts without success | Surface an error state and require operational follow-up or a later retry policy. |

The current engine records an error after a failed request, returns the operation to `pending` until five attempts have been reached, and exposes pending counts and an error state to the sync indicator. It does not silently delete failed operations.

### 4. Server-side barcode write and idempotency

`POST /api/attendance/barcode` is the authoritative write endpoint for a barcode scan. It first requires a valid session, parses `studentId` as a positive integer, and validates the date against the `YYYY-MM-DD` format. It then verifies that the student exists before touching attendance data.

The endpoint inserts an attendance row with `status: present` and a null schedule reference. The `attendances_student_date_unique` constraint on `(studentId, attendanceDate)` is the idempotency boundary. The insert uses `onConflictDoNothing`, so concurrent scanners and retried offline operations cannot create two attendance rows for one student on one date. If the row already exists, the endpoint updates it to `present` and clears notes, then returns `success: true` with `duplicate: true`. A newly inserted row returns `inserted: true`.

This behavior is important for recovery: a network timeout can leave the browser unsure whether PostgreSQL committed the insert. Retrying the same local operation is safe because the unique constraint converts the retry into a duplicate confirmation rather than a second attendance record. The current request body does not transmit `operationId`; idempotency is enforced by the server's student/date uniqueness rule, while `operationId` prevents duplicate work inside the local station.

### 5. Schedule reconciliation and automatic notifications

The page runs a separate schedule-sync loop once per minute. For each selected group, or for each group when the station is configured to process all groups, it posts `{ groupId, scannedStudentIds, date }` to `POST /api/attendance/sync-status`. This request is not the IndexedDB flush and must not be treated as one.

The endpoint performs the following server-side sequence:

1. It authenticates the session and loads `schedule_sync_enabled`, the late threshold, the absence threshold, and `holiday_mode` from the settings table.
2. It stops with a `skipped` response when synchronization is disabled, holiday mode is active, no group is supplied, or no schedule exists for the current Algeria-local weekday.
3. It obtains the current time through `getAlgeriaNow()` using `Africa/Algiers`, parses the schedule's `HH:MM` start time into minutes since midnight, and calculates elapsed minutes from the start of the class.
4. It loads all students linked to the group through `groupStudents` and loads their existing attendance rows for the requested date.
5. Students included in `scannedStudentIds` remain present. For unscanned students, the endpoint creates a `late` candidate after the late threshold and an `absent` candidate after the absence threshold. Existing `late` or `absent` states are not upgraded backwards; once the absence threshold is reached, a late record may be advanced to absent.
6. It upserts the attendance row. New automatic rows reference the active schedule and receive an explanatory note such as `غياب تلقائي (مزامنة الجدول)` or `تأخر تلقائي (مزامنة الجدول)`.
7. It resolves the student's `guardianUserId`, creates an in-app notification targeted only to that guardian, and checks the notifications table before inserting to avoid repeating the same automatic late/absence notification for that date and type.
8. It attempts Web Push delivery independently through `sendPushToUsers`. The response reports `updated`, `late`, `absent`, `pushSent`, `pushFailed`, and `pushCleaned`, so a successful attendance update remains distinguishable from a failed browser-push delivery.

The notification record is the internal delivery source of truth. Web Push is an additional channel and may fail because the guardian has no active subscription, the browser denied permission, the VAPID configuration is incomplete, or a stale subscription must be cleaned. A push failure must not roll back the attendance status or remove the in-app notification.

### 6. Time, dates, and request contracts

Business decisions use the project's `Africa/Algiers` utility rather than the server, browser, or database machine timezone. Schedule start times are interpreted as Algeria local `HH:MM` values. The attendance `date` sent by the browser is an ISO calendar date and is used in database predicates; callers must ensure it represents the same Algeria-local business day shown by the attendance screen.

| Contract | Required fields | Typical response |
|---|---|---|
| `POST /api/attendance/barcode` | `studentId: number`, `date: YYYY-MM-DD` | `success`, `inserted`, `duplicate`; HTTP 4xx for invalid or unauthorized input. |
| `POST /api/attendance/sync-status` | `groupId: number`, `scannedStudentIds: number[]`, `date: YYYY-MM-DD` | `skipped` with reason, or counts for attendance updates and push delivery. |
| `GET /api/students?includeGroup=true` | Current authenticated session | Minimal student cache source for barcode lookup. |

Do not move schedule decisions into the browser. The browser may provide the scanned ID set and display feedback, but the server must remain responsible for settings, schedule selection, threshold evaluation, guardian targeting, deduplication, and database writes.

### 7. Failure handling and troubleshooting sequence

When a scan appears locally but not in PostgreSQL, first inspect the sync indicator and pending/failed count, then inspect the browser network and console logs for `/api/attendance/barcode`. Confirm the session is valid, the student exists in the staging database, and the requested date is valid. If the operation is still pending, restore connectivity and allow the next flush; if it is failed after five attempts, investigate the recorded `lastError` before manually replaying or changing data.

When automatic late/absence updates are missing, verify that the barcode page is open and its one-minute loop is running, `schedule_sync_enabled` is true, holiday mode is off, the group has a schedule for the current Algeria-local weekday, and the thresholds have elapsed. Then inspect `/api/attendance/sync-status` responses. A response with `skipped` is an explicit diagnostic result, not necessarily an error. If attendance updates exist but `pushFailed` is nonzero, troubleshoot guardian subscription and VAPID configuration separately from the database logic.

When changing this subsystem, preserve the following invariants: **never lose a locally accepted scan because of a temporary network outage; never create duplicate attendance for one student/date; never target automatic notifications to unrelated guardians; never use a non-Algeria timezone for schedule decisions; and never allow staging code or tests to connect to production.**

## Data-flow examples

### Barcode scan

```text
Scanner input
  → normalize barcode
  → check local IndexedDB and in-memory duplicate set
  → show scan result immediately
  → queue durable attendance locally when offline
  → send to barcode endpoint when online
  → synchronize queued records later
  → evaluate group schedules and late/absence thresholds
  → create targeted internal notifications
  → attempt Web Push independently
```

### Bulk registration acceptance

```text
Admin selects request IDs
  → client asks for confirmation
  → collection API validates a bounded unique ID list
  → server checks administrator permission
  → only eligible pending requests are accepted
  → student/guardian creation flow runs without duplication
  → response reports accepted and skipped results
  → UI refreshes the request list
```

### Archive

```text
Admin starts archive
  → server verifies administrator permission
  → active season and selected records are loaded
  → archive snapshot is inserted or safely replaced
  → season-specific settings advance
  → response reports archived count
  → repeated request remains safe
```

## Change-risk guide

| Change area | Risk | Required verification |
|---|---|---|
| `lib/local-sync/**` | Very high | Offline scan, reconnect, deduplication, and server reconciliation |
| Auth and permissions | Very high | Anonymous, teacher/guardian, and admin requests |
| Archive and schedules | High | Database fixture, Algeria time, repeatability, and rollback review |
| Push delivery | High | Internal recipient targeting plus subscription/VAPID behavior |
| Dashboard/sidebar UI | Medium | Desktop, phone width, RTL, keyboard, touch, and route preservation |
| Scan overlay/log UI | Medium | Long history, latest-row visibility, overlay readability, and scanner flow |
| Static styling only | Low to medium | Lint, type check, and visual preview |
