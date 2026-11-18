-- End existing sessions when a password is reset or changed (T-2636)
--
-- Adds users.password_changed_at. `setUserPasswordHash` sets it on every
-- password reset and change, for admins and clients, and the jwt callback
-- (apps/web/lib/auth/index.ts) ends every session that signed in before it.
--
-- No backfill, on purpose: tokens issued before this release carry no sign-in
-- stamp, and a set password_changed_at ends such a token. Leaving existing
-- rows NULL keeps every current session until its user next changes the
-- password.
--
-- Generated with drizzle-kit and trimmed to this column: the snapshot chain
-- still lacked "billing_issues" (hand-written 0040 / 0041), so the generated
-- file also re-created that table. 0043_snapshot.json now records it.
--
-- Additive and idempotent: safe to re-run.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
