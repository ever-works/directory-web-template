-- Account Deactivation (reversible soft-pause)
-- Adds a deactivated_at timestamp to the users table. NULL means the account
-- is active; a non-NULL value means the account is temporarily deactivated.
-- This is intentionally separate from deleted_at (which is used for soft-delete /
-- hard-delete flows). Existing rows default to NULL (active).
--
-- Additive, idempotent — safe to re-run.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;

-- Index for efficient admin queries that filter by deactivation status
CREATE INDEX IF NOT EXISTS "users_deactivated_at_idx" ON "users" ("deactivated_at");
