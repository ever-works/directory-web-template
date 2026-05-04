---
id: stripe-subscription-id-cancel-body-spec
title: E2E Stripe Subscription [subscriptionId] Cancel Body Spec (apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts)
sidebar_label: E2E Stripe Subscription [subscriptionId] Cancel Body Spec
sidebar_position: 580
---

# E2E Stripe Subscription [subscriptionId] Cancel Body Spec — `apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe subscription-cancel POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that documents a **Q-010-style
IDOR finding for a Stripe subscription endpoint** —
the handler authenticates the user via `auth()` but
does NOT verify that the `subscriptionId` from the
path belongs to the authenticated user. Compare to
the sibling
[`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
which DOES enforce ownership via `getCustomerId` →
`getPolarSubscription` → `subscriptionCustomerId
=== userPolarCustomerId`. The Stripe cancel handler
trusts the path parameter directly. See
[`docs/questions.md`](../questions.md) for the
Q-### entry.

It is also the **first per-source-file POST smoke**
that pins a **DB-sync-after-provider-call
contract** — after `stripeProvider.cancelSubscription
(...)` succeeds, the handler ALSO calls
`updateSubscriptionBySubscriptionId({...})` to sync
the cancellation state back to the local DB.

## What's distinct from the polar/subscription/[id]/cancel sibling

- **NO IDOR-protection** — the FIRST per-source-file
  POST smoke pinning a Q-010-style finding for a
  Stripe subscription endpoint.
- **NO Content-Length 413 pre-check** (polar/cancel
  pins one).
- **DB sync side-effect** —
  `updateSubscriptionBySubscriptionId(...)` after
  the provider call. The FIRST per-source-file POST
  smoke pinning a DB-sync-after-provider-call
  contract.
- **Email-send with fault-tolerance** —
  `paymentEmailService.sendSubscriptionCancellingEmail
  (...)` wrapped in try/catch (failure does NOT
  fail the cancellation).
- **NO try/catch around `request.json()`** —
  malformed JSON cascades to outer catch.

## Why this spec is the IDOR-finding + DB-sync stripe-subscription-cancel smoke

The route under test
([`apps/web/app/api/stripe/subscription/[subscriptionId]/cancel/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscription/[subscriptionId]/cancel/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 `{ error: 'Unauthorized' }` (bare envelope).
2. **JSON body parse** with destructured default —
   `{ cancelAtPeriodEnd = true } = await
   request.json()`. NO try/catch.
3. **`{ subscriptionId }` param resolution** via
   dynamic-segment route.
4. **`getOrCreateStripeProvider()` singleton
   initialization**.
5. **`stripeProvider.cancelSubscription
   (subscriptionId, cancelAtPeriodEnd)`** — load-
   bearing call WITHOUT IDOR protection.
6. **`updateSubscriptionBySubscriptionId({...})`** —
   DB sync side-effect.
7. **Email-send with fault-tolerance** — wrapped in
   try/catch; failure does NOT fail the request.
8. **Success payload** — `{ success: true, data:
   <cancelledSubscription>, message: <conditional> }`
   with status 200.
9. **Outer catch** — 500 `{ error: 'Failed to cancel
   subscription' }`.
10. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~10
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~9 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                | ~10 bodies covering valid bodies, type-violation probes, bypass attempts.                                                              |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                     | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key', …)`                                            | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate messages.                                                                  |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… cancelSubscription / DB-sync / email-send are NOT entered on the unauth branch', …)`      | Pins the gate-before-three-side-effects order.                                                                                         |
| `test('… catch-branch generic 500 message is NOT echoed on the unauth branch', …)`                 | Pins the gate-before-catch order.                                                                                                      |
| `test('… no-IDOR-protection contract: any auth'd user can target any subscription ID', …)`         | Pins the CURRENT no-IDOR-protection contract: identical 401 envelope across different subscription IDs (a future IDOR fix would break this). |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~19 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-three-side-effects invariant** —
    cancelSubscription / DB sync / email send are
    NEVER entered on unauth.
11. **Gate-before-catch invariant**.
12. **No-IDOR-protection contract** — pins that the
    unauth 401 envelope is IDENTICAL across
    different subscription IDs.

## See also

- The Polar subscription-cancel POST sibling
  [`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
  enforces IDOR protection (this Stripe spec
  documents the lack of it).
- The Polar subscription-reactivate POST sibling
  [`polar-subscription-id-reactivate-body-spec.md`](polar-subscription-id-reactivate-body-spec.md)
  also enforces IDOR protection.
- The Stripe webhook signature-verified POST sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- The Stripe checkout POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md).
- The LemonSqueezy subscription-cancel POST sibling
  [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md).
- [`docs/questions.md`](../questions.md) — the Q-###
  entry tracking the Stripe IDOR finding.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
