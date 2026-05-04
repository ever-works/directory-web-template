---
id: stripe-payment-methods-delete-body-spec
title: E2E Stripe Payment-Methods Delete Body Spec (apps/web-e2e/tests/api/stripe-payment-methods-delete-body.spec.ts)
sidebar_label: E2E Stripe Payment-Methods Delete Body Spec
sidebar_position: 585
---

# E2E Stripe Payment-Methods Delete Body Spec — `apps/web-e2e/tests/api/stripe-payment-methods-delete-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe payment-method-delete DELETE body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-payment-methods-delete-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-payment-methods-delete-body.spec.ts).

This is the **first per-source-file DELETE smoke**
the docs tree publishes for a non-admin payment-
method route. Note: the route's mutation method is
DELETE (NOT POST as is typical for other payment-
method mutations).

It is also the **first per-source-file mutating
smoke** that pins a **multi-helper-function-
extraction handler design** — the handler delegates
to FIVE helper functions: `validateSession`,
`validatePaymentMethodOwnership`,
`handleDefaultPaymentMethodReassignment`,
`checkAffectedSubscriptions`, and `handleApiError`.

It is also the **first per-source-file mutating
smoke** that pins a **customer-metadata-driven IDOR
check** — the handler retrieves the Stripe customer
associated with the payment method and verifies
`customer.metadata?.userId === userId` → 403 if
mismatch. Distinct from polar/cancel which matches
`subscriptionCustomerId === userPolarCustomerId`.

## What's distinct from the stripe-payment-methods-create sibling

- **DELETE method** (not POST).
- **ONE-key 401 envelope** `{ success: false, error:
  'Authentication required' }` — distinct from
  create which uses `{ success: false, error:
  'Unauthorized' }` (different message).
- **Multi-helper-function-extraction design** — 5
  helpers vs create's inline orchestration.
- **Customer-metadata IDOR check** vs create's no-
  IDOR (create just attaches whatever setupIntent
  the caller references).
- **Stripe-error-echo with `'Stripe error: '`
  prefix** — UNIQUE: distinct from create which
  echoes the raw stripe error message.
- **Default-payment-method reassignment side-
  effect** — if the deleted method was the default,
  the handler picks a remaining method OR clears
  the default.
- **Affected-subscriptions count** — read-only
  count of active subscriptions using the deleted
  method.

## Why this spec is the helper-function-extraction + customer-metadata-IDOR DELETE smoke

The route under test
([`apps/web/app/api/stripe/payment-methods/delete/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-methods/delete/route.ts))
exports only `DELETE`. The handler combines:

1. **`validateSession()` helper** — `!session?.user
   ?.id` → 401 `{ success: false, error:
   'Authentication required' }`.
2. **JSON body parse** via `await request.json()`
   AFTER auth gate.
3. **`deletePaymentMethodSchema.parse(body)`** —
   Zod throwing parse. Failure → caught by
   `handleApiError(error, 'delete payment method')`
   as `z.ZodError` → 400 with structured `details:
   [{path, message}]`.
4. **`validatePaymentMethodOwnership(paymentMethodId,
   userId)` helper** — three-stage chain:
   - `paymentMethods.retrieve` → if no customer →
     400 `'Payment method not associated with a
     customer'`.
   - `customers.retrieve` → if string-or-deleted →
     404 `'Customer not found'`.
   - `customer.metadata?.userId !== userId` → 403
     `'Access denied: payment method does not
     belong to user'`.
5. **`handleDefaultPaymentMethodReassignment` side-
   effect** — if the deleted method was the
   default, picks a remaining method OR clears the
   default.
6. **`checkAffectedSubscriptions` count** — read-
   only count of active subscriptions using the
   deleted method.
7. **`stripe.paymentMethods.detach(paymentMethodId)`**
   — load-bearing detachment call.
8. **Success payload** — `{ success: true, message:
   'Payment method deleted successfully', data: {
   was_default, affected_subscriptions,
   new_default_payment_method } }`.
9. **`handleApiError` THREE-helper catch
   dispatcher** — `z.ZodError` → 400 with
   structured `details`, `Stripe.errors.StripeError`
   → status from `error.statusCode` (defaults to
   400) with `'Stripe error: '`-prefixed message,
   default → 500 with operation name.
10. **Method-resolution surface** — the route
    exports ONLY `DELETE`. `GET` / `POST` / `PUT` /
    `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~8 headers + ~11
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~8 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                | ~11 bodies covering required-field probes, type-violation probes, bypass attempts.                                                     |
| `test('… returns 401 with the canonical Authentication required envelope', …)`                     | Pins the canonical envelope `{ success: false, error: 'Authentication required' }`.                                                    |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data` key (with `was_default` / `affected_subscriptions` / `new_default_payment_method`) must NOT appear. |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across six candidate messages.                                                                    |
| `test('… does NOT echo Stripe-error-prefix on the unauth branch', …)`                              | Pins that the unauth branch's error message NEVER starts with `'Stripe error:'`.                                                       |
| `test('… has a stable status across header / body permutations', …)`                               | Four body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / POST / PUT / PATCH) does NOT 5xx', …)`                          | Method-resolution walk. DELETE is the only exported method.                                                                            |
| `test('… Zod-throw catch is NOT entered on the unauth branch', …)`                                 | Pins that the throw-Zod 400 with structured `details` NEVER fires on unauth.                                                           |
| `test('… ownership-check helper / detach / reassignment / sub-count are NOT entered on the unauth branch', …)` | Pins the gate-before-helper-orchestration order — CRITICAL: `paymentMethods.detach` must NEVER run on unauth (catastrophic).           |
| `test('… caller-supplied paymentMethodId is NOT echoed on the unauth branch', …)`                  | Pins XSS-shaped `paymentMethodId` (`pm_<script>alert(1)</script>`) is NEVER echoed back.                                               |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~19 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Authentication required' }` on the unauth
   branch.
3. **Strict envelope-shape preservation** — exactly
   `success` + `error` keys, no `message`/`data`/
   `details` leak.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **No-Stripe-error-prefix invariant** — the
   unauth response NEVER starts with `'Stripe
   error:'`.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — DELETE is the only
   exported method; the four other HTTP verbs must
   round-trip to `< 500`.
10. **Gate-before-Zod-throw invariant**.
11. **Gate-before-helper-orchestration invariant**
    (CRITICAL — `paymentMethods.detach` must NEVER
    run on unauth).
12. **No-paymentMethodId-leak invariant** — XSS-
    shaped `paymentMethodId` is NEVER echoed back.

## See also

- The Stripe payment-methods create POST sibling
  [`stripe-payment-methods-create-body-spec.md`](stripe-payment-methods-create-body-spec.md)
  uses the same throw-Zod pattern but with inline
  orchestration (this delete uses helper-function
  extraction).
- The Stripe webhook signature-verified POST
  sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- The Stripe checkout POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md).
- The per-comment edit/delete sibling
  [`item-comments-id-method-spec.md`](item-comments-id-method-spec.md)
  is another DELETE smoke (with PUT) but uses
  plain-text 401 envelopes (this Stripe DELETE uses
  JSON envelope).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
