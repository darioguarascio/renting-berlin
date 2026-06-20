ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_offers_visit_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "listings_active_published_at_idx" ON "listings" ("published_at")
WHERE "status" = 'active' AND "moderation_status" = 'approved';
