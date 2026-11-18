-- Re-apply 0042_email_two_factor_auth (spec 053) where drizzle skipped it (T-2647)
--
-- Drizzle runs a journal entry only when its `when` is later than the newest
-- row in drizzle.__drizzle_migrations. 0042 shipped with a `when` older than
-- 0041_billing_issue_refund_claim, so every database that had run 0041 skipped
-- it, silently: no "twoFactorCodes" table and no
-- client_profiles.two_factor_failed_attempts / two_factor_locked_until, and
-- email 2FA failed there. 0042's `when` now comes after 0041, so a database
-- whose newest row is 0041 runs it. A database that has run 0043 is already
-- past 0042's new `when`, so this migration re-runs 0042's statements there,
-- word for word.
--
-- Every statement is a no-op where its object exists (IF NOT EXISTS, or a
-- duplicate_object guard for the foreign keys), so it is safe on databases
-- that did run 0042 and on fresh ones, which run 0042 just before it.

CREATE TABLE IF NOT EXISTS "twoFactorCodes" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "two_factor_failed_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "two_factor_locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "twoFactorCodes" ADD CONSTRAINT "twoFactorCodes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "twoFactorCodes" ADD CONSTRAINT "twoFactorCodes_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_user_id_idx" ON "twoFactorCodes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_expires_idx" ON "twoFactorCodes" USING btree ("expires");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_tenant_id_idx" ON "twoFactorCodes" USING btree ("tenant_id");--> statement-breakpoint
-- At most one live code per user (see 0042).
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_codes_active_user_idx" ON "twoFactorCodes" USING btree ("userId") WHERE consumed_at IS NULL;
