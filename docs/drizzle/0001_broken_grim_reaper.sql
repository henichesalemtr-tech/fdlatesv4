CREATE TYPE "public"."notification_type" AS ENUM('auto_absence', 'auto_late', 'manual');--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" integer,
	"device_id" varchar(255),
	"read_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "registration_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"gender" varchar(10),
	"birth_date" date,
	"birth_place" varchar(100),
	"address" text,
	"phone" varchar(20),
	"educational_level" varchar(100),
	"guardian_name" varchar(150),
	"guardian_phone" varchar(20),
	"guardian_relation" varchar(50),
	"guardian_email" varchar(150),
	"notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"accepted_student_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"scan_type" varchar(10) DEFAULT 'barcode' NOT NULL,
	"scan_date" date NOT NULL,
	"scan_time" varchar(10),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "notification_type" varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;