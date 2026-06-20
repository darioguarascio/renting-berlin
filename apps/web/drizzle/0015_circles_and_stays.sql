DO $$ BEGIN
 CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."stay_offer_status" AS ENUM('open', 'taken', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."stay_offer_visibility" AS ENUM('connections', 'selected');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."stay_claim_status" AS ENUM('interested', 'accepted', 'declined', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text NOT NULL,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"status" "connection_status" DEFAULT 'accepted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connection_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"inviter_id" text NOT NULL,
	"label" text,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connection_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stay_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"location_label" text NOT NULL,
	"access_details" text,
	"available_from" timestamp with time zone NOT NULL,
	"available_to" timestamp with time zone NOT NULL,
	"status" "stay_offer_status" DEFAULT 'open' NOT NULL,
	"visibility" "stay_offer_visibility" DEFAULT 'connections' NOT NULL,
	"auto_accept_first" boolean DEFAULT false NOT NULL,
	"taken_by_user_id" text,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stay_offer_audience" (
	"offer_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stay_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"claimant_id" text NOT NULL,
	"status" "stay_claim_status" DEFAULT 'interested' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_invites" ADD CONSTRAINT "connection_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_offers" ADD CONSTRAINT "stay_offers_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_offers" ADD CONSTRAINT "stay_offers_taken_by_user_id_users_id_fk" FOREIGN KEY ("taken_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_offer_audience" ADD CONSTRAINT "stay_offer_audience_offer_id_stay_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."stay_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_offer_audience" ADD CONSTRAINT "stay_offer_audience_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_claims" ADD CONSTRAINT "stay_claims_offer_id_stay_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."stay_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_claims" ADD CONSTRAINT "stay_claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_idx" ON "notifications" USING btree ("user_id","dedupe_key") WHERE "dedupe_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connections_pair_idx" ON "connections" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_requester_idx" ON "connections" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_addressee_idx" ON "connections" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connection_invites_inviter_idx" ON "connection_invites" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stay_offers_host_idx" ON "stay_offers" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stay_offers_status_idx" ON "stay_offers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stay_offer_audience_idx" ON "stay_offer_audience" USING btree ("offer_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stay_claims_offer_claimant_idx" ON "stay_claims" USING btree ("offer_id","claimant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stay_claims_offer_created_idx" ON "stay_claims" USING btree ("offer_id","created_at");
