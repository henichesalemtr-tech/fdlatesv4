# Multi-Scanner Attendance — Safe Migration

This version is designed to run against the existing PostgreSQL/Neon database.

## Safety

- No existing attendance row is deleted or rewritten by the migration.
- The migration first checks for duplicate `(student_id, attendance_date)` rows.
- If duplicates exist, the migration stops with an error before adding the constraint.
- If no duplicates exist, it adds `attendances_student_date_unique`.
- The application uses an atomic barcode endpoint so simultaneous scanners cannot create duplicate attendance rows.

## Apply

1. Back up the production database first.
2. Confirm `DATABASE_URL` points to the existing production database.
3. From the project root run:

```
pnpm db:migrate
```

Or, if the project is managed with npm:

```
npx drizzle-kit migrate
```

Do not create a new database and do not run the backup seed endpoint.

## Optional read-only duplicate check

The file `drizzle/scripts/check-attendance-duplicates.sql` is diagnostic only. It does not modify data.

## Scanner setup

Use one browser/device per scanner station when possible. Each station can open the same `/barcode-attendance` page and submit to the same server/database. The database constraint and atomic barcode API protect against simultaneous requests.
