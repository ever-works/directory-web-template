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
Credentials sign-up does not require a verified email (`lib/auth/credentials.ts` signs
in regardless of `users.emailVerified`). Someone who registers first with another
person's address, before that person has an account, could therefore cancel or change
any LemonSqueezy subscription bought under that address in the same store.

## Contract

- `isEmailVerifiedForOwnership(userId, lookup)` (`subscription-ownership.ts`) is `true`
  when `users.emailVerified` is set, or when the user has a linked account of type
  `oauth` or `oidc` (the provider verified the address; Auth.js leaves `emailVerified`
  null for these users, so they are not locked out). It is `false` for a missing user
  id or an unknown user.
- The database lookup is `loadEmailVerificationState` in
  `subscription-email-verification.ts`. Account rows of type `credentials` (and the
  legacy `email` type) never count.
- Each of the four LemonSqueezy routes calls the check after body validation and before
  `findOwnedLemonSqueezySubscription`, and returns **403** with code
  `EMAIL_NOT_VERIFIED` and the message `EMAIL_NOT_VERIFIED_MESSAGE` when it is false.
  No LemonSqueezy call is made in that case.
- Non-owners still get **404** `Subscription not found or access denied`.
- Sign-in is unchanged: there is no new verification requirement to log in.
- Stripe and Polar routes are unaffected (they match on local rows / customer ids, not
  on email).

## Tests

- `apps/web/lib/payment/__tests__/subscription-ownership.spec.ts`: unverified credentials
  user refused; verified user accepted; OAuth-only user accepted; unknown or blank user
  id refused without a lookup.
- `apps/web/lib/payment/__tests__/subscription-ownership-wiring.spec.ts`: each
  LemonSqueezy route must call the verification check, answer 403 right after it fails,
  and do so before the owner lookup.

Run with `pnpm --filter @ever-works/web test:unit`.
