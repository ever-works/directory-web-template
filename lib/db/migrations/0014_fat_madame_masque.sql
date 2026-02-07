-- Add moderation features (fixed migration)

-- First, create the reports table (required for moderation_history foreign key)
CREATE TABLE IF NOT EXISTS "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution" text,
	"reported_by" text NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint

-- Add foreign keys for reports table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reported_by_client_profiles_id_fk') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_by_client_profiles_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reviewed_by_users_id_fk') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint

-- Create indexes for reports table (if not exists)
CREATE INDEX IF NOT EXISTS "reports_content_type_idx" ON "reports" USING btree ("content_type");
CREATE INDEX IF NOT EXISTS "reports_content_id_idx" ON "reports" USING btree ("content_id");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports" USING btree ("status");
CREATE INDEX IF NOT EXISTS "reports_reported_by_idx" ON "reports" USING btree ("reported_by");
CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "reports" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "reports_content_type_content_id_idx" ON "reports" USING btree ("content_type", "content_id");
--> statement-breakpoint

-- Create moderation_history table
CREATE TABLE IF NOT EXISTS "moderation_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"report_id" text,
	"performed_by" text,
	"content_type" text,
	"content_id" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add moderation columns to client_profiles (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_profiles' AND column_name = 'warning_count') THEN
        ALTER TABLE "client_profiles" ADD COLUMN "warning_count" integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_profiles' AND column_name = 'suspended_at') THEN
        ALTER TABLE "client_profiles" ADD COLUMN "suspended_at" timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_profiles' AND column_name = 'banned_at') THEN
        ALTER TABLE "client_profiles" ADD COLUMN "banned_at" timestamp with time zone;
    END IF;
END $$;
--> statement-breakpoint

-- Add banned to status enum (if not already included)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for enum values, so we use a workaround
DO $$
BEGIN
    -- Check if 'banned' is not in the enum and add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'banned'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_profile_status')
    ) THEN
        -- If the enum exists, alter it
        ALTER TYPE client_profile_status ADD VALUE IF NOT EXISTS 'banned';
    END IF;
EXCEPTION
    WHEN others THEN NULL; -- Ignore errors (enum might not exist or value might already exist)
END $$;
--> statement-breakpoint

-- Add foreign keys for moderation_history (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_history_user_id_client_profiles_id_fk') THEN
        ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_user_id_client_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_history_report_id_reports_id_fk') THEN
        ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_history_performed_by_users_id_fk') THEN
        ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint

-- Create indexes for moderation_history (if not exists)
CREATE INDEX IF NOT EXISTS "moderation_history_user_id_idx" ON "moderation_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "moderation_history_action_idx" ON "moderation_history" USING btree ("action");
CREATE INDEX IF NOT EXISTS "moderation_history_report_id_idx" ON "moderation_history" USING btree ("report_id");
CREATE INDEX IF NOT EXISTS "moderation_history_performed_by_idx" ON "moderation_history" USING btree ("performed_by");
CREATE INDEX IF NOT EXISTS "moderation_history_created_at_idx" ON "moderation_history" USING btree ("created_at");
