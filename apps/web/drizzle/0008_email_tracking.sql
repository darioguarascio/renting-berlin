CREATE TYPE "email_tracking_event_type" AS ENUM('open', 'click');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_sends" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"to_email" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_tracking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"send_id" text NOT NULL,
	"type" "email_tracking_event_type" NOT NULL,
	"link_index" integer,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_send_id_email_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."email_sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_sends_user_idx" ON "email_sends" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_sends_category_idx" ON "email_sends" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_sends_created_at_idx" ON "email_sends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tracking_events_send_idx" ON "email_tracking_events" USING btree ("send_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tracking_events_type_idx" ON "email_tracking_events" USING btree ("type");
