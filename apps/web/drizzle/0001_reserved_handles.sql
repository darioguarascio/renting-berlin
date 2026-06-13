CREATE TABLE IF NOT EXISTS "reserved_handles" (
	"handle" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reserved_handles" ADD CONSTRAINT "reserved_handles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "reserved_handles" ("handle", "user_id", "claimed_at")
SELECT "handle", "id", COALESCE("updated_at", "created_at", now())
FROM "users"
WHERE "handle" IS NOT NULL
ON CONFLICT ("handle") DO NOTHING;
