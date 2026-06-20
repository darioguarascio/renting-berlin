ALTER TABLE "users" ADD COLUMN "last_offers_visit_at" timestamp with time zone;

CREATE INDEX "listings_active_published_at_idx" ON "listings" ("published_at")
WHERE "status" = 'active' AND "moderation_status" = 'approved';
