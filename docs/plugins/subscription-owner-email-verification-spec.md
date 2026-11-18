---
id: subscription-owner-email-verification-spec
title: Subscription Ownership - Verified Email Requirement (LemonSqueezy)
sidebar_label: Subscription Owner Email Verification
---

# Subscription ownership: the email must be verified (LemonSqueezy)

Extends the ownership checks in `apps/web/lib/payment/subscription-ownership.ts`.

## Problem

`POST /api/lemonsqueezy/{cancel,reactivate,update-plan,update}` decide ownership by
comparing the subscription's customer email at LemonSqueezy with `session.user.email`.
Credentials sign-up does not require a verified email (`apps/web/lib/auth/credentials.ts` signs
in regardless of `users.emailVerified`). Someone who registers first with another
person's address, before that person has an account, could therefore cancel or change
any LemonSqueezy subscription bought under that address in the same store.

## Contract

- `isEmailVerifiedForOwnership(userId, email, lookup)` (`subscription-ownership.ts`)
  proves the address being matched (`session.user.email`), not just the user. It is
  `false` unless `email` equals `users.email` as stored now (case and spaces ignored;
  the session keeps the address from sign-in, so a changed address never inherits an
  earlier proof). Then it is `true` when `users.emailVerified` is set, or when the user
  has a linked account of type `oauth` or `oidc` whose recorded `accounts.email` equals
  the current address (Auth.js leaves `emailVerified` null for OAuth users, so they are
  not locked out). A row bound to another address proves nothing, and neither does a
  row with no recorded address: Auth.js links any provider account to the signed-in
  user whatever its address, so after an address change a newly linked account would
  otherwise vouch for an address nobody proved (Greptile on #1153).
  The OAuth rule only applies to users without a password (no `users.passwordHash` and
  no `accounts` row other than `oauth` / `oidc`): Auth.js links any OAuth account to the
  signed-in user whatever its address, so a password user who registered with someone
  else's address and then linked their own Google or GitHub account has proven nothing.
  Password users must verify the address by email.
  It is `false` for a missing user id, email or user.
- `DELETE /api/auth/security/connected-accounts/{provider}` only deletes `oauth` /
  `oidc` rows, so a password user cannot remove the password row and become OAuth-only.
  `GET /api/auth/security/connected-accounts` lists the same two types (Auth.js stores
  Google and other OpenID Connect providers as `oidc`), and the "last sign-in method"
  guard counts both. The set is `OAUTH_ACCOUNT_TYPES` in `lib/auth/connected-accounts.ts`.
  The guard (`canDisconnectProvider`) refuses unless a password of the current tenant or
  a link to another provider remains, and runs with the user row locked, so no sequence
  of disconnects leaves a password-less user with no sign-in method.
- Each `oauth` / `oidc` row is bound to the address its provider proved
  (`lib/auth/oauth-link-email.ts`). Auth.js's adapter `linkAccount` gets no profile, so
  `events.signIn` in `lib/auth/index.ts` (called in the same callback, for a first
  sign-in, a link made while signed in, and every later sign-in through the provider)
  writes the profile's address, trimmed and lower-cased, on the row
  `(provider, providerAccountId)`. A profile that reports the address but says it is
  not verified (`email_verified: false`, also as the string `"false"`, or Google's older
  `verified_email: false`) writes `null`. A profile with no address (a declined email
  scope, a failed GitHub `/user/emails` call) writes nothing, so an address proven
  earlier is kept. A failed write is logged and leaves the row as it was (no address
  for a new link), so it fails closed.
- `updateUser` (`lib/db/queries/user.queries.ts`, used by the account settings action)
  clears `users.emailVerified` when the address changes. It no longer writes the old
  address into OAuth rows that had none: each row keeps the address its provider proved,
  and binding an empty row to the previous address could make an address the user had
  set but never proved count as proven after a second change.
- The database lookup is `loadEmailVerificationState` in
  `subscription-email-verification.ts`. Account rows of type `credentials` (and the
  legacy `email` type) never count.
- Legacy links no longer count. Rows written before links were bound have no address,
  and migration `0045_unbind_oauth_link_emails` clears the addresses the old `updateUser`
  had copied from `users.email` (no provider proved those). The next sign-in through that provider records its address; until then the user
  verifies the address by email (profile → email verification dialog,
  `resendVerificationEmailAction`). `EMAIL_NOT_VERIFIED_MESSAGE` names both ways. There
  is no backfill from `users.email`: an address changed before the change cannot be told
  apart from one the provider proved (`docs/questions.md` Q-060c).
- Providers that do not say whether the address is verified (GitHub, Microsoft Entra ID,
  …) are trusted as before (`docs/questions.md` Q-060d).
- Known gap: admin edits through `UserDbService.updateUser` still change `users.email`
  without clearing `emailVerified`; the stored-address comparison does not cover that
  path. Follow-up.
- Each of the four LemonSqueezy routes calls the check after body validation and before
  `findOwnedLemonSqueezySubscription`, and returns **403** with code
  `EMAIL_NOT_VERIFIED` and the message `EMAIL_NOT_VERIFIED_MESSAGE` when it is false.
  No LemonSqueezy call is made in that case.
- `GET` and `POST /api/lemonsqueezy/list` match purchases by the same email, so they
  need the same proof. `resolveListAccess` (`lemonsqueezy-list-access.ts`) runs before
  LemonSqueezy is called. Listing the caller's own email (no `customerEmail`, or the
  same one) requires `isEmailVerifiedForOwnership`; otherwise **403** `EMAIL_NOT_VERIFIED`
  with `EMAIL_NOT_VERIFIED_MESSAGE`. Listing another email stays admin-only (live
  `isAdmin` lookup, **403** `ACCESS_DENIED` for everyone else) and does **not** consult
  the admin's own email verification: the admin role is granted by an operator and cannot
  be gained by registering someone else's address, and the address being read is not the
  admin's. An admin listing their own purchases is subject to the check like any user.
- A verified non-owner still gets **404** `Subscription not found or access denied`; an unverified caller gets the 403 first, before any lookup.
- Sign-in is unchanged: there is no new verification requirement to log in.
- Stripe and Polar routes are unaffected (they match on local rows / customer ids, not
  on email).

## Tests

- `apps/web/lib/payment/__tests__/subscription-ownership.spec.ts`: unverified credentials
  user refused; verified user accepted; OAuth-only user accepted when a link is bound to
  the address; a link with no recorded address refused; the change-address-then-link
  flow refused; password user with a later-linked OAuth account refused until verified;
  unknown or blank user id refused without a lookup.
- `apps/web/lib/auth/__tests__/oauth-link-email.spec.ts`: the provider-proven address
  (trimmed, lower-cased; `null` when unverified or missing), the write only for `oauth` /
  `oidc` sign-ins, and the `events.signIn` wiring; `updateUser` writes no `accounts` rows.
- `apps/web/lib/payment/__tests__/subscription-ownership-wiring.spec.ts`: each
  LemonSqueezy route must call the verification check, answer 403 right after it fails,
  and do so before the owner lookup; the list route's GET and POST must resolve access
  (and return the 403) before calling LemonSqueezy.
- `apps/web/lib/payment/__tests__/lemonsqueezy-list-access.spec.ts`: unverified caller
  refused (own email, with or without `customerEmail`); verified caller accepted; admin
  listing another email accepted without the verification lookup; non-admin asking for
  another email refused with `ACCESS_DENIED`.

Run with `pnpm --filter @ever-works/web test:unit`.
