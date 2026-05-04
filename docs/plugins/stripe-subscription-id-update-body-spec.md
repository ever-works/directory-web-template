---
id: stripe-subscription-id-update-body-spec
title: E2E Stripe Subscription [subscriptionId] Update Body Spec (apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts)
sidebar_label: E2E Stripe Subscription [subscriptionId] Update Body Spec
sidebar_position: 584
---

# E2E Stripe Subscription [subscriptionId] Update Body Spec — `apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe subscription-plan-update POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts).

This is the **third sibling** in the Stripe
subscription-management trio (cancel + reactivate +
update), completing the stripe-subscription POST
trio that mirrors the LemonSqueezy
subscription-management trio (`lemonsqueezy/cancel`
+ `lemonsqueezy/reactivate` + `lemonsqueezy/update-
plan`) and, alongside the Polar pair (`polar/
subscription/[id]/cancel` + `polar/subscription/[id]/
reactivate`), brings the cross-provider
subscription-management surface to **eight** per-
source-file POST smokes: three Stripe + three
LemonSqueezy + two Polar.

This is also the **first per-source-file POST smoke**
the docs tree publishes that pins a **USER-SCOPED
IDOR check on a Stripe subscription endpoint** —
after the tenant-scoped DB lookup the handler also
compares `userSubscription.userId !==
session.user.id` and returns 404 `'Subscription not
found or access denied'`. This sits at the
**user-scoped end** of the stripe-subscription IDOR
spectrum:

- [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  — NO IDOR check at all (a Q-010-style finding).
- [`stripe-subscription-id-reactivate-body-spec.md`](stripe-subscription-id-reactivate-body-spec.md)
  — TENANT-only scoped (partial-IDOR).
- **THIS spec** — TENANT-scoped DB lookup PLUS
  EXPLICIT USER-id equality check (full IDOR).

## What's distinct from EVERY prior POST smoke

- **USER-scoped IDOR** — `userSubscription.userId
  !== session.user.id` → merged 404 `'Subscription
  not found or access denied'` (FIRST per-source-
  file POST smoke pinning a user-scoped IDOR on a
  Stripe subscription endpoint).
- **THREE-state pre-check 400** — `subscription.
  status !== 'active' && subscription.status !==
  'pending' && subscription.status !== 'paused'` →
  400 `'Subscription is not active'` (FIRST per-
  source-file POST smoke pinning a THREE-state
  allow-list pre-check 400 contract — distinct from
  the reactivate sibling's SINGLE-flag pre-check on
  `subscription.cancelAtPeriodEnd`).
- **PaymentPlan enum-includes validation** —
  `Object.values(PaymentPlan).includes(newPlanId)`
  → 400 `'Invalid plan ID'` (FIRST per-source-file
  POST smoke pinning an enum-from-`@/lib/constants`
  membership-check validation; distinct from the
  LemonSqueezy update-plan sibling which uses Zod
  `safeParse` for its validation chain).
- **Conditional tenant-filter on DB UPDATE WHERE**
  — `...(tenantId ? [eq(subscriptions.tenantId,
  tenantId)] : [])` (FIRST per-source-file POST
  smoke pinning a conditional tenant filter
  spread into a Drizzle UPDATE WHERE clause; every
  prior tenant-scoped POST smoke uses an
  unconditional tenant filter).
- **Body parsing IS used** — `await request.json()`
  IS called (matches stripe cancel + LS update-plan
  siblings, distinct from stripe reactivate sibling
  which does NOT parse).
- **TWO required fields** — `{ newPlanId,
  newPriceId }` destructured from body.
- **Multi-step write chain** — provider call + DB
  update + email side-effect, with the DB update
  using a conditional tenant filter and the email
  carrying BOTH old AND new plan names.
- **Plan-changed email contract** — the email
  payload includes BOTH `oldPlanName: subscription.
  planId` (read from the DB row BEFORE the update)
  AND `newPlanName: newPlanId` (FIRST per-source-
  file POST smoke pinning an email with both old +
  new plan names; distinct from cancel sibling
  which sends a cancellation email with no plan-
  name comparison and reactivate sibling which
  sends a reactivation email).
- **Dynamic success message** — `Plan updated to
  ${newPlanId} successfully` (template literal with
  `newPlanId` interpolation; distinct from
  reactivate sibling's static `'Subscription
  reactivated successfully'`).
- **Returns raw `updatedSubscription`** in the
  `data` field — Stripe SDK provider object
  verbatim (matches the cancel + reactivate
  siblings).
- **Generic 500 catch** — single static string
  `'Failed to update subscription'`, NO substring
  detection (matches cancel + reactivate siblings).
- **Body-completely-ignored invariance walk** —
  every body permutation produces the EXACT same
  status AND envelope on unauth.
- **Cross-subscription-ID invariance walk** — the
  unauth response must be IDENTICAL across
  distinct subscription IDs (pinning that the
  tenant-scoped DB read AND the user-id equality
  check are NOT entered upstream of the auth gate).

## Why this spec is the user-scoped-IDOR + three-state-400 + PaymentPlan-enum stripe-subscription-update smoke

The route under test
([`apps/web/app/api/stripe/subscription/[subscriptionId]/update/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscription/[subscriptionId]/update/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user`
   → 401 `{ error: 'Unauthorized' }` (bare
   envelope).
2. **`{ newPlanId, newPriceId } = await request.
   json()`** — body parse AFTER the auth gate.
3. **`{ subscriptionId } = await params`** —
   dynamic-segment route param resolution.
4. **PaymentPlan-enum-includes validation** —
   `!Object.values(PaymentPlan).includes
   (newPlanId)` → 400 `'Invalid plan ID'`.
5. **`getOrCreateStripeProvider()` singleton
   initialization** AFTER the validation step.
6. **Tenant-scoped DB IDOR check + user-id equality
   check** — `getSubscriptionByProviderSubscriptionId
   ('stripe', subscriptionId)` returns null OR
   `userSubscription.userId !== session.user.id` →
   404 `'Subscription not found or access denied'`.
7. **THREE-state pre-check 400** —
   `subscription.status !== 'active' &&
   subscription.status !== 'pending' &&
   subscription.status !== 'paused'` → 400
   `'Subscription is not active'`.
8. **`stripeProvider.updateSubscription({
   subscriptionId, priceId: newPriceId })`** —
   load-bearing provider call.
9. **`getTenantId()` resolution + DB UPDATE with
   conditional tenant filter** —
   `db.update(subscriptions).set({ planId,
   priceId, updatedAt }).where(and(eq
   (subscriptions.subscriptionId, subscriptionId),
   ...(tenantId ? [eq(subscriptions.tenantId,
   tenantId)] : [])))`.
10. **Async email side-effect** —
    `paymentEmailService.
    sendSubscriptionPlanChangedEmail({
    customerName, customerEmail, oldPlanName:
    subscription.planId, newPlanName: newPlanId,
    subscriptionId, ... })` wrapped in try/catch
    (failure does NOT fail the update).
11. **Success payload** — `{ success: true, data:
    <updatedSubscription>, message: 'Plan updated
    to ${newPlanId} successfully' }` with status
    200.
12. **Generic 500 catch** — `{ error: 'Failed to
    update subscription' }`.
13. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~14
bodies) and **fifteen hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                  | ~9 headers including `X-User-Id` user-scope probe AND `X-Tenant-Id` tenant-scope probe.                                                |
| Body bulk-loop walk                                                                                    | ~14 bodies covering required-field probes, PaymentPlan-enum probes (invalid plan, empty / numeric / null newPlanId), bypass attempts.  |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                         | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key', …)`                                                | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                              | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                       | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('… does NOT echo the dynamic success message on the unauth branch', …)`                         | Pins the no-`Plan updated to .+ successfully`-leak invariant via regex.                                                                |
| `test('… does NOT echo the caller-supplied newPlanId / newPriceId on the unauth branch', …)`           | Pins the no-input-echo invariant — caller-supplied attacker markers must NEVER appear in the unauth response body.                     |
| `test('… has a stable status across header / body permutations', …)`                                   | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk including `X-User-Id` AND `X-Tenant-Id` probes.                                                                      |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                              | Pins the gate-before-body-parse contract.                                                                                              |
| `test('… body-parse JSON-parse error is NOT entered on the unauth branch', …)`                         | Pins the no-500-from-body-parse-error invariant — auth gate fires FIRST on malformed JSON.                                             |
| `test('… PaymentPlan-enum-includes validation is NOT entered on the unauth branch', …)`               | Pins the gate-before-enum-validation order — the 400 `'Invalid plan ID'` must NEVER fire on unauth.                                    |
| `test('… user-scoped IDOR check is NOT entered on the unauth branch', …)`                             | Pins the gate-before-user-IDOR order — the 404 `'Subscription not found or access denied'` must NEVER fire on unauth.                  |
| `test('… THREE-state pre-check 400 is NOT entered on the unauth branch', …)`                          | Pins the gate-before-state-machine-400 order — the 400 `'Subscription is not active'` must NEVER fire on unauth.                       |
| `test('… updateSubscription / DB-update / email-send chain is NOT entered on the unauth branch', …)`  | Pins the gate-before-multi-step-write order.                                                                                           |
| `test('… catch-branch generic-500 is NOT echoed on the unauth branch', …)`                            | Pins the no-`'Failed to update subscription'`-leak invariant.                                                                          |
| `test('… body is COMPLETELY ignored on the unauth branch', …)`                                        | Pins the body-completely-ignored invariance — every body permutation produces the EXACT same status AND envelope.                      |
| `test('… unauth status is invariant across distinct subscription IDs', …)`                            | Pins that the tenant-scoped DB read AND the user-id equality check are NOT entered upstream of the auth gate.                          |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~23 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no other keys.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant** across the
   four candidate messages.
6. **No-dynamic-success-message-leak invariant** —
   the `Plan updated to .+ successfully` template
   must NEVER appear on unauth (regex match).
7. **No-input-echo invariant** — caller-supplied
   `newPlanId` / `newPriceId` markers must NEVER
   appear in the unauth response body.
8. **Status invariance across body permutations**.
9. **Side-channel isolation** including `X-User-Id`
   AND `X-Tenant-Id`.
10. **Cross-method invariance**.
11. **Gate-before-body-parse invariant** — malformed
    JSON bodies must NOT 5xx.
12. **No-500-from-body-parse-error invariant** —
    auth gate fires FIRST on malformed JSON.
13. **Gate-before-PaymentPlan-enum invariant** —
    the 400 `'Invalid plan ID'` validation is NOT
    entered on unauth.
14. **Gate-before-user-IDOR invariant** — the 404
    `'Subscription not found or access denied'`
    user-id equality check is NOT entered on unauth.
15. **Gate-before-state-machine-400 invariant** —
    the 400 `'Subscription is not active'` THREE-
    state pre-check is NOT entered on unauth.
16. **Gate-before-multi-step-write invariant** —
    `updateSubscription` / DB update with
    conditional tenant filter / email send chain is
    NOT entered on unauth.
17. **No-generic-500-leak invariant** — the
    `'Failed to update subscription'` catch
    message must NEVER appear on unauth.
18. **Body-completely-ignored invariant** — every
    body permutation produces the EXACT same status
    AND envelope.
19. **Cross-subscription-ID invariance** — distinct
    sub IDs produce IDENTICAL unauth responses,
    pinning that the tenant-scoped DB read AND the
    user-id equality check are NOT entered upstream
    of the gate.

## See also

- The Stripe subscription-cancel POST sibling
  [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  documents NO IDOR at all (a Q-010-style finding);
  this update spec documents the user-scoped IDOR
  end of the spectrum.
- The Stripe subscription-reactivate POST sibling
  [`stripe-subscription-id-reactivate-body-spec.md`](stripe-subscription-id-reactivate-body-spec.md)
  documents the TENANT-ONLY (partial) IDOR end of
  the spectrum and a SINGLE-flag pre-check 400;
  this update spec documents the FULL user-scoped
  IDOR and a THREE-state pre-check 400.
- The LemonSqueezy update-plan POST sibling
  [`lemonsqueezy-update-plan-body-spec.md`](lemonsqueezy-update-plan-body-spec.md)
  uses a Zod `safeParse` multi-field schema for its
  validation chain; this Stripe update spec uses
  `Object.values(PaymentPlan).includes(...)` raw
  enum-membership validation (DISTINCT validation
  source).
- The Polar subscription-cancel POST sibling
  [`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
  enforces full user-scoped IDOR via `getCustomerId`
  + `subscriptionCustomerId === userPolarCustomerId`;
  this Stripe update spec enforces full user-scoped
  IDOR via `userSubscription.userId === session.
  user.id` (DISTINCT IDOR-check shape — Polar uses
  customer-id-equality, Stripe update uses user-
  id-equality).
- The Stripe webhook signature-verified POST sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [`docs/questions.md`](../questions.md) — the
  Q-### entries tracking the Stripe subscription
  IDOR-spectrum findings (Q-010-family).
