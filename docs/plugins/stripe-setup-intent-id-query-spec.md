---
id: stripe-setup-intent-id-query-spec
title: E2E Stripe Setup-Intent [id] Query Spec (apps/web-e2e/tests/api/stripe-setup-intent-id-query.spec.ts)
sidebar_label: E2E Stripe Setup-Intent [id] Query Spec
sidebar_position: 587
---

# E2E Stripe Setup-Intent [id] Query Spec — `apps/web-e2e/tests/api/stripe-setup-intent-id-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe per-id setup-intent retrieval GET dynamic-
segment / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-setup-intent-id-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-setup-intent-id-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes for a Stripe per-id primitive
route (the setup-intent root POST is documented at
[`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md);
this is its dynamic-segment GET sibling).

It is also the **first per-source-file GET smoke**
that pins a **`error.code === 'resource_missing'`
substring detection** in the catch — UNIQUE: the
stripe-payment-methods-delete sibling uses
`error.statusCode` for prefix-message echoing; this
GET handler dispatches on Stripe's enum-typed `code`
property to surface a 404.

## What's distinct from the stripe-setup-intent (POST) root sibling

- **GET method** (not POST).
- **`!session?.user?.id` gate** with `{ success:
  false, error: 'Unauthorized' }` envelope (vs setup-
  intent root POST's `{ error: 'Unauthorized' }`
  ONE-key envelope without `success` key).
- **Customer-metadata-driven IDOR check** via
  `customer.metadata?.userId !== session.user.id` →
  403 `'Unauthorized - setup intent does not belong
  to user'`.
- **Filtered SetupIntent fields** in success payload
  — `{ id, client_secret, status, usage, customer,
  payment_method, created, metadata }`. Distinct
  from the POST root which returns the raw provider
  object.
- **Stripe-`error.code === 'resource_missing'`
  substring detection** in catch → 404 `'Setup
  intent not found'`. UNIQUE.

## Why this spec is the per-id Stripe setup-intent GET smoke

The route under test
([`apps/web/app/api/stripe/setup-intent/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/setup-intent/[id]/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized' }`.
2. **`{ id } = await params`** dynamic-segment
   resolution.
3. **`!id` check** — 400 `{ success: false, error:
   'Setup intent ID is required' }`.
4. **`stripe.setupIntents.retrieve(id)`** — load-
   bearing call.
5. **Customer-metadata IDOR check** — `stripe.customers.
   retrieve(setupIntent.customer)` → if string-or-
   deleted → 404 `'Customer not found'`; if
   `customer.metadata?.userId !== session.user.id`
   → 403.
6. **Success payload** — filtered SetupIntent
   fields.
7. **THREE-branch outer catch** — `error.code ===
   'resource_missing'` → 404; other `StripeError` →
   400 with raw `error.message`; default → 500
   `'Failed to retrieve setup intent'`.
8. **Method-resolution surface** — the route
   exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~7
headers) and **nine hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                | ~7 headers.                                                                                                                            |
| `test('… returns 401 with the canonical Unauthorized envelope', …)`                                  | Pins the canonical envelope.                                                                                                           |
| `test('… envelope shape has exactly success and error keys', …)`                                     | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo a SetupIntent client_secret on the unauth branch', …)`                        | CRITICAL — the SetupIntent's `client_secret` must NEVER leak.                                                                          |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                      | Pins the gate-before-post-auth order across five candidate messages.                                                                   |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                     | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                         | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… setupIntents.retrieve / customers.retrieve / IDOR check are NOT entered on the unauth branch', …)` | CRITICAL — pins that the load-bearing Stripe SDK calls NEVER run on unauth.                                                            |
| `test('… catch-branch dispatcher is NOT entered on the unauth branch', …)`                           | Pins the gate-before-catch-dispatcher order.                                                                                           |
| `test('… no-stripe-error-message-leak invariant on the unauth branch', …)`                           | Pins that no stripe-error-message substring (`'No such setupintent'`, `'resource_missing'`) leaks on unauth.                           |
| `test('… cross-id invariance — different IDs produce IDENTICAL unauth envelope', …)`                 | Pins that the unauth 401 envelope is IDENTICAL across three different setup-intent IDs (auth gate fires BEFORE any per-id branch).     |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **No-`client_secret`-leak invariant** (CRITICAL).
5. **Gate-before-post-auth invariant**.
6. **Side-channel isolation**.
7. **Cross-method invariance** — GET is the only
   exported method.
8. **Gate-before-Stripe-SDK-calls invariant**
   (CRITICAL).
9. **Gate-before-catch-dispatcher invariant**.
10. **No-stripe-error-message-leak invariant**.
11. **Cross-id invariance** — identical 401
    envelope across different IDs.

## See also

- The Stripe setup-intent POST root sibling
  [`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md)
  uses a zero-arg POST signature; this GET sibling
  uses a dynamic-segment param.
- The Stripe payment-methods delete DELETE sibling
  [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
  uses the same customer-metadata-driven IDOR check.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
