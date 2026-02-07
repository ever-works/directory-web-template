-- Convert comments table timestamp columns to timestamptz
-- This aligns the database schema with the Drizzle schema definition (schema.ts)
-- and maintains consistency with other tables (surveys, survey_responses, integration_mappings)

-- Convert created_at to timestamptz (assumes existing timestamps are UTC)
ALTER TABLE "comments"
  ALTER COLUMN "created_at" TYPE timestamptz
  USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint

-- Convert updated_at to timestamptz (assumes existing timestamps are UTC)
ALTER TABLE "comments"
  ALTER COLUMN "updated_at" TYPE timestamptz
  USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint

-- Convert deleted_at to timestamptz (assumes existing timestamps are UTC)
ALTER TABLE "comments"
  ALTER COLUMN "deleted_at" TYPE timestamptz
  USING "deleted_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
