-- Add surveys and survey_responses tables if they don't exist
-- This migration fixes missing tables from 0005_normal_wolfsbane.sql which was not in the journal

CREATE TABLE IF NOT EXISTS "surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"item_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"survey_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "surveys_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "survey_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"survey_id" text NOT NULL,
	"user_id" text,
	"item_id" text,
	"data" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_survey_id_surveys_id_fk'
  ) THEN
    ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_survey_id_idx" ON "survey_responses" USING btree ("survey_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_user_id_idx" ON "survey_responses" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_item_id_idx" ON "survey_responses" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_completed_at_idx" ON "survey_responses" USING btree ("completed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surveys_slug_idx" ON "surveys" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surveys_type_idx" ON "surveys" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surveys_item_id_idx" ON "surveys" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surveys_status_idx" ON "surveys" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surveys_created_at_idx" ON "surveys" USING btree ("created_at");

