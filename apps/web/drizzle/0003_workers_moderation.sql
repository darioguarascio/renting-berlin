CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."moderation_entity_type" AS ENUM('listing', 'tenant_request', 'image', 'message');--> statement-breakpoint
CREATE TYPE "public"."moderation_field" AS ENUM('title', 'description', 'photo', 'body', 'attachment');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
CREATE TABLE "moderation_results" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" "moderation_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"field" "moderation_field" NOT NULL,
	"score" double precision NOT NULL,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "moderation_results_entity_idx" ON "moderation_results" USING btree ("entity_type","entity_id");
