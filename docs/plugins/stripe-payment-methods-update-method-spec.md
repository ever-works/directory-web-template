---
id: stripe-payment-methods-update-method-spec
title: E2E Stripe Payment-Methods Update Method Spec (apps/web-e2e/tests/api/stripe-payment-methods-update-method.spec.ts)
sidebar_label: E2E Stripe Payment-Methods Update Method Spec
sidebar_position: 586
---

# E2E Stripe Payment-Methods Update Method Spec — `apps/web-e2e/tests/api/stripe-payment-methods-update-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe payment-method-update PUT + PATCH method /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-payment-methods-update-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-payment-methods-update-method.spec.ts).

This is the **first per-source-file PUT + PATCH
smoke** the docs tree publishes for a non-admin
payment-method route. Sibling to the
[`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
route which exports `DELETE`.

## What's distinct from EVERY prior mutating-method smoke

- **TWO mutation methods exported on the same path:**
  PUT (full update) AND PATCH (set-default-only).
  The FIRST per-source-file mutating smoke pinning a
  PUT + PATCH dual-method export.
- **Shared helper-function-extraction design** with
  the delete sibling — both PUT and PATCH use
  `validateSession`, `validatePaymentMethodOwnership`,
  and `handleApiError`.
- **Per-method field set:** PUT takes
  `{ payment_method_id, metadata, billing_details,
  set_as_default }`; PATCH takes
  `{ payment_method_id }` only.
- **PUT preserves existing metadata** via spread:
  `metadata: { ...paymentMethod.metadata,
  ...metadata, userId }`. The FIRST per-source-file
  PUT smoke pinning a metadata-merge contract.
- **`userId` always present in metadata** — PUT
  explicitly sets `userId` AFTER the spread,
  ensuring the caller cannot override it.

## Why this spec is the dual-method PUT + PATCH payment-methods-update smoke

The route under test
([`apps/web/app/api/stripe/payment-methods/update/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-methods/update/route.ts))
exports both `PUT` and `PATCH`. Both handlers share
the same auth + ownership chain:

1. **`validateSession()` helper** (shared with delete
   sibling) — `!session?.user?.id` → 401 `{ success:
   false, error: 'Authentication required' }`.
2. **JSON body parse** via `await request.json()`
   AFTER auth gate.
3. **PUT**: `updatePaymentMethodSchema.parse(body)` —
   Zod throwing parse for full-update fields.
   **PATCH**: `setDefaultPaymentMethodSchema.parse
   (body)` — simpler schema for default-only.
4. **`validatePaymentMethodOwnership(payment_method_id,
   userId)` helper** — same three-stage chain as
   delete sibling.
5. **PUT**: `stripe.paymentMethods.update(...)` with
   merged metadata + billing_details + optional set-
   as-default. **PATCH**: `stripe.customers.update
   (...)` with `invoice_settings.default_payment_method`.
6. **Success payload**:
   - PUT: `{ success: true, data:
     <formattedPaymentMethod>, message: 'Payment
     method updated successfully' }`.
   - PATCH: `{ success: true, message: 'Payment
     method set as default successfully' }` (NO
     `data` field).
7. **`handleApiError` THREE-helper catch dispatcher**
   — same as delete sibling.
8. **Method-resolution surface** — the route exports
   `PUT` AND `PATCH`. `GET` / `POST` / `DELETE` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **doubled header walks** (~6 headers ×
2 methods = ~12 tests), **per-method body walks** (~9
PUT bodies + ~5 PATCH bodies), and **eight hand-
written scenarios**.

| Block                                                                                                          | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (PUT + PATCH)                                                                           | ~6 headers × 2 methods.                                                                                                                |
| PUT body bulk-loop walk                                                                                        | ~9 bodies covering required-field probes, valid bodies, bypass attempts.                                                               |
| PATCH body bulk-loop walk                                                                                      | ~5 bodies covering simpler PATCH schema.                                                                                               |
| `test('PUT … returns 401 with the canonical Authentication required envelope', …)`                             | Pins the canonical envelope on PUT.                                                                                                    |
| `test('PATCH … returns 401 with the canonical Authentication required envelope', …)`                           | Pins the canonical envelope on PATCH.                                                                                                  |
| `test('PUT + PATCH … envelope-equality on the unauth branch', …)`                                              | Cross-method response-parity assertion.                                                                                                |
| `test('PUT + PATCH … does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across eight candidate messages.                                                                  |
| `test('PUT … caller-supplied metadata.userId is NOT echoed on the unauth branch', …)`                          | Pins the no-`metadata.userId`-leak invariant.                                                                                          |
| `test('PUT + PATCH … cross-method probe (GET / POST / DELETE) does NOT 5xx', …)`                               | Method-resolution walk. PUT + PATCH are the exported methods.                                                                          |
| `test('PUT + PATCH … ownership-check helper / paymentMethods.update / customers.update are NOT entered on the unauth branch', …)` | CRITICAL: pins that the load-bearing Stripe SDK calls (`paymentMethods.update`, `customers.update`) NEVER run on unauth.               |
| `test('PUT + PATCH … caller-supplied payment_method_id with XSS is NOT echoed on the unauth branch', …)`       | Pins XSS-shaped `payment_method_id` is NEVER echoed back.                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation across both methods must round-
   trip to a `< 500` status.
2. **Canonical 401 envelope** on both methods.
3. **Cross-method envelope equality** — PUT and
   PATCH 401 envelopes are byte-identical.
4. **Gate-before-post-auth invariant**.
5. **No-`metadata.userId`-leak invariant**.
6. **Cross-method invariance** — GET / POST / DELETE
   return `< 500`.
7. **Gate-before-Stripe-SDK-calls invariant**
   (CRITICAL — `paymentMethods.update` and
   `customers.update` must NEVER run on unauth).
8. **No-`payment_method_id`-leak invariant** for
   XSS-shaped values.

## See also

- The Stripe payment-methods delete DELETE sibling
  [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
  uses the SAME helper-function-extraction design
  with `validateSession`,
  `validatePaymentMethodOwnership`, and
  `handleApiError`.
- The Stripe payment-methods create POST sibling
  [`stripe-payment-methods-create-body-spec.md`](stripe-payment-methods-create-body-spec.md).
- The per-comment edit/delete sibling
  [`item-comments-id-method-spec.md`](item-comments-id-method-spec.md)
  is another dual-method spec (PUT + DELETE) but
  uses plain-text 401 envelopes.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
