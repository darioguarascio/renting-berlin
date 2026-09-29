CREATE TABLE IF NOT EXISTS "listing_archives" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_archives" ADD CONSTRAINT "listing_archives_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_archives_listing_id_idx" ON "listing_archives" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_archives_archived_at_idx" ON "listing_archives" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_archives_reason_idx" ON "listing_archives" USING btree ("reason");
