CREATE TABLE "tenant_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"seeker_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"category" "listing_category" NOT NULL,
	"rent_type" "rent_type" NOT NULL,
	"budget_min" integer NOT NULL,
	"budget_max" integer NOT NULL,
	"desired_neighborhoods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"available_from" timestamp with time zone NOT NULL,
	"available_to" timestamp with time zone,
	"size_min" integer,
	"rooms_min" integer,
	"anmeldung_needed" boolean DEFAULT false NOT NULL,
	"has_schufa" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "tenant_requests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD CONSTRAINT "tenant_requests_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_requests_status_idx" ON "tenant_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_requests_seeker_idx" ON "tenant_requests" USING btree ("seeker_id");--> statement-breakpoint
CREATE INDEX "tenant_requests_rent_type_idx" ON "tenant_requests" USING btree ("rent_type");--> statement-breakpoint
CREATE INDEX "tenant_requests_category_idx" ON "tenant_requests" USING btree ("category");