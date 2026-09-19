# Operations and Contribution Guide

## Environment separation

Use the staging repository and deployment for experimentation. Use the production repository only for approved promotion.

| Concern | Staging | Production |
|---|---|---|
| Git repository | `henichesalemtr-tech/fdebila-demo` | `henichesalemtr-tech/fdlatestv3` |
| Vercel environment | `fdebila.vercel.app` | Production Vercel project/domain |
| Database | Authorized Neon test database | Production database; never substitute staging credentials |
| Purpose | Develop, test, and review | Serve real users |
| Promotion | Explicitly reviewed | Explicit approval required |

Do not assume that a project name or Vercel alias identifies the correct environment. Verify the project metadata and linked repository before deploying. Never use production data for a test fixture.

## Local setup

The project uses pnpm and requires Node.js compatible with the repository's package configuration. A normal local setup is:

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Set `DATABASE_URL` in the untracked `.env` file. Add Web Push variables only when testing push delivery. Keep `.env` out of Git. The development command and port should come from the package scripts or hosting environment; do not hardcode a port in server code.

Useful commands are:

```bash
pnpm exec eslint <changed-files>
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm start
git diff --check
```

Run the smallest relevant check after each edit, then run the full available suite before promotion. If a build fails in an unrelated pre-existing route, record the exact route and error rather than claiming a green build.

## Environment variables

The following names are used by the application. Values belong in Vercel project settings or an untracked local environment file.

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | Server only | PostgreSQL connection string |
| `SESSION_SECRET` | Server only | Session signing fallback/configuration |
| `AUTH_SECRET` | Server only, if used by the deployment | Authentication secret convention |
| `VAPID_PUBLIC_KEY` | Server | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server only | Web Push private key |
| `VAPID_SUBJECT` | Server | Web Push contact subject, normally a mailto URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | Public key needed to subscribe to Web Push |
| `NEXT_PUBLIC_API_URL` | Browser, if configured | Public API origin override |
| `REACTUS_BASE_URL` | Server, if configured | External auth/service base URL used by the project |
| `PROJECT_ID` | Server, if configured | Deployment/application identifier |

Never expose `DATABASE_URL`, `SESSION_SECRET`, `AUTH_SECRET`, or `VAPID_PRIVATE_KEY` through a `NEXT_PUBLIC_` variable. After changing Vercel secrets, redeploy the intended environment and verify the deployment target.

## Login and role testing

For a protected page, test the following matrix where relevant:

| Actor | Expected behavior |
|---|---|
| Anonymous visitor | Redirect or `401`, depending on the route contract |
| Administrator | Full access permitted by configured permissions |
| Teacher | Only teacher-appropriate groups, attendance, messaging, and teaching features |
| Guardian | Only the guardian portal and records belonging to linked children |

Use test credentials only in a secure local or staging session. Do not paste real passwords into documentation, source, logs, or screenshots. A UI that hides an action is not evidence that the server rejects it.

## Attendance and synchronization testing

To test barcode attendance safely, prepare a staging fixture with a unique student or request identifier. Confirm all of the following:

- first scan is inserted and shown as successful;
- repeated scan is treated as a duplicate;
- offline scans are retained in IndexedDB;
- reconnecting sends queued records without duplication;
- no selected group can synchronize all eligible groups when that is the configured behavior;
- schedule thresholds use `Africa/Algiers` local time;
- late and absence internal notifications target the affected guardian;
- Web Push is reported independently from internal notification creation;
- a growing history remains bounded and keeps the newest record visible.

Remove test fixtures after the run. Do not clear an entire table to make a test pass.

## Registration-request operations

Bulk registration actions are destructive or identity-creating operations and should be tested with unique staging requests. Verify that invalid, duplicate, empty, and non-array ID inputs are rejected or safely normalized. Verify that acceptance is idempotent and that a second attempt does not create duplicate students or guardians. Verify that bulk deletion requires administrator authorization and explicit UI confirmation.

## Academic-season archive operations

Before changing archive logic, inspect the active season, the expected archive row count, and the relevant student/group records. Run the archive in staging, verify the response and database effects, then run it a second time to confirm repeat safety. Do not treat an archive as successful merely because the HTTP status is `200`; check the archived records and the active-season setting.

Archive changes should preserve memorization history, avoid unrelated deletes, and use parameter helpers that generate valid PostgreSQL predicates. If a migration is required, apply it to the intended database only and document it.

## Vercel deployment procedure

For staging:

1. Confirm the current branch and remote are `fdebila-demo`.
2. Confirm the Vercel project and alias belong to staging.
3. Confirm `DATABASE_URL` points to the authorized Neon test database in Vercel secrets.
4. Push the tested staging commit.
5. Wait for the deployment to become `READY`.
6. Open the staging URL, test login, and inspect the affected workflow.
7. Report the deployment URL, commit SHA, tests, and known issues.

For production, stop after the report unless the user explicitly approves promotion. When promoting, use a selective commit or carefully staged files. Verify the final SHA on the remote branch. Never force-push production as a shortcut.

## Backups and sensitive data

Use the application's JSON backup or the database provider's backup facilities as appropriate. Treat SQL dumps, JSON exports, guardian information, credentials, cookies, and phone numbers as sensitive. Do not commit database dumps or place them in downloadable source packages. If a backup is used for testing, keep it outside Git and delete temporary copies when no longer required.

## Troubleshooting checklist

When login appears to do nothing, inspect the browser console, network response, session cookie attributes, server logs, database connection, and redirect behavior. When a deployment cannot be found, verify the Vercel team and project ID rather than assuming the project name is unique. When a database query fails, capture the generated SQL or database error in a private log and check whether a Drizzle expression is expanding into the intended PostgreSQL syntax. When a mobile layout shifts as a list grows, bound the list's scroll container and keep the primary surface independent of its content height.

## Documentation maintenance

When behavior changes, update the relevant architecture and operations section in the same change. Keep the top-level README's feature list and known-issues section synchronized. Add a short entry to `todo.md` for unfinished work. Documentation should describe observed behavior, not intended behavior that has not been tested.
