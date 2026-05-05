---
id: stripe-payment-intent-body-spec
title: E2E Stripe Payment-Intent Body Spec (apps/web-e2e/tests/api/stripe-payment-intent-body.spec.ts)
sidebar_label: E2E Stripe Payment-Intent Body Spec
sidebar_position: 574
---

# E2E Stripe Payment-Intent Body Spec — `apps/web-e2e/tests/api/stripe-payment-intent-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe payment-intent creation POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-payment-intent-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-payment-intent-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **NO-body-validation
contract** — the handler destructures
`{ amount, currency = 'usd', metadata, planId }` from
the body and passes them straight to
`stripeProvider.createPaymentIntent(...)` with NO
`if (!amount)` check, NO Zod validation, NO type
checking. EVERY prior per-source-file POST smoke has
at least one body-validation gate. This is the FIRST
trust-the-body POST contract in the rollout.

It is also the **second per-source-file POST smoke**
that pins a **raw payment-provider object as the
success payload** (after
[`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md))
— `return NextResponse.json(paymentIntent)` returns
the Stripe PaymentIntent object verbatim, NO wrapper
envelope. The PaymentIntent's `client_secret` field
is the same critical-leak vector as setup-intent.

## What's distinct from the stripe-setup-intent sibling

- **Body destructure with currency default:**
  `{ amount, currency = 'usd', metadata, planId }`
  pulls four fields from the body. setup-intent is
  zero-arg.
- **Caller-controlled metadata spread:** `metadata:
  { userId, planId, ...metadata }` — the caller's
  `metadata.userId` OVERRIDES the session userId
  because `...metadata` spreads AFTER. The smoke
  spec pins that this risk-surface metadata is NEVER
  reached on the unauth branch.
- **Trust-the-body contract:** no validation gate.
- **GET sibling** with `?payment_intent_id=` query-
  param-required check.

## What's distinct from EVERY prior POST smoke

- **NO-body-validation contract:** the FIRST trust-
  the-body POST contract.
- **Bare 401 envelope** `{ error: 'Unauthorized' }`
  matches setup-intent sibling — distinct from the
  canonical `{ success: false, error }` envelope.
- **Raw PaymentIntent object as success payload**
  with `client_secret` exposure vector.
- **Caller-controlled metadata spread** allows the
  caller to override the session userId in the
  PaymentIntent's metadata via `metadata: { userId:
  'other' }`.

## Why this spec is the trust-the-body + raw-PaymentIntent + metadata-spread smoke

The route under test
([`apps/web/app/api/stripe/payment-intent/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-intent/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 `{ error: 'Unauthorized' }` (bare envelope).
2. **JSON body parse** via destructured `await
   request.json()` AFTER the auth gate (NO try/catch,
   NO validation).
3. **`getOrCreateStripeProvider()` singleton
   initialization**.
4. **`stripeProvider.getCustomerId(session.user)`
   lookup** — null → 400 `{ error: 'Failed to create
   customer' }`.
5. **`stripeProvider.createPaymentIntent(...)`** —
   load-bearing call. Metadata includes the caller-
   controlled spread `{ userId, planId, ...metadata }`.
6. **Success payload** — raw PaymentIntent object
   (NO wrapper envelope) with status 200.
7. **Outer catch** — 500 `{ error: 'Failed to create
   payment intent' }`.
8. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~15
bodies) and **thirteen hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of STRIPE_PAYMENT_INTENT_HEADERS) test(…)`                              | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of STRIPE_PAYMENT_INTENT_BODIES) test(…)`                                  | Bulk-loop walk of every plausible body shape (~15 bodies covering required-field probes, type-violation probes, metadata override).    |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                         | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key (NO success key)', …)`                               | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                              | Negative-property assertion: PaymentIntent fields must NOT appear.                                                                     |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                        | Pins the gate-before-post-auth order across two candidate messages.                                                                    |
| `test('… does NOT echo a PaymentIntent client_secret on the unauth branch', …)`                        | CRITICAL security invariant — the PaymentIntent's `client_secret` must NEVER leak.                                                     |
| `test('… does NOT echo any Stripe PaymentIntent fields on the unauth branch', …)`                      | Pins the full set of PaymentIntent fields as forbidden on unauth.                                                                      |
| `test('… caller-supplied metadata.userId is NOT echoed on the unauth branch', …)`                      | Pins that the metadata spread (`{ userId, planId, ...metadata }`) is NEVER reached on unauth.                                          |
| `test('… has a stable status across header / body permutations', …)`                                   | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                                  | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                              | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… createPaymentIntent + getCustomerId are NOT entered on the unauth branch', …)`                | Pins the gate-before-provider-call order — CRITICAL: the `client_secret` must NEVER appear on the unauth branch.                       |
| `test('… catch-branch message is NOT echoed on the unauth branch', …)`                                 | Pins the gate-before-catch order.                                                                                                      |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~24 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no `success`/`message` leak.
4. **No-PaymentIntent-`client_secret`-leak invariant**
   (CRITICAL).
5. **No-PaymentIntent-fields-leak invariant** for the
   full set of fields (`id` / `client_secret` /
   `status` / `amount` / `currency` / `customer`).
6. **No-metadata-userId-spread-leak invariant** —
   caller-supplied `metadata.userId` must NEVER
   appear on the unauth branch.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance**.
10. **Gate-before-body-parse invariant** — malformed
    JSON does NOT downgrade the unauth 401.
11. **Gate-before-provider-call invariant**.
12. **Gate-before-catch invariant**.

## See also

- The Stripe setup-intent POST sibling
  [`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md)
  uses a zero-argument handler signature; this
  payment-intent spec uses a body-destructure handler.
- The Stripe checkout POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md)
  uses a TWO-key 401 envelope (NOT bare like this
  payment-intent spec).
- The Stripe webhook signature-verified POST sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
