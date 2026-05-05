---
id: stripe-payment-methods-id-method-spec
title: E2E Stripe Payment-Methods [id] Method Spec (apps/web-e2e/tests/api/stripe-payment-methods-id-method.spec.ts)
sidebar_label: E2E Stripe Payment-Methods [id] Method Spec
sidebar_position: 588
---

# E2E Stripe Payment-Methods [id] Method Spec — `apps/web-e2e/tests/api/stripe-payment-methods-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe per-id payment-method GET + DELETE dual-method
dynamic-segment / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-payment-methods-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-payment-methods-id-method.spec.ts).

This is the **first per-source-file GET + DELETE dual-
method smoke** the docs tree publishes for any Stripe
per-id primitive route. Sibling specs:

- [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
  — DELETE-by-body on the static `/delete` path (NO
  dynamic segment, id in body).
- [`stripe-setup-intent-id-query-spec.md`](stripe-setup-intent-id-query-spec.md)
  — GET-only on a dynamic-segment per-id path (no
  DELETE).
- [`stripe-payment-methods-update-method-spec.md`](stripe-payment-methods-update-method-spec.md)
  — PUT + PATCH dual-method smoke on a STATIC
  `/update` path (no dynamic segment).

## What's distinct from EVERY prior per-id Stripe smoke

- **TWO methods exported on the same dynamic-segment
  path:** GET (retrieve filtered fields) AND DELETE
  (detach + default-reassignment cascade). The FIRST
  per-source-file GET + DELETE dual-method smoke
  pinning both methods on the same `[id]` route.
- **Customer-metadata-driven IDOR check on BOTH
  methods** via `customer.metadata?.userId !==
  session.user.id` → 403 `'Unauthorized - payment
  method does not belong to user'`.
- **`!paymentMethod.customer` check** — distinct for
  each method:
  - GET: 400 `'Payment method not associated with
    any customer'` (with **`any`**).
  - DELETE: 400 `'Payment method not associated with
    a customer'` (with **`a`**).

  UNIQUE: the only known per-source-file smoke pinning
  a one-word article-shift (`any` vs `a`) between two
  methods on the same handler.
- **DELETE default-reassignment cascade** — if the
  deleted method was the customer's default and there
  are other methods, re-assign default to the first
  remaining method; if there are no remaining methods,
  set default to `undefined`. The FIRST per-source-
  file DELETE smoke pinning a default-reassignment
  cascade.
- **THREE-branch StripeError catch on BOTH methods**
  — `error.code === 'resource_missing'` → 404
  `'Payment method not found'`; other `StripeError` →
  400 with raw `error.message`; default → 500
  (`'Failed to retrieve payment method'` for GET,
  `'Failed to delete payment method'` for DELETE).

## Why this spec is the per-id Stripe payment-method GET + DELETE smoke

The route under test
([`apps/web/app/api/stripe/payment-methods/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-methods/[id]/route.ts))
exports BOTH `GET` and `DELETE`. The handler chain on
each method combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized' }`.
   SAME envelope on BOTH methods.
2. **`{ id } = await params`** dynamic-segment
   resolution.
3. **`!id` check** — 400 `{ success: false, error:
   'Payment method ID is required' }`. SAME on both.
4. **`stripe.paymentMethods.retrieve(id)`** — load-
   bearing call on BOTH methods.
5. **`!paymentMethod.customer` check on DELETE** /
   **`paymentMethod.customer ? … : else` branch on
   GET** — diverges on this critical structural
   difference between the two methods.
6. **`stripe.customers.retrieve(...)`** — second
   load-bearing call on BOTH methods.
7. **String-or-deleted customer check** → 404
   `'Customer not found'` on both methods.
8. **Customer-metadata IDOR check** → 403 on both
   methods (same message).
9. **DELETE-only**: default-reassignment cascade via
   `stripe.paymentMethods.list` +
   `stripe.customers.update`.
10. **DELETE-only**: `stripe.paymentMethods.detach
    (id)` — the actual mutation.
11. **GET success payload** — filtered fields:
    `{ id, type, card, billing_details, created,
    metadata, is_default, customer_id }`.
12. **DELETE success payload** — `{ success: true,
    message: 'Payment method deleted successfully',
    data: { was_default } }`.
13. **THREE-branch outer catch** on each method.
14. **Method-resolution surface** — the route
    exports `GET` AND `DELETE`. `POST` / `PUT` /
    `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two header bulk-loop walks** (~7
headers each, GET + DELETE) and **fifteen hand-
written scenarios**.

| Block                                                                                                                            | Purpose                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET header bulk-loop walk                                                                                                        | ~7 headers.                                                                                                        |
| DELETE header bulk-loop walk                                                                                                     | ~7 headers.                                                                                                        |
| `test('GET … returns 401 with the canonical Unauthorized envelope', …)`                                                          | Pins the canonical envelope on GET.                                                                                |
| `test('DELETE … returns 401 with the canonical Unauthorized envelope', …)`                                                       | Pins the canonical envelope on DELETE.                                                                             |
| `test('GET + DELETE … envelope-equality on the unauth branch', …)`                                                               | Cross-method response-parity assertion pinning byte-identical 401 envelopes.                                       |
| `test('GET … envelope shape has exactly success and error keys', …)`                                                             | Strict envelope-shape assertion on GET.                                                                            |
| `test('DELETE … envelope shape has exactly success and error keys', …)`                                                          | Strict envelope-shape assertion on DELETE (no leak of the success-branch `data` / `message` fields).               |
| `test('GET + DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`                                     | Pins the gate-before-post-auth order across nine candidate messages.                                               |
| `test('GET … does NOT leak filtered SUCCESS payload fields on the unauth branch', …)`                                            | CRITICAL — pins the gate-before-success-build order on GET.                                                        |
| `test('DELETE … does NOT leak was_default field on the unauth branch', …)`                                                       | CRITICAL — pins the gate-before-success-build order on DELETE.                                                     |
| `test('GET + DELETE … does NOT branch on side-channel cookies / headers', …)`                                                    | Side-channel walk.                                                                                                 |
| `test('GET + DELETE … cross-method probe (POST / PUT / PATCH) does NOT 5xx', …)`                                                 | Method-resolution walk. GET + DELETE are the only exported methods.                                                |
| `test('GET + DELETE … paymentMethods.retrieve / customers.retrieve / IDOR / detach / default-reassignment are NOT entered …', …)` | CRITICAL — pins that load-bearing Stripe SDK calls NEVER run on unauth.                                            |
| `test('GET + DELETE … catch-branch dispatcher is NOT entered on the unauth branch', …)`                                          | Pins the gate-before-catch-dispatcher order across distinct 500 messages per method.                               |
| `test('GET + DELETE … no-stripe-error-message-leak invariant on the unauth branch', …)`                                          | Pins that no stripe-error-message substring (`'No such payment_method'`, `'resource_missing'`) leaks on unauth.    |
| `test('GET + DELETE … cross-id invariance — different IDs produce IDENTICAL unauth envelope', …)`                                | Pins that the unauth 401 envelope is IDENTICAL across three different payment-method IDs on BOTH methods.          |
| `test('GET + DELETE … caller-supplied id with XSS is NOT echoed on the unauth branch', …)`                                       | Pins that no XSS-payload substring of the caller-supplied dynamic segment leaks into the unauth envelope.          |
| `test('DELETE … default-reassignment cascade is NOT entered on the unauth branch', …)`                                           | CRITICAL — pins that the customer-default mutation cascade NEVER runs on unauth.                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation on BOTH methods round-trips to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch on BOTH
   methods.
3. **Cross-method envelope-equality** — GET and
   DELETE 401 envelopes are byte-identical.
4. **Strict envelope-shape preservation** on both
   methods.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-success-build invariant on GET**
   (CRITICAL — no leak of `card` / `billing_details` /
   `is_default` / `customer_id`).
7. **Gate-before-success-build invariant on DELETE**
   (CRITICAL — no leak of `was_default`).
8. **Side-channel isolation**.
9. **Cross-method invariance** — GET + DELETE are
   the only exported methods.
10. **Gate-before-Stripe-SDK-calls invariant**
    (CRITICAL).
11. **Gate-before-catch-dispatcher invariant** —
    distinct 500 messages per method.
12. **No-stripe-error-message-leak invariant**.
13. **Cross-id invariance** — identical 401 envelope
    across different IDs on BOTH methods.
14. **No XSS-id-substring leak** on either method.
15. **Gate-before-default-reassignment-cascade
    invariant** (CRITICAL — pins that the customer-
    default mutation cascade NEVER runs on unauth).

## See also

- The Stripe payment-methods delete DELETE-by-body
  sibling
  [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
  uses a static `/delete` path with id-in-body
  (vs. this dynamic-segment route).
- The Stripe setup-intent GET-by-id sibling
  [`stripe-setup-intent-id-query-spec.md`](stripe-setup-intent-id-query-spec.md)
  uses the same customer-metadata-driven IDOR check
  on a GET-only dynamic-segment route.
- The Stripe payment-methods PUT + PATCH dual-method
  sibling
  [`stripe-payment-methods-update-method-spec.md`](stripe-payment-methods-update-method-spec.md)
  uses a different dual-method pair on a static
  path.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
