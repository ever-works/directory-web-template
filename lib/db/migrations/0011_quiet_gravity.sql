ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
-- NOTE: is_active column already exists from migration 0000, so we don't need to add it
-- ALTER TABLE "newsletterSubscriptions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- NOTE: is_subscribed column never existed (migration 0000 used is_active from the start), so we don't need to drop it
-- ALTER TABLE "newsletterSubscriptions" DROP COLUMN "is_subscribed";