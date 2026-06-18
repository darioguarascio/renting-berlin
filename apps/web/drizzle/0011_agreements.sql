CREATE TYPE "public"."agreement_status" AS ENUM('proposed', 'signed', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"listing_id" text,
	"proposer_id" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"status" "agreement_status" DEFAULT 'proposed' NOT NULL,
	"title" text NOT NULL,
	"monthly_rent" integer NOT NULL,
	"deposit" integer,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"terms" text,
	"proposer_signature_name" text NOT NULL,
	"proposer_signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"counterparty_signature_name" text,
	"counterparty_signed_at" timestamp with time zone,
	"decline_reason" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_counterparty_id_users_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agreements_conversation_idx" ON "agreements" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "agreements_listing_idx" ON "agreements" USING btree ("listing_id");
