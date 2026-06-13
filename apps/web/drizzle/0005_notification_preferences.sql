CREATE TYPE "public"."email_digest" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"notify_messages" boolean DEFAULT true NOT NULL,
	"notify_saved_searches" boolean DEFAULT true NOT NULL,
	"notify_profile_views" boolean DEFAULT true NOT NULL,
	"notify_listing_updates" boolean DEFAULT true NOT NULL,
	"notify_product_news" boolean DEFAULT false NOT NULL,
	"email_digest" "email_digest" DEFAULT 'instant' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"accept_inquiries" boolean DEFAULT true NOT NULL,
	"preferred_contact_hours" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
