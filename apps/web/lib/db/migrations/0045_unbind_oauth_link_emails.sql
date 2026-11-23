-- Forget every address recorded on an OAuth / OIDC link (spec 060 R16)
--
-- A linked OAuth / OIDC account proves the user's address to the LemonSqueezy
-- ownership check (`isEmailVerifiedForOwnership`) only when `accounts.email` is
-- the address its provider proved. From this release `events.signIn`
-- (apps/web/lib/auth/oauth-link-email.ts) writes that address at every sign-in
-- through the provider. Addresses already on these rows were not written that
-- way: `updateUser` (#1123) copied the user's previous `users.email` onto links
-- that had none, and that address may never have been proven (set, unverified,
-- then changed again). Such a row would keep vouching for it.
--
-- So every OAuth / OIDC row starts again with no address. A link counts again
-- after the user's next sign-in through that provider; meanwhile the user can
-- verify the address by email. Password rows (`credentials`, legacy `email`)
-- keep their address: credentials sign-in reads it.
--
-- Data only, idempotent: safe to re-run.

UPDATE "accounts" SET "email" = NULL WHERE "type" IN ('oauth', 'oidc') AND "email" IS NOT NULL;
