DO $$ BEGIN
  CREATE TYPE "listing_source" AS ENUM('native', 'external');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "source_type" "listing_source" DEFAULT 'native' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "external_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "external_provider" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "external_source_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "external_synced_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listings_external_source_idx" ON "listings" ("external_provider","external_source_id") WHERE "external_source_id" IS NOT NULL;
