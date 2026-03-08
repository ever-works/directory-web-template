CREATE TABLE "item_views" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"viewer_id" text NOT NULL,
	"viewed_date_utc" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "auto_renewal_check";--> statement-breakpoint
CREATE UNIQUE INDEX "item_views_unique_daily_idx" ON "item_views" USING btree ("item_id","viewer_id","viewed_date_utc");--> statement-breakpoint
CREATE INDEX "item_views_item_date_idx" ON "item_views" USING btree ("item_id","viewed_date_utc");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "auto_renewal_check" CHECK (NOT ("subscriptions"."auto_renewal" AND "subscriptions"."cancel_at_period_end"));