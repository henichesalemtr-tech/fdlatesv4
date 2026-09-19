-- ─────────────────────────────────────────────────────────────────────────────
-- Performance indexes + default settings (idempotent, safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_sender      ON notifications (sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type        ON notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created     ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_type ON notifications (target_type);

-- Notification reads
CREATE INDEX IF NOT EXISTS idx_notification_reads_notif  ON notification_reads (notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user   ON notification_reads (user_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread  ON messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender           ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created          ON messages (created_at DESC);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendances_date          ON attendances (attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_student_date  ON attendances (student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status        ON attendances (status);

-- Memorization
CREATE INDEX IF NOT EXISTS idx_memo_sessions_student     ON memorization_sessions (student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_memo_sessions_group       ON memorization_sessions (group_id);
CREATE INDEX IF NOT EXISTS idx_memo_sessions_teacher     ON memorization_sessions (teacher_id);

-- Mapping tables (join optimisation)
CREATE INDEX IF NOT EXISTS idx_group_students_group      ON group_students (group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student    ON group_students (student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_teacher    ON teacher_groups (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_group      ON teacher_groups (group_id);

-- Students / users lookups
CREATE INDEX IF NOT EXISTS idx_students_guardian_user    ON students (guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_students_status           ON students (status);
CREATE INDEX IF NOT EXISTS idx_users_teacher             ON users (teacher_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user   ON push_subscriptions (user_id);

-- Default: automatic withdrawal after N absences
INSERT INTO settings (key, value)
VALUES ('auto_withdraw_absences', '5')
ON CONFLICT (key) DO NOTHING;
