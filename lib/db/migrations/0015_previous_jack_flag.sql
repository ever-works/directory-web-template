CREATE TABLE "sponsor_ads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_slug" text NOT NULL,
	"item_name" text NOT NULL,
	"item_icon_url" text,
	"item_category" text,
	"item_description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"interval" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"payment_provider" text NOT NULL,
	"subscription_id" text,
	"customer_id" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sponsor_ads" ADD CONSTRAINT "sponsor_ads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_ads" ADD CONSTRAINT "sponsor_ads_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sponsor_ads_user_id_idx" ON "sponsor_ads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sponsor_ads_item_slug_idx" ON "sponsor_ads" USING btree ("item_slug");--> statement-breakpoint
CREATE INDEX "sponsor_ads_status_idx" ON "sponsor_ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sponsor_ads_interval_idx" ON "sponsor_ads" USING btree ("interval");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsor_ads_provider_subscription_idx" ON "sponsor_ads" USING btree ("payment_provider","subscription_id");--> statement-breakpoint
CREATE INDEX "sponsor_ads_start_date_idx" ON "sponsor_ads" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "sponsor_ads_end_date_idx" ON "sponsor_ads" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "sponsor_ads_created_at_idx" ON "sponsor_ads" USING btree ("created_at");