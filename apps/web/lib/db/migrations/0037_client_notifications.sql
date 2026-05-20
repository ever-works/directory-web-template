-- Spec 027 — client notifications system
-- Additive only: new columns on notifications, partial unread + group-key
-- indexes, new notification_preferences table.

ALTER TABLE "notifications" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "category" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "group_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "delivered_channels" text[];--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx"
 ON "notifications" USING btree ("user_id", "created_at")
 WHERE "is_read" = false AND "archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_group_key_idx"
 ON "notifications" USING btree ("user_id", "group_key");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
 "user_id" text PRIMARY KEY NOT NULL,
 "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "email_digest" text DEFAULT 'instant' NOT NULL,
 "quiet_hours_start" text,
 "quiet_hours_end" text,
 "timezone" text DEFAULT 'UTC' NOT NULL,
 "push_enabled" boolean DEFAULT false NOT NULL,
 "push_tokens" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "updated_at" timestamp DEFAULT now() NOT NULL,
 "tenant_id" text
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
