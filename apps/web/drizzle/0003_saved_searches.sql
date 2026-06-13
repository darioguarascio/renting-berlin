CREATE TYPE "public"."saved_search_type" AS ENUM('listings', 'tenant_requests');--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "saved_search_type" NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"filter_hash" text NOT NULL,
	"notify_enabled" boolean DEFAULT true NOT NULL,
	"last_known_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "search_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"saved_search_id" text NOT NULL,
	"search_type" "saved_search_type" NOT NULL,
	"item_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_notifications" ADD CONSTRAINT "search_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_notifications" ADD CONSTRAINT "search_notifications_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_searches_user_hash_idx" ON "saved_searches" USING btree ("user_id","filter_hash");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_searches_type_idx" ON "saved_searches" USING btree ("type");--> statement-breakpoint
CREATE INDEX "search_notifications_user_idx" ON "search_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_notifications_user_unread_idx" ON "search_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "search_notifications_unique_item_idx" ON "search_notifications" USING btree ("saved_search_id","item_id");
