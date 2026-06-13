-- Move handle from seeker profiles to user accounts
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "handle" text;--> statement-breakpoint

UPDATE "users" u
SET "handle" = sub."handle"
FROM (
  SELECT DISTINCT ON (tr."seeker_id") tr."seeker_id", tr."handle"
  FROM "tenant_requests" tr
  WHERE tr."handle" IS NOT NULL
  ORDER BY tr."seeker_id", tr."updated_at" DESC
) sub
WHERE u."id" = sub."seeker_id" AND u."handle" IS NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_handle_idx" ON "users" ("handle");--> statement-breakpoint

-- Profile views keyed by account, not seeker profile
CREATE TABLE IF NOT EXISTS "profile_views" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_user_id" text NOT NULL,
  "viewer_id" text NOT NULL,
  "first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

INSERT INTO "profile_views" ("id", "profile_user_id", "viewer_id", "first_viewed_at", "last_viewed_at")
SELECT
  min(trv."id"),
  tr."seeker_id",
  trv."viewer_id",
  min(trv."first_viewed_at"),
  max(trv."last_viewed_at")
FROM "tenant_request_views" trv
INNER JOIN "tenant_requests" tr ON tr."id" = trv."request_id"
GROUP BY tr."seeker_id", trv."viewer_id";--> statement-breakpoint

DROP TABLE IF EXISTS "tenant_request_views";--> statement-breakpoint

ALTER TABLE "profile_views" DROP CONSTRAINT IF EXISTS "profile_views_profile_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" DROP CONSTRAINT IF EXISTS "profile_views_viewer_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profile_views_profile_viewer_idx" ON "profile_views" ("profile_user_id", "viewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_views_profile_user_idx" ON "profile_views" ("profile_user_id");--> statement-breakpoint

DROP INDEX IF EXISTS "tenant_requests_handle_idx";--> statement-breakpoint
ALTER TABLE "tenant_requests" DROP COLUMN IF EXISTS "handle";
