# AI Handoff Guide — Ferdous Quran School Platform

## Purpose

This document is the first file an AI coding agent should read before changing the project. The application is an Arabic-first, right-to-left platform for managing Quran schools. It contains production-sensitive attendance, guardian communication, financial, authentication, and academic-season data. The safe default is to inspect first, test in the staging environment, and never promote a change to production without explicit approval from the project owner.

## Source of truth and environment model

There are two important Git repositories:

| Environment | Repository | Purpose | Safe default |
|---|---|---|---|
| Staging | `henichesalemtr-tech/fdebila-demo` | Trial implementation and browser verification | Implement and test here first |
| Production | `henichesalemtr-tech/fdlatestv3` | Main release source | Do not push without explicit approval |

The agreed staging deployment is `https://fdebila.vercel.app`. The production deployment and domain are separate operational concerns. A staging change is not considered production-ready merely because it builds; it must also be tested against the staging database and relevant browser flows.

The staging database is an authorized Neon test database. Its connection string is a secret and must only be configured as `DATABASE_URL` in the deployment environment. Never place credentials in source files, documentation, screenshots, client-side code, commit messages, or test fixtures.

## First actions for any AI agent

Before editing code, the agent should:

1. Read this file, `README.md`, `docs/ARCHITECTURE.md`, and `docs/OPERATIONS.md`.
2. Read the nearest `AGENTS.md` if one exists.
3. Inspect `git status`, the current branch, and the configured remote before touching files.
4. Add the requested work to `todo.md` as unchecked items.
5. Identify the staging or production target explicitly. If the user says "test", use staging. If the user says "push to main", confirm that they mean the production repository before doing so.
6. Preserve existing unrelated local work. Stage only files belonging to the requested change.

## Technology and conventions

The main application uses Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, shadcn/ui/Radix components, React Hook Form, Zod, and pnpm. The application is RTL and Arabic-first. Server routes live under `app/api/**/route.ts`; page routes live under `app/**/page.tsx`; reusable UI lives under `components/`; database schema and access are under `db/`; cross-cutting logic is generally under `lib/`.

Use the existing database client and helpers. Do not create a second database connection pattern. Follow the existing response, error, logging, permission, and timezone utilities rather than introducing local alternatives.

## High-risk invariants

### Authentication and authorization

The platform has role-aware accounts for administrators, teachers, guardians, and other configured roles. A user session is not equivalent to administrator access. Every new read or write route must identify its required permission and enforce it on the server. Client-side hiding of a button is not authorization.

Never weaken an existing permission check to make a UI flow easier. When changing an admin flow, test an anonymous request, a normal authenticated user, and an administrator where practical.

### Attendance and offline-first behavior

Barcode attendance is intentionally offline-first. The browser stores scan and attendance state in IndexedDB and synchronizes later when connectivity returns. Changes to `components/barcode-display/BarcodeScannerPage.tsx`, `lib/local-sync/**`, barcode APIs, or scan-log behavior must preserve:

- local persistence when the network is unavailable;
- deduplication of repeated scans;
- retry and reconciliation behavior when the network returns;
- the Algeria timezone used for schedule and attendance decisions;
- all-group synchronization when no single group is selected.

Do not replace IndexedDB with a direct network-only request. Do not make a visual change dependent on a successful database write unless the existing flow already does that.

### Timezone

Business time is Algeria local time (`Africa/Algiers`). Attendance thresholds, schedules, late/absence decisions, prayer display behavior, and user-visible time calculations must use the existing Algeria-time utility. Do not use server-local time or browser-local time for business decisions.

### Notifications

There are internal notifications and Web Push notifications. Internal notification recipients must be selected by the business rule, especially for automatic absence or late alerts: the affected student's guardian(s), not every user. Web Push requires valid VAPID configuration and a stored browser subscription. A successful internal notification does not prove that Web Push delivery succeeded.

### Academic-season archive

Archiving is a data-preserving operation. It records the current season's relevant counters and history and starts the next season; it must not delete memorization history or unrelated student data. The archive API is administrator-protected and must remain idempotent for repeated requests. Drizzle array predicates should use the project's validated `inArray` pattern; do not reintroduce raw `ANY` interpolation that expands incorrectly.

### Registration requests

Registration requests have collection-level bulk accept and bulk delete behavior. Bulk accept must validate IDs, act only on eligible pending requests, preserve the existing student/guardian creation flow, and prevent duplicate creation. Bulk delete must validate IDs, require administrator authorization, and require explicit confirmation in the UI.

## UI guidelines

The application is used on desktop attendance stations and mobile phones. Preserve RTL direction, keyboard focus, readable contrast, and touch targets of practical size. For mobile changes, check the dashboard and barcode pages at narrow widths as well as desktop widths. A growing list must be isolated in its own bounded scroll container so it cannot move or resize the primary action surface unexpectedly.

For transient scan messages, keep the message card above its backdrop. A backdrop may dim or blur the scanner view, but it must not intercept scanner interactions unexpectedly or make the result unreadable.

## Testing expectations

At minimum, run the narrowest relevant checks and then the project checks that are available:

```bash
pnpm exec eslint <changed-files>
pnpm exec tsc --noEmit
git diff --check
pnpm test
pnpm build
```

For database-affecting work, use a uniquely identifiable test fixture in staging, verify the result, and remove only the fixture records. Never seed or delete production data while testing. For authentication and user-targeting behavior, verify the actual response recipients and authorization status rather than relying only on UI appearance.

## Promotion workflow

The preferred flow is:

1. Implement in `fdebila-demo`.
2. Test locally against the authorized staging database.
3. Deploy to `fdebila.vercel.app` and verify the browser flow.
4. Report the exact files, tests, deployment, and known limitations.
5. Wait for explicit approval before promoting to `fdlatestv3`.
6. When promoting, copy or cherry-pick only the tested files/commit and inspect the staged file list before pushing.
7. Re-run validation in the primary clone and verify the final remote commit.

Do not use `git reset --hard`, force-push, or destructive database commands as a shortcut. If a rebase is needed, preserve unrelated local work with a reversible stash and inspect the result.

## Secret and data handling

Never commit `.env`, database URLs, passwords, VAPID private keys, session secrets, access tokens, cookies, or real guardian credentials. Use deployment secret settings or a local untracked `.env` file. Do not copy real database dumps into a Git repository. Treat screenshots and logs as potentially sensitive.

## What to report after a change

A useful AI handoff report should state the environment changed, the exact files and behavior changed, validation commands and results, database fixtures created and removed, deployment URL and status, remaining known issues, and whether anything was pushed to production. If the user did not explicitly approve production promotion, say clearly that the primary repository remains unchanged.

## Known maintenance priorities

The existing project documentation records several security and maintenance findings. Future agents should review them before broadening access: unauthenticated or insufficiently role-gated endpoints, secure session-secret configuration, stale settings keys, backup/download exposure, and coverage for prayer-time, archive, attendance-sync, and notification behavior. Do not silently mark these findings fixed without a focused test and a documented change.

## Final rule

When uncertain, stop before changing production data or production code. Ask a focused question, or make the smallest reversible change in staging and report what was observed.
