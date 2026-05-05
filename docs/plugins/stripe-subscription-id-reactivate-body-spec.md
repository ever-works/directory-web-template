---
id: stripe-subscription-id-reactivate-body-spec
title: E2E Stripe Subscription [subscriptionId] Reactivate Body Spec (apps/web-e2e/tests/api/stripe-subscription-id-reactivate-body.spec.ts)
sidebar_label: E2E Stripe Subscription [subscriptionId] Reactivate Body Spec
sidebar_position: 582
---

# E2E Stripe Subscription [subscriptionId] Reactivate Body Spec — `apps/web-e2e/tests/api/stripe-subscription-id-reactivate-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe subscription-reactivate POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-subscription-id-reactivate-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-id-reactivate-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **TENANT-SCOPED-but-
NOT-USER-SCOPED partial-IDOR finding** — the
handler authenticates the user via `auth()` and then
looks up the subscription via
`getSubscriptionByProviderSubscriptionId('stripe',
subscriptionId)`, which scopes the query by
`tenantId` (NOT by `userId`). This sits between the
two siblings:

- [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  — NO IDOR check at all (a Q-010-style finding).
- [`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
  — full user-scoped IDOR via `getCustomerId` and
  `subscriptionCustomerId === userPolarCustomerId`.

The Stripe reactivate handler enforces a tenant-
scoped check (which prevents cross-tenant access)
but does NOT verify per-user ownership within the
same tenant. This is a partial-IDOR finding worth
pinning as the CURRENT contract until a future PR
adds per-user verification.

It is also the **first per-source-file POST smoke**
that pins a **STATE-MACHINE PRE-CHECK 400 contract**
— the handler reads `subscription.cancelAtPeriodEnd`
from the DB row and returns 400 `'Subscription is
not scheduled for cancellation'` BEFORE calling the
provider. Distinct from the polar/subscription/[id]/
reactivate sibling which surfaces the same 400 via
a catch-substring detection on the upstream Polar
error message; this Stripe variant has the 400
baked into the handler's own state-machine pre-
check.

## What's distinct from EVERY prior POST smoke

- **TENANT-scoped DB-IDOR check** — partial-IDOR
  finding (FIRST per-source-file POST smoke pinning
  a tenant-scoped-but-NOT-user-scoped IDOR
  contract).
- **STATE-MACHINE PRE-CHECK 400** — `if (!
  subscription.cancelAtPeriodEnd)` BEFORE the
  provider call (FIRST per-source-file POST smoke
  pinning a state-machine pre-check 400 minted
  from a DB-row column read).
- **NO body parsing** — `request.json()` is never
  called (matches polar reactivate sibling, distinct
  from stripe cancel sibling which DOES parse).
- **Multi-step write** — `stripeProvider.
  updateSubscription` AND
  `updateSubscriptionBySubscriptionId` (DB sync
  write), then async email side-effect.
- **Generic 500 catch** — single static string
  `'Failed to reactivate subscription'`, NO
  substring detection (distinct from polar
  reactivate's THREE-string catch dispatcher).
- **Static success message** `'Subscription
  reactivated successfully'` (no conditional
  branch, matches polar reactivate sibling).
- **Returns raw `reactivatedSubscription`** in the
  `data` field — Stripe SDK provider object
  verbatim.
- **Body-completely-ignored invariance walk** —
  every body permutation produces the EXACT same
  status AND envelope.
- **Cross-subscription-ID invariance walk** — the
  unauth response must be IDENTICAL across
  distinct subscription IDs (pinning that the
  tenant-scoped DB read is NOT entered upstream of
  the auth gate).

## Why this spec is the partial-IDOR + state-machine-400 stripe-subscription-reactivate smoke

The route under test
([`apps/web/app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user`
   → 401 `{ error: 'Unauthorized' }` (bare
   envelope).
2. **`{ subscriptionId }` param resolution** via
   dynamic-segment route.
3. **`getOrCreateStripeProvider()` singleton
   initialization** AFTER the auth gate.
4. **Tenant-scoped DB IDOR check** —
   `getSubscriptionByProviderSubscriptionId
   ('stripe', subscriptionId)` returns null → 404
   `'Subscription not found or access denied'`.
5. **STATE-MACHINE PRE-CHECK 400** — `if (!
   subscription.cancelAtPeriodEnd)` → 400
   `'Subscription is not scheduled for
   cancellation'`.
6. **`stripeProvider.updateSubscription({
   subscriptionId, cancelAtPeriodEnd: false })`** —
   load-bearing provider call.
7. **`updateSubscriptionBySubscriptionId({
   subscriptionId, cancelAtPeriodEnd: false,
   cancelledAt: null, updatedAt, status: 'active'
   })`** — DB sync write.
8. **Async email side-effect** —
   `paymentEmailService.
   sendSubscriptionReactivatedEmail(...)` wrapped
   in try/catch (failure does NOT fail the
   reactivation).
9. **Success payload** — `{ success: true, data:
   <reactivatedSubscription>, message: 'Subscription
   reactivated successfully' }` with status 200.
10. **Generic 500 catch** — `{ error: 'Failed to
    reactivate subscription' }`.
11. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~10
bodies) and **thirteen hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                | ~9 headers including `X-Tenant-Id` tenant-scope probe.                                                                                 |
| Body bulk-loop walk                                                                                  | ~10 bodies covering ignored bodies, type-violation probes, bypass attempts (incl. fabricated tenantId / userId).                       |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                       | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key', …)`                                              | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                            | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                     | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('… has a stable status across header / body permutations', …)`                                 | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                     | Side-channel walk including `X-Tenant-Id` probe.                                                                                       |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                          | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                            | Pins the no-body-parse contract.                                                                                                       |
| `test('… tenant-scoped DB-IDOR check is NOT entered on the unauth branch', …)`                       | Pins the gate-before-DB-IDOR order — the 404 `'Subscription not found or access denied'` must NEVER fire on unauth.                    |
| `test('… state-machine 400 pre-check is NOT entered on the unauth branch', …)`                      | Pins the gate-before-state-machine-400 order — the 400 `'Subscription is not scheduled for cancellation'` must NEVER fire on unauth.   |
| `test('… updateSubscription / DB-sync / email-send chain is NOT entered on the unauth branch', …)`  | Pins the gate-before-multi-step-write order.                                                                                           |
| `test('… catch-branch generic-500 is NOT echoed on the unauth branch', …)`                          | Pins the no-`'Failed to reactivate subscription'`-leak invariant.                                                                      |
| `test('… body is COMPLETELY ignored on the unauth branch', …)`                                      | Pins the body-completely-ignored invariance — every body permutation produces the EXACT same status AND envelope.                      |
| `test('… unauth status is invariant across distinct subscription IDs', …)`                          | Pins that the tenant-scoped DB read is NOT entered upstream of the auth gate (distinct sub IDs produce IDENTICAL responses).           |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~19 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no other keys.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant** across the
   four candidate messages.
6. **Status invariance across body permutations**
   (six permutations + tenant-scope probe).
7. **Side-channel isolation** including `X-Tenant-Id`.
8. **Cross-method invariance**.
9. **No-body-parse contract** — malformed JSON
   bodies must NOT 5xx.
10. **Gate-before-DB-IDOR invariant** — the
    tenant-scoped DB IDOR check is NOT entered on
    unauth.
11. **Gate-before-state-machine-400 invariant** —
    the 400 `'Subscription is not scheduled for
    cancellation'` pre-check is NOT entered on
    unauth.
12. **Gate-before-multi-step-write invariant** —
    `updateSubscription` / DB sync / email send
    chain is NOT entered on unauth.
13. **No-generic-500-leak invariant** — the
    `'Failed to reactivate subscription'` catch
    message must NEVER appear on unauth.
14. **Body-completely-ignored invariant** — every
    body permutation produces the EXACT same status
    AND envelope.
15. **Cross-subscription-ID invariance** — distinct
    sub IDs produce IDENTICAL unauth responses,
    pinning that the tenant-scoped DB read is NOT
    entered upstream of the gate.

## See also

- The Stripe subscription-cancel POST sibling
  [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  documents NO IDOR at all (a Q-010-style finding);
  this reactivate spec documents the partial
  tenant-scoped IDOR.
- The Polar subscription-reactivate POST sibling
  [`polar-subscription-id-reactivate-body-spec.md`](polar-subscription-id-reactivate-body-spec.md)
  surfaces the same 400 `'Subscription is not
  scheduled for cancellation'` via a catch-
  substring detection on the upstream Polar error
  message; this Stripe variant has the 400 baked
  into the handler's own state-machine pre-check
  (DISTINCT contract source).
- The Polar subscription-cancel POST sibling
  [`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
  enforces full user-scoped IDOR; this Stripe spec
  documents only tenant-scoped IDOR.
- The LemonSqueezy subscription-reactivate POST
  sibling
  [`lemonsqueezy-reactivate-body-spec.md`](lemonsqueezy-reactivate-body-spec.md).
- The Stripe webhook signature-verified POST sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [`docs/questions.md`](../questions.md) — the
  Q-### entry tracking the Stripe subscription
  partial-IDOR finding (compare with the Q-010
  family).
