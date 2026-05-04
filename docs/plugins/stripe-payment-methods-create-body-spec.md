---
id: stripe-payment-methods-create-body-spec
title: E2E Stripe Payment-Methods Create Body Spec (apps/web-e2e/tests/api/stripe-payment-methods-create-body.spec.ts)
sidebar_label: E2E Stripe Payment-Methods Create Body Spec
sidebar_position: 575
---

# E2E Stripe Payment-Methods Create Body Spec — `apps/web-e2e/tests/api/stripe-payment-methods-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe payment-method-create-from-setup-intent
POST body / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-payment-methods-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-payment-methods-create-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **Zod `parse` (NOT
`safeParse`) contract** —
`createPaymentMethodSchema.parse(body)` THROWS on
validation failure and the outer catch detects
`error instanceof z.ZodError` to dispatch a 400
envelope. EVERY prior per-source-file POST smoke uses
`safeParse` to handle validation gracefully. This is
the FIRST throw-on-invalid Zod contract in the
rollout.

It is also the **first per-source-file POST smoke**
that pins a **Stripe-error-echo contract** in the
outer catch — `error instanceof Stripe.errors.
StripeError` → 400 `{ success: false, error: error.
message }` reflects the raw Stripe error message in
the response. EVERY prior catch uses static-string
messages.

## What's distinct from EVERY prior POST smoke

- **Zod `.parse(body)` (throwing):** the FIRST throw-
  on-invalid Zod contract.
- **Stripe-error-echo:** the FIRST POST smoke pinning
  a stripe-error-message-echoed-in-400 catch
  contract.
- **Multi-step Stripe SDK orchestration:**
  `setupIntents.retrieve` → conditional
  `customers.create` → conditional
  `paymentMethods.attach` → conditional
  `paymentMethods.update` → conditional
  `customers.update` (default payment method) →
  re-retrieve. The most complex stripe SDK
  orchestration in any per-source-file POST smoke.
- **Formatted response payload:** the success branch
  extracts `{ id, type, card: { brand, last4,
  exp_month, exp_year, funding } | null, created,
  metadata }` — NOT raw provider object. Distinct
  from setup-intent and payment-intent which return
  raw.

## Why this spec is the throw-Zod + multi-step-Stripe + stripe-error-echo smoke

The route under test
([`apps/web/app/api/stripe/payment-methods/create/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-methods/create/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized' }`
   (canonical one-key envelope).
2. **JSON body parse** via `await request.json()`
   AFTER auth gate (NO try/catch).
3. **`createPaymentMethodSchema.parse(body)`** — Zod
   throwing parse. Failure → caught by outer catch
   as `z.ZodError` → 400 `{ success: false, error:
   'Invalid request data', details: <ZodError> }`.
4. **`stripe.setupIntents.retrieve(setup_intent_id)`**
   — load-bearing call. Stripe error → caught by
   outer catch as `StripeError` → 400 with stripe-
   error-message echoed.
5. **`setupIntent.status !== 'succeeded'`** → 400
   `'Setup intent has not succeeded'`.
6. **`!setupIntent.payment_method`** → 400 `'No
   payment method found in setup intent'`.
7. **Get-or-create customer** via
   `getUserStripeCustomerId` /
   `saveUserStripeCustomerId`.
8. **Conditional attach** — `if (!paymentMethod.
   customer)` `paymentMethods.attach`.
9. **Conditional metadata update** — `if (metadata)`
   `paymentMethods.update`.
10. **Conditional default update** — `if (set_as
    _default)` `customers.update`.
11. **Re-retrieve** — second
    `paymentMethods.retrieve` for final state.
12. **Formatted success payload** — `{ success:
    true, data: <formatted>, message: 'Payment
    method created successfully' }`.
13. **THREE-branch outer catch** — `z.ZodError` →
    400 (with `details`), `StripeError` → 400 (with
    `error.message` echoed), default → 500 `'Failed
    to create payment method'`.
14. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~13
bodies) and **thirteen hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                  | ~9 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                    | ~13 bodies covering required-field probes, type-violation probes, metadata override, bypass attempts.                                  |
| `test('… returns 401 with the canonical Unauthorized envelope', …)`                                    | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                               |
| `test('… envelope shape has exactly success and error keys', …)`                                       | Strict envelope-shape assertion: NO `details` leak.                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                              | Negative-property assertion: `data` key must NOT appear.                                                                               |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                        | Pins the gate-before-post-auth order across five candidate messages.                                                                   |
| `test('… Zod-throw catch is NOT entered on the unauth branch', …)`                                     | Pins that the throw-Zod 400 with `details` field NEVER fires on unauth.                                                                |
| `test('… stripe-error-echo catch is NOT entered on the unauth branch', …)`                             | Pins that no stripe error message can leak in the unauth response.                                                                     |
| `test('… does NOT echo a Stripe payment-method id / card details on the unauth branch', …)`            | CRITICAL — pins that `card.last4` / `card.brand` / etc. are NEVER exposed on unauth.                                                   |
| `test('… caller-supplied metadata.userId is NOT echoed on the unauth branch', …)`                      | Pins that the metadata spread is NEVER reached on unauth.                                                                              |
| `test('… has a stable status across header / body permutations', …)`                                   | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk.                                                                                                                |
| `test('… multi-step Stripe orchestration is NOT entered on the unauth branch', …)`                     | Pins that the six Stripe SDK calls are NEVER reached on unauth.                                                                        |
| `test('… catch-branch generic 500 message is NOT echoed on the unauth branch', …)`                     | Pins that the default-catch `'Failed to create payment method'` 500 message is NEVER fired on unauth.                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~22 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-Zod-throw invariant** — the
   `'Invalid request data'` 400 with `details`
   must NEVER fire on unauth.
7. **Gate-before-stripe-error-echo invariant** —
   no stripe error message can leak on unauth.
8. **No-card-details-leak invariant** (CRITICAL) —
   `card.last4` / `card.brand` / etc. must NEVER
   appear.
9. **No-metadata-userId-spread-leak invariant**.
10. **Status invariance across body permutations**.
11. **Side-channel isolation**.
12. **Cross-method invariance**.
13. **Gate-before-multi-step-Stripe-orchestration
    invariant**.
14. **Gate-before-catch invariant**.

## See also

- The Stripe setup-intent POST sibling
  [`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md)
  is the source of the `setup_intent_id` consumed by
  this payment-methods/create POST.
- The Stripe payment-intent POST sibling
  [`stripe-payment-intent-body-spec.md`](stripe-payment-intent-body-spec.md)
  uses raw provider object as success payload (this
  spec uses formatted).
- The Stripe checkout POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
