ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_notifications_visit_at" timestamp with time zone;--> statement-breakpoint
DROP TABLE IF EXISTS "search_notifications";
