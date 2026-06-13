CREATE TYPE "public"."household_type" AS ENUM('single', 'couple');--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "household_type" "household_type" DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "monthly_income" integer;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "has_pets" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "needs_bed_linens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "is_student" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "is_smoker" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "spoken_languages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD COLUMN "photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "tenant_requests" SET "photo_urls" = jsonb_build_array("photo_url") WHERE "photo_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_requests" DROP COLUMN "photo_url";--> statement-breakpoint
CREATE TABLE "tenant_request_views" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"viewer_id" text NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "tenant_request_views" ADD CONSTRAINT "tenant_request_views_request_id_tenant_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."tenant_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_request_views" ADD CONSTRAINT "tenant_request_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_request_views_request_viewer_idx" ON "tenant_request_views" USING btree ("request_id","viewer_id");--> statement-breakpoint
CREATE INDEX "tenant_request_views_request_idx" ON "tenant_request_views" USING btree ("request_id");
