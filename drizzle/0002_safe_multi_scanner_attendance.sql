-- Safe multi-scanner attendance migration.
-- This migration NEVER deletes or modifies existing attendance rows.
-- It stops before adding the unique constraint if duplicate student/date rows exist.

DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_groups
  FROM (
    SELECT student_id, attendance_date
    FROM attendances
    GROUP BY student_id, attendance_date
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Migration stopped safely: % duplicate attendance group(s) exist for student_id + attendance_date. No data was deleted or modified.',
      duplicate_groups;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendances_student_date_unique'
      AND conrelid = 'public.attendances'::regclass
  ) THEN
    ALTER TABLE "public"."attendances"
      ADD CONSTRAINT "attendances_student_date_unique"
      UNIQUE ("student_id", "attendance_date");
  END IF;
END $$;
