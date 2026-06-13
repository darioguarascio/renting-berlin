DO $$ BEGIN
  CREATE TYPE "message_template_kind" AS ENUM('inquiry', 'outreach', 'general');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "conversations" ALTER COLUMN "listing_id" DROP NOT NULL;

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "tenant_request_id" text;

DO $$ BEGIN
  ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_tenant_request_id_tenant_requests_id_fk"
    FOREIGN KEY ("tenant_request_id") REFERENCES "tenant_requests"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_listing_inquirer_idx"
  ON "conversations" ("listing_id", "inquirer_id")
  WHERE "listing_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_seeker_inquirer_idx"
  ON "conversations" ("tenant_request_id", "inquirer_id")
  WHERE "tenant_request_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "message_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "label" text NOT NULL,
  "body" text NOT NULL,
  "kind" "message_template_kind" DEFAULT 'general' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "message_templates_user_idx" ON "message_templates" ("user_id");
