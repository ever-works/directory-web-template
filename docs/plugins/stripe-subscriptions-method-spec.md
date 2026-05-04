---
id: stripe-subscriptions-method-spec
title: E2E Stripe Subscriptions Method Spec (apps/web-e2e/tests/api/stripe-subscriptions-method.spec.ts)
sidebar_label: E2E Stripe Subscriptions Method Spec
sidebar_position: 604
---

# E2E Stripe Subscriptions Method Spec — `apps/web-e2e/tests/api/stripe-subscriptions-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe collection-level *subscriptions* (plural)
GET + POST + PUT + DELETE body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/stripe-subscriptions-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscriptions-method.spec.ts).

This is the **first per-source-file QUAD-method
smoke** the docs tree publishes (every prior smoke
covers 1, 2, or 3 methods). Distinct from the
*singular* sibling at `/api/stripe/subscription`:

- **PROPER USER-SCOPED IDOR on PUT AND DELETE** —
  `subscription.userId !== session.user.id` → 404
  `'Subscription not found'`. CONTRAST with
  [`stripe-subscription-method-spec.md`](stripe-subscription-method-spec.md)
  which is the singular sibling and has NO IDOR
  (Q-010 finding) — this plural sibling does it
  correctly.

## What's distinct from EVERY prior method-method smoke

- **FOUR-method export** (GET + POST + PUT + DELETE)
  — UNIQUE: the FIRST per-source-file QUAD-method
  smoke.
- **GET conditional response shape** — `?active=
  true` returns `{ data, plan, limits }`; default
  returns `{ data, history, meta }`. UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  conditional response shape based on query.
- **POST returns 201 status** (NOT 200). UNIQUE
  among Stripe POST smokes.
- **POST 409 Conflict** for existing active
  subscription — UNIQUE: the FIRST per-source-
  file POST smoke pinning a 409 Conflict status
  code.
- **Query-string DELETE** — DELETE uses query
  parameters (`?id=&reason=&cancelAtPeriodEnd=`)
  NOT body. UNIQUE: the FIRST per-source-file
  DELETE smoke pinning a query-driven mutating
  DELETE (vs body-driven DELETE in every other
  sibling).
- **DYNAMIC success message on DELETE** — based
  on `?cancelAtPeriodEnd=true` flag the message
  is one of TWO strings.
- **Bare ONE-key 401 envelope** `{ error:
  'Unauthorized' }` consistent across ALL FOUR
  methods.
- **Three-field required-check on POST** with
  comma-joined-field-list 400 message
  `'Missing required fields: planId,
  paymentProvider, subscriptionId'` (UNIQUE: the
  FIRST per-source-file POST smoke pinning a
  comma-joined-field-list 400 message).

## Why this spec is the first quad-method smoke

The route under test
([`apps/web/app/api/stripe/subscriptions/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscriptions/route.ts))
exports `GET`, `POST`, `PUT`, AND `DELETE`. The
handlers combine:

1. **GET handler** — `auth()`; query parsing
   (`?active=true`, `?history=true`); branch on
   activeOnly vs all; success returns conditional
   shape.
2. **POST handler** — `auth()`; JSON body parse;
   THREE-required-field check; `hasActiveSubscription`
   check → 409; `createSubscription(...)` load-
   bearing call; success returns 201 with `{ data,
   message: 'Subscription created successfully' }`.
3. **PUT handler** — `auth()`; JSON body parse;
   `!subscriptionId` → 400; `getSubscriptionById` +
   USER-SCOPED IDOR (`!subscription ||
   subscription.userId !== session.user.id` →
   404); `updateSubscription(...)` load-bearing
   call; success returns `{ data, message:
   'Subscription updated successfully' }`.
4. **DELETE handler** — `auth()`; query parsing
   (`?id=`, `?reason=`, `?cancelAtPeriodEnd=`);
   `!id` → 400; `getSubscriptionById` + USER-
   SCOPED IDOR → 404; `cancelSubscription(...)`
   load-bearing call; success returns DYNAMIC
   message based on `cancelAtPeriodEnd` flag.
5. **Method-resolution surface** — the route
   exports `GET`, `POST`, `PUT`, AND `DELETE`.
   `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **four header bulk-loop walks** (~6
headers × 4 methods) and **eleven hand-written
scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / POST / PUT / DELETE)                                                   | ~6 headers per method.                                                                                                                 |
| `test('GET … returns 401 with the canonical bare ONE-key envelope', …)`                              | Pins the canonical envelope on GET.                                                                                                    |
| `test('POST … returns 401 with the canonical bare ONE-key envelope', …)`                             | Pins the canonical envelope on POST.                                                                                                   |
| `test('GET / POST / PUT / DELETE … have IDENTICAL 401 envelopes', …)`                                | Pins byte-identical 401 envelopes across all four methods.                                                                             |
| `test('GET … 401 envelope shape has exactly the error key', …)`                                      | Strict ONE-key envelope-shape assertion.                                                                                               |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`                 | Pins the gate-before-post-auth order across six candidate messages.                                                                    |
| `test('PUT … updateSubscription is NOT entered on the unauth branch', …)`                            | CRITICAL — pins that XSS markers in the PUT body are NEVER echoed back.                                                                |
| `test('DELETE … cancelSubscription is NOT entered with query-string ID on unauth', …)`               | CRITICAL — pins that the query-string id (UNIQUE — vs body-driven elsewhere) is NEVER echoed back.                                     |
| `test('GET … cross-query invariance — different query permutations produce IDENTICAL unauth envelopes', …)` | Pins that the auth gate fires BEFORE the `?active=` / `?history=` query branch.                                                        |
| `test('GET … cross-method probe (PATCH) does NOT 5xx', …)`                                           | Method-resolution walk. PATCH is the only non-exported method.                                                                         |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                                | Side-channel walk on POST.                                                                                                             |
| `test('POST … required-field check is NOT entered on the unauth branch', …)`                         | Pins the gate-before-required-field-check order — even empty-body POST returns 401 NOT 400.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status
   across all four methods.
2. **Canonical bare ONE-key envelope** `{ error:
   'Unauthorized' }` on all four methods.
3. **Cross-method 401 envelope equality** — GET,
   POST, PUT, DELETE return BYTE-IDENTICAL 401
   envelopes.
4. **Strict ONE-key envelope-shape preservation**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-updateSubscription invariant**
   (CRITICAL).
7. **Gate-before-cancelSubscription invariant**
   (CRITICAL — for query-string DELETE).
8. **Cross-query invariance on GET** — different
   query permutations produce IDENTICAL unauth
   envelopes.
9. **Cross-method invariance** — PATCH returns
   `< 500`.
10. **Side-channel isolation** on POST.
11. **Gate-before-required-field-check invariant**
    on POST.

## See also

- The singular sibling
  [`stripe-subscription-method-spec.md`](stripe-subscription-method-spec.md)
  has NO IDOR on PUT/DELETE (Q-010 finding); this
  plural sibling DOES have proper user-scoped
  IDOR.
- The per-id update sibling
  [`stripe-subscription-id-update-body-spec.md`](stripe-subscription-id-update-body-spec.md)
  uses a different IDOR pattern via
  `getSubscriptionByProviderSubscriptionId`.
- The per-id cancel sibling
  [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  uses POST verb (not DELETE).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
