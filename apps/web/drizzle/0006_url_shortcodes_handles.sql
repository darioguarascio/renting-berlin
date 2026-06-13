ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "short_code" text;--> statement-breakpoint
UPDATE "listings" SET "short_code" = substr(replace(id, '-', ''), 1, 8) WHERE "short_code" IS NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listings_short_code_idx" ON "listings" USING btree ("short_code");--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN IF NOT EXISTS "handle" text;--> statement-breakpoint
UPDATE "tenant_requests" SET "handle" = regexp_replace(regexp_replace(slug, '^seeker-', ''), '-', '_', 'g') WHERE "handle" IS NULL;--> statement-breakpoint
UPDATE "tenant_requests" SET "handle" = 'user_' || substr(id, 1, 6) WHERE "handle" IS NULL OR length("handle") < 3;--> statement-breakpoint
ALTER TABLE "tenant_requests" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_requests_handle_idx" ON "tenant_requests" USING btree ("handle");
