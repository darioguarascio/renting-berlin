CREATE TYPE "public"."email_digest" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."household_type" AS ENUM('single', 'couple', 'family_1_kid', 'family_2_kids', 'family_3_plus_kids');--> statement-breakpoint
CREATE TYPE "public"."listing_category" AS ENUM('full_flat', 'shared_room');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."message_template_kind" AS ENUM('inquiry', 'outreach', 'general');--> statement-breakpoint
CREATE TYPE "public"."rent_type" AS ENUM('long_term', 'short_term', 'overnight');--> statement-breakpoint
CREATE TYPE "public"."saved_search_type" AS ENUM('listings', 'tenant_requests');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"tenant_request_id" text,
	"publisher_id" text NOT NULL,
	"inquirer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"author_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"short_code" text NOT NULL,
	"publisher_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"category" "listing_category" NOT NULL,
	"rent_type" "rent_type" NOT NULL,
	"available_from" timestamp with time zone NOT NULL,
	"available_to" timestamp with time zone,
	"size_sqm" integer NOT NULL,
	"rooms" integer NOT NULL,
	"online_viewing_available" boolean DEFAULT false NOT NULL,
	"anmeldung_available" boolean DEFAULT false NOT NULL,
	"schufa_required" boolean DEFAULT false NOT NULL,
	"address" text NOT NULL,
	"neighborhood" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"approximate_location" boolean DEFAULT false NOT NULL,
	"costs" jsonb NOT NULL,
	"descriptions" jsonb NOT NULL,
	"required_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"equipment" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "listings_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"body" text NOT NULL,
	"kind" "message_template_kind" DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_user_id" text NOT NULL,
	"viewer_id" text NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"landlord_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"feedback_due_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reserved_handles" (
	"handle" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "saved_search_type" NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"filter_hash" text NOT NULL,
	"notify_enabled" boolean DEFAULT true NOT NULL,
	"last_known_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"saved_search_id" text NOT NULL,
	"search_type" "saved_search_type" NOT NULL,
	"item_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
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
	"household_type" "household_type" DEFAULT 'single' NOT NULL,
	"monthly_income" integer,
	"has_pets" boolean DEFAULT false NOT NULL,
	"nationality" text,
	"birth_year" integer,
	"needs_bed_linens" boolean DEFAULT false NOT NULL,
	"occupation" text,
	"is_student" boolean DEFAULT false NOT NULL,
	"is_smoker" boolean DEFAULT false NOT NULL,
	"spoken_languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text NOT NULL,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"landlords_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "tenant_requests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"notify_messages" boolean DEFAULT true NOT NULL,
	"notify_saved_searches" boolean DEFAULT true NOT NULL,
	"notify_profile_views" boolean DEFAULT true NOT NULL,
	"notify_listing_updates" boolean DEFAULT true NOT NULL,
	"notify_product_news" boolean DEFAULT false NOT NULL,
	"email_digest" "email_digest" DEFAULT 'instant' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"accept_inquiries" boolean DEFAULT true NOT NULL,
	"preferred_contact_hours" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"handle" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"last_auth_provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_request_id_tenant_requests_id_fk" FOREIGN KEY ("tenant_request_id") REFERENCES "public"."tenant_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inquirer_id_users_id_fk" FOREIGN KEY ("inquirer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_transaction_id_rental_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."rental_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_transactions" ADD CONSTRAINT "rental_transactions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_transactions" ADD CONSTRAINT "rental_transactions_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_transactions" ADD CONSTRAINT "rental_transactions_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_handles" ADD CONSTRAINT "reserved_handles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_notifications" ADD CONSTRAINT "search_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_notifications" ADD CONSTRAINT "search_notifications_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_requests" ADD CONSTRAINT "tenant_requests_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_listing_inquirer_idx" ON "conversations" USING btree ("listing_id","inquirer_id") WHERE "conversations"."listing_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_seeker_inquirer_idx" ON "conversations" USING btree ("tenant_request_id","inquirer_id") WHERE "conversations"."tenant_request_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_listing_idx" ON "favorites" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_neighborhood_idx" ON "listings" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "listings_rent_type_idx" ON "listings" USING btree ("rent_type");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "listings_publisher_idx" ON "listings" USING btree ("publisher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_short_code_idx" ON "listings" USING btree ("slug","short_code");--> statement-breakpoint
CREATE INDEX "message_templates_user_idx" ON "message_templates" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_views_profile_viewer_idx" ON "profile_views" USING btree ("profile_user_id","viewer_id");--> statement-breakpoint
CREATE INDEX "profile_views_profile_user_idx" ON "profile_views" USING btree ("profile_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_searches_user_hash_idx" ON "saved_searches" USING btree ("user_id","filter_hash");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_searches_type_idx" ON "saved_searches" USING btree ("type");--> statement-breakpoint
CREATE INDEX "search_notifications_user_idx" ON "search_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_notifications_user_unread_idx" ON "search_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "search_notifications_unique_item_idx" ON "search_notifications" USING btree ("saved_search_id","item_id");--> statement-breakpoint
CREATE INDEX "tenant_requests_status_idx" ON "tenant_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_requests_seeker_idx" ON "tenant_requests" USING btree ("seeker_id");--> statement-breakpoint
CREATE INDEX "tenant_requests_rent_type_idx" ON "tenant_requests" USING btree ("rent_type");--> statement-breakpoint
CREATE INDEX "tenant_requests_category_idx" ON "tenant_requests" USING btree ("category");