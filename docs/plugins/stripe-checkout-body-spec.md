---
id: stripe-checkout-body-spec
title: E2E Stripe Checkout Body Spec (apps/web-e2e/tests/api/stripe-checkout-body.spec.ts)
sidebar_label: E2E Stripe Checkout Body Spec
sidebar_position: 567
---

# E2E Stripe Checkout Body Spec — `apps/web-e2e/tests/api/stripe-checkout-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated Stripe checkout-session creation POST
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-checkout-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-checkout-body.spec.ts).

This is the **fourth and final per-source-file POST
smoke for an auth-gated payment-provider checkout
endpoint** the docs tree publishes — completing the
checkout quartet (after
[`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md),
[`polar-checkout-body-spec.md`](polar-checkout-body-spec.md),
and
[`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md)).

## What's distinct from ALL three siblings

- **Three-way mode ternary mapping:** `mode ===
  'one_time' ? 'payment' : mode === 'subscription' ?
  'subscription' : 'setup'` — UNIQUE: unknown mode
  values fall through to the `'setup'` Stripe mode
  (Setup Intent flow). Distinct from polar's two-way
  subscription/one_time dispatch and
  lemonsqueezy/solidgate which take whatever mode the
  body provides.
- **Trial-amount validation:** `hasTrial =
  trialPeriodDays > 0 && isAuthorizedTrialAmount`; if
  `hasTrial && !trialAmountId` → 400 `{ error:
  'Invalid trial configuration', message:
  'trialAmountId is required when trial is enabled' }`.
  The FIRST per-source-file POST smoke that pins a
  trial-config validation contract.
- **Helper-function pipeline:** the handler chains
  `buildCheckoutLineItems(...)`,
  `createBaseCheckoutParams(...)`, and
  `applySubscriptionConfig(...)` from the co-located
  `./helpers` module. The FIRST per-source-file POST
  smoke that pins a multi-helper assembly pipeline.
- **`safeErrorMessage` (NOT `safeErrorResponse`) in
  catch:** the outer catch uses `safeErrorMessage
  (error, 'Failed to create checkout session')` to
  extract the message and wraps it in a manual 500
  envelope with `{ error, message, details: <dev-
  only-stack> }`. Distinct from polar's
  `safeErrorResponse(...)` and solidgate's
  `safeErrorMessage(...)` — stripe-checkout returns
  THREE keys on catch (matching solidgate's success-
  branch shape).
- **Stripe SDK direct call:** the handler calls
  `stripe.checkout.sessions.create(checkoutParams)`
  via `stripeProvider.getStripeInstance()`. The FIRST
  per-source-file POST smoke that pins a direct-SDK-
  instance access contract via a public method (NOT
  private property `as any` like polar's one_time
  branch).
- **`!session?.user` gate** (matches polar +
  solidgate; distinct from lemonsqueezy's
  `!session?.user?.id`).

## Why this spec is the three-way-mode + trial-config + helper-pipeline checkout POST smoke

The route under test
([`apps/web/app/api/stripe/checkout/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/checkout/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`auth()` session lookup** — load-bearing first
   gate. `!session?.user` → 401 `{ error:
   'Unauthorized', message: 'Authentication
   required' }` (TWO-key envelope).
2. **`getOrCreateStripeProvider()` +
   `getStripeInstance()`** — happens AFTER the auth
   gate.
3. **JSON body parse via destructured `await
   request.json()`** AFTER the auth gate — NO per-
   call try/catch (matches polar).
4. **Three-way mode ternary mapping** — `'payment' |
   'subscription' | 'setup'`.
5. **`stripeProvider.getCustomerId(session.user)`
   lookup** — failure → 400 `{ error: 'Failed to
   create customer', message: 'Unable to create
   Stripe customer' }`.
6. **Trial-config validation** — `hasTrial &&
   !trialAmountId` → 400 `{ error: 'Invalid trial
   configuration', message: 'trialAmountId is
   required when trial is enabled' }`.
7. **Helper-function pipeline** —
   `buildCheckoutLineItems(priceId, trialAmountId,
   hasTrial)`, `createBaseCheckoutParams(...)`,
   `applySubscriptionConfig(...)` (subscription
   only).
8. **`stripe.checkout.sessions.create
   (checkoutParams)`** — load-bearing Stripe SDK
   call.
9. **Success payload** — `{ data: { id, url },
   status: 200, message: 'Checkout session created
   successfully' }` (literal `status: 200` field).
10. **Outer catch** — `safeErrorMessage(error,
    'Failed to create checkout session')` →
    `{ error: <safe>, message: 'Failed to create
    checkout session', details: <dev-only-stack> }`
    with status 500.
11. **Method-resolution surface** — the route exports
    `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
    round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~10 headers + ~16
bodies) and **thirteen hand-written scenarios**.

| Block                                                                                                 | Purpose                                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of STRIPE_CHECKOUT_HEADERS) test(…)`                                   | Bulk-loop walk of every plausible header shape (~10 headers).                                                                          |
| `for (const { data, label } of STRIPE_CHECKOUT_BODIES) test(…)`                                       | Bulk-loop walk of every plausible body shape (~16 bodies covering all three mode branches, trial-config probes, bypass attempts).      |
| `test('… returns 401 with the two-key Unauthorized envelope', …)`                                     | Pins the canonical envelope `{ error: 'Unauthorized', message: 'Authentication required' }`.                                           |
| `test('… envelope shape has exactly error and message keys', …)`                                      | Strict envelope-shape assertion: TWO keys, no `success` discriminant, no `details` leak.                                               |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                             | Negative-property assertion: `data` key must NOT appear; literal `status: 200` must NOT appear.                                        |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                       | Pins the gate-before-post-auth order across four candidate static messages.                                                            |
| `test('… has a stable status across header / body permutations', …)`                                  | Seven body permutations vs the no-body baseline.                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                      | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                                 | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                             | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… trial-config validation is NOT entered on the unauth branch', …)`                            | Pins the gate-before-trial-config-validation order: the unauth response must NEVER echo `'Invalid trial configuration'`.               |
| `test('… mode-ternary (payment / subscription / setup) is NOT entered on the unauth branch', …)`     | Pins the gate-before-mode-dispatch order: all three mode branches must NEVER produce a `data.url` on the unauth branch.                |
| `test('… helper-pipeline + stripe.checkout.sessions.create are NOT entered on the unauth branch', …)` | Pins the gate-before-helper-pipeline order: the SDK call must NEVER run on the unauth branch.                                          |
| `test('… catch-branch is NOT entered on the unauth branch', …)`                                       | Pins that the outer catch's `details` field (dev-only stack) must NEVER appear on the unauth branch.                                   |
| `test('… caller-supplied successUrl / cancelUrl values are NOT echoed on the unauth branch', …)`      | Pins XSS-shaped redirect URLs are NEVER echoed back.                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **Two-key envelope** `{ error: 'Unauthorized',
   message: 'Authentication required' }` on the
   unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` + `message` keys, no `success` or
   `details` leak.
4. **Success-branch-key non-disclosure** — `data` key
   and literal `status: 200` must NOT appear in any
   unauth response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — PUT / PATCH /
   DELETE return `< 500` (Next.js 405).
9. **Gate-before-body-parse invariant**.
10. **Gate-before-trial-config-validation invariant**.
11. **Gate-before-mode-dispatch invariant** for all
    three modes.
12. **Gate-before-helper-pipeline invariant**.
13. **Catch-branch-not-entered invariant** —
    `details` (dev-only stack) must NEVER appear on
    the unauth branch.
14. **No-redirect-leak invariant** — caller-supplied
    XSS-shaped `successUrl` / `cancelUrl` values must
    NEVER appear in the unauth response.

## See also

- The first auth-gated checkout POST smoke
  [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
  uses Zod `safeParse` and a 500-default catch.
- The second auth-gated checkout POST smoke
  [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)
  uses simple `if (!productId)` and a mode-dispatched
  branching contract.
- The third auth-gated checkout POST smoke
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md)
  uses a custom validator and four-string-scan catch
  with three different status codes.
- The Stripe webhook companion
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md)
  covers the signature-verified webhook on the same
  provider (different gate posture).
- The multi-provider sibling
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
  covers all four providers' checkout endpoints with
  a single `< 500` assertion each.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
