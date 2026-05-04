---
id: user-payments-query-spec
title: E2E User Payments Query Spec (apps/web-e2e/tests/api/user-payments-query.spec.ts)
sidebar_label: E2E User Payments Query Spec
sidebar_position: 592
---

# E2E User Payments Query Spec — `apps/web-e2e/tests/api/user-payments-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**authenticated user-payment-history GET header smoke
spec** paired with
[`apps/web-e2e/tests/api/user-payments-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/user-payments-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins a **top-level-ARRAY
success response** (NOT an object wrapper). The
handler returns either `[]` (when the caller has no
Stripe customer) OR a top-level payment-history array
(transformed Stripe invoice data). UNIQUE — every
prior per-source-file GET smoke pins an object-shaped
response; this is the FIRST that pins a bare-array
shape.

## What's distinct from EVERY prior session-gated GET smoke

- **Top-level-ARRAY success response** — the
  200-branch returns `paymentHistory` (a JS array)
  directly via `NextResponse.json(paymentHistory)`.
  UNIQUE.
- **No-customer-found 200 EMPTY ARRAY `[]`** — if
  `customerId` is null, the handler returns `[]` with
  status 200 (NOT a 401 / 404 / 4xx). Distinct from
  the [`subscription` sibling](subscription-query-spec.md)
  which returns `{ hasActiveSubscription: false,
  message: 'No Stripe customer found' }`.
- **Bare ONE-key `{ error: 'Unauthorized' }` 401
  envelope** (NO `success` key, NO `message` key —
  same envelope shape as `subscription` sibling).
- **Two-tier 500 catch dispatcher** — inner Stripe-
  error → 500 `'Failed to fetch payment data from
  Stripe'`; outer → 500 `'Failed to fetch payment
  data'`. UNIQUE — TWO different 500 messages with
  the SAME ONE-key `{ error }` shape.
- **Zero-arg GET signature** — `export async function
  GET()` with NO `request` / `context` arguments.
- **Stripe Invoices + Subscriptions DUAL-list load-
  bearing chain** — the handler calls BOTH
  `stripe.invoices.list` AND
  `stripe.subscriptions.list` to enrich each invoice
  with subscription metadata (FIRST per-source-file
  GET smoke pinning a dual-Stripe-list invariant).
- **Filtered status whitelist** — only invoices with
  `status === 'paid' || status === 'open'` appear in
  the response.

## Why this spec is the first top-level-array GET smoke

The route under test
([`apps/web/app/api/user/payments/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/payments/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 ONE-key `{ error: 'Unauthorized' }`.
2. **`initializeStripeProvider()` +
   `getStripeInstance()`** — happens AFTER the auth
   gate.
3. **`stripe.getCustomerId(session.user as any)`** —
   load-bearing customer-id lookup; null → 200 EMPTY
   ARRAY `[]`.
4. **`stripe.invoices.list({ customer, limit: 100 })`**
   — load-bearing invoice list.
5. **`stripe.subscriptions.list({ customer, limit:
   100 })`** — load-bearing subscription list (DUAL-
   list invariant).
6. **Filter + transform + sort** — paid/open only,
   then sort by date desc.
7. **Inner catch** — 500 `'Failed to fetch payment
   data from Stripe'`.
8. **Outer catch** — 500 `'Failed to fetch payment
   data'`.
9. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~7
headers) and **eight hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                | ~7 headers.                                                                                                                            |
| `test('… returns 401 with the canonical ONE-key Unauthorized envelope', …)`                          | Pins the canonical envelope.                                                                                                           |
| `test('… 401 envelope shape has exactly the error key', …)`                                          | Strict ONE-key envelope-shape assertion.                                                                                               |
| `test('… does NOT echo a top-level array on the unauth branch', …)`                                  | CRITICAL — pins that the unauth response is NEVER an array.                                                                            |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                      | Pins the gate-before-post-auth order across two distinct 500 messages.                                                                 |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                     | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                         | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… initializeStripeProvider / invoices.list / subscriptions.list are NOT entered on the unauth branch', …)` | CRITICAL — pins that the load-bearing Stripe SDK calls NEVER run on unauth.                                                            |
| `test('… catch-branch dispatcher is NOT entered on the unauth branch', …)`                           | Pins the gate-before-catch-dispatcher order across two-tier 500 dispatcher.                                                            |
| `test('… no-stripe-error-message-leak invariant on the unauth branch', …)`                           | Pins that no stripe-error substring (`'No such customer'`, `'resource_missing'`, `'invoice'`, `'Stripe API error'`) leaks on unauth.   |
| `test('… cross-permutation status invariance', …)`                                                   | Cross-permutation status invariance.                                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict ONE-key envelope-shape preservation**.
4. **No-array-leak invariant** (CRITICAL).
5. **Gate-before-post-auth invariant**.
6. **Side-channel isolation**.
7. **Cross-method invariance** — GET is the only
   exported method.
8. **Gate-before-Stripe-SDK-calls invariant**
   (CRITICAL).
9. **Gate-before-two-tier-catch-dispatcher invariant**.
10. **No-stripe-error-message-leak invariant**.
11. **Cross-permutation status invariance**.

## See also

- The companion subscription GET sibling
  [`subscription-query-spec.md`](subscription-query-spec.md)
  uses the SAME `auth()` gate + Stripe customer
  lookup + two-tier catch dispatcher pattern, but
  returns an OBJECT-wrapped response.
- The plan-status GET sibling
  [`user-plan-status-query-spec.md`](user-plan-status-query-spec.md)
  uses a DIFFERENT envelope shape (TWO-key `{ success:
  false, message }` 401, THREE-key 500 with both
  `message` AND `error`).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
