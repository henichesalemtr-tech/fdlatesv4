-- READ-ONLY diagnostic. This does not modify the database.
SELECT
  student_id,
  attendance_date,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY id) AS attendance_ids
FROM attendances
GROUP BY student_id, attendance_date
HAVING COUNT(*) > 1
ORDER BY attendance_date, student_id;
