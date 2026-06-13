CREATE TYPE "public"."seeker_visibility" AS ENUM('everyone', 'visited_listings', 'favorited_listings', 'messaged_listings', 'nobody');--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "visibility" "seeker_visibility" DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
UPDATE "tenant_requests" SET "visibility" = 'everyone' WHERE "landlords_only" = false;--> statement-breakpoint
UPDATE "tenant_requests" SET "visibility" = 'everyone' WHERE "landlords_only" = true;--> statement-breakpoint
ALTER TABLE "tenant_requests" DROP COLUMN "landlords_only";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_views" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"viewer_id" text NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_views_listing_viewer_idx" ON "listing_views" USING btree ("listing_id","viewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_views_viewer_idx" ON "listing_views" USING btree ("viewer_id");
