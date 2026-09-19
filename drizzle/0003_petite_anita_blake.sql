CREATE TABLE "student_season_archive" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"academic_year" varchar(50),
	"season_start" date,
	"season_end" date,
	"total_points" integer DEFAULT 0,
	"total_present" integer DEFAULT 0,
	"total_absent" integer DEFAULT 0,
	"total_late" integer DEFAULT 0,
	"total_excused" integer DEFAULT 0,
	"memo_sessions_count" integer DEFAULT 0,
	"archived_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "student_season_archive" ADD CONSTRAINT "student_season_archive_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;