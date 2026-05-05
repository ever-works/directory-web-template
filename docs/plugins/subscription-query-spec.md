---
id: subscription-query-spec
title: E2E Subscription Query Spec (apps/web-e2e/tests/api/subscription-query.spec.ts)
sidebar_label: E2E Subscription Query Spec
sidebar_position: 595
---

# E2E Subscription Query Spec — `apps/web-e2e/tests/api/subscription-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**authenticated user-subscription GET query-param smoke
spec** paired with
[`apps/web-e2e/tests/api/subscription-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/subscription-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins an **OBJECT-wrapped
success response** for a Stripe-customer-session
endpoint where the no-customer-found branch ALSO
returns an OBJECT (with `hasActiveSubscription:
false` + a `message` field) — UNIQUE: the direct
sibling [`user-payments-query-spec.md`](user-payments-query-spec.md)
returns a top-level **ARRAY** for the same Stripe-
customer-session pattern. Together the two specs pin
the divergence between the two response shapes that
share an identical auth-gate + customer-resolution
prologue.

## What's distinct from EVERY prior session-gated GET smoke

- **OBJECT-wrapped success response** — the 200-
  branch returns `{ hasActiveSubscription,
  currentSubscription?, subscriptionHistory,
  message? }` (NOT a top-level array). UNIQUE — the
  FIRST per-source-file GET smoke pinning an
  OBJECT-wrapped Stripe-customer-derived response
  where the no-customer-found 200 branch ALSO returns
  an OBJECT (vs the empty-array fallback in the
  user-payments sibling).
- **No-customer-found 200 OBJECT** `{
  hasActiveSubscription: false, message: 'No Stripe
  customer found' }` — distinct from the
  [`user-payments-query-spec.md`](user-payments-query-spec.md)
  sibling's `[]` empty-array fallback. Same `auth()`
  + `getCustomerId(...)` prologue, different fallback
  shape.
- **Bare ONE-key `{ error: 'Unauthorized' }` 401
  envelope** (NO `success` key, NO `message` key —
  same envelope shape as the `user-payments`
  sibling).
- **Two-tier 500 catch dispatcher** — inner Stripe-
  error → 500 `'Failed to fetch subscription data
  from Stripe'`; outer → 500 `'Failed to fetch
  subscription data'`. UNIQUE pair — TWO different
  500 messages with the SAME ONE-key `{ error }`
  shape (matches the `user-payments` sibling's two-
  tier dispatcher pattern but with subscription-
  specific messages).
- **Zero-arg GET signature** — `export async
  function GET()` with NO `request` / `context`
  arguments (matches `user-payments` sibling).
- **Stripe Subscriptions list with `expand:
  ['data.default_payment_method']`** — load-bearing
  Stripe SDK call enriches each subscription with
  expanded payment-method data (UNIQUE: the FIRST
  per-source-file GET smoke pinning a Stripe
  expansion-list invariant — the user-payments
  sibling pins a DUAL-list `invoices.list` +
  `subscriptions.list` but neither is expanded).
- **Active-subscription discriminator** — the
  handler isolates a `currentSubscription` from
  history by `sub.status === 'active' || sub.status
  === 'trialing'` (UNIQUE: the FIRST per-source-file
  GET smoke pinning an active-or-trialing-only
  current-subscription discriminator).
- **Cents-to-major-units transform** — every `amount`
  in the response is divided by 100 to convert from
  Stripe's cents representation to major currency
  units (UNIQUE: the FIRST per-source-file GET smoke
  pinning a cents-to-major-units transform on the
  success branch — the user-payments sibling does
  NOT divide invoice amounts the same way).
- **Currency uppercase invariant** — `sub.currency.
  toUpperCase()` is applied to every subscription
  in the response (UNIQUE: the FIRST per-source-
  file GET smoke pinning a currency-case-
  normalisation invariant).
- **Caller-supplied-Stripe-key bypass attempt**
  walked — the spec walks `?stripeKey=` /
  `?stripe_key=` query parameters to pin that the
  handler does NOT forward a caller-supplied Stripe
  API key (CRITICAL — prevents a future regression
  that would let a caller substitute their own
  Stripe key and read another customer's data).

## Why this spec is the first OBJECT-wrapped Stripe-customer-derived GET smoke

The route under test
([`apps/web/app/api/user/subscription/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/subscription/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 ONE-key `{ error: 'Unauthorized' }`.
2. **`initializeStripeProvider()` +
   `getStripeInstance()`** — happens AFTER the auth
   gate.
3. **`stripeProvider.getCustomerId(session.user)`** —
   load-bearing customer-id lookup; null → 200
   OBJECT `{ hasActiveSubscription: false, message:
   'No Stripe customer found' }`.
4. **`stripe.subscriptions.list({ customer, limit:
   100, expand: ['data.default_payment_method'] })`**
   — load-bearing subscription list with payment-
   method expansion.
5. **Active-subscription discriminator** —
   `sub.status === 'active' || sub.status ===
   'trialing'`.
6. **Transform** — cents-to-major-units, currency-
   uppercase, ISO-format timestamps.
7. **Inner catch** — 500 `'Failed to fetch
   subscription data from Stripe'`.
8. **Outer catch** — 500 `'Failed to fetch
   subscription data'`.
9. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single query-string bulk-loop walk**
covering many parameter permutations (no-arg baseline,
admin-impersonation candidates `?userId=` /
`?customerId=` / `?stripeCustomerId=`, magic-token
candidates `?token=`, dangerous-passthrough
candidates `?stripeKey=`, status-claim candidates
`?status=active`, plus structural permutations) and
**seven hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Query-string bulk-loop walk                                                                          | Many permutations covering admin-impersonation candidates, magic-token candidates, dangerous-passthrough candidates, status claims.    |
| `test('… returns 401 with the canonical { error } envelope on the unauth branch', …)`                | Pins the canonical envelope.                                                                                                           |
| `test('… returns 401 identically with and without bogus query parameters', …)`                       | Pins envelope-byte-equality across query permutations.                                                                                 |
| `test('… ?userId=… does NOT bypass the session gate', …)`                                            | CRITICAL — pins that a future `?userId=` admin-impersonation key does NOT short-circuit the auth gate.                                  |
| `test('… ?customerId=… does NOT bypass the customer-resolution step', …)`                            | CRITICAL — pins that a future `?customerId=` query parameter does NOT replace the session-derived customer id.                          |
| `test('… ?stripeKey=… does NOT forward a caller-supplied Stripe key', …)`                            | CRITICAL — pins that a future `?stripeKey=` query parameter is NOT forwarded to the Stripe SDK.                                         |
| `test('… ?token=… does NOT introduce a query-token auth bypass', …)`                                 | CRITICAL — pins that a future `?token=` magic-token query parameter does NOT short-circuit the auth gate.                               |
| `test('… keeps the response shape stable across param permutations', …)`                             | Cross-permutation status-and-shape invariance assertion.                                                                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a `< 500` status.
2. **Canonical envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Cross-query envelope-byte-equality** — the
   401 envelope MUST be byte-identical across query
   permutations.
4. **Gate-before-customer-resolution invariant**
   (CRITICAL) — pins that `?userId=` and
   `?customerId=` query parameters do NOT short-
   circuit the session gate or the customer-
   resolution step.
5. **Gate-before-Stripe-SDK-call invariant**
   (CRITICAL) — pins that a caller-supplied Stripe
   key is NOT forwarded to the Stripe SDK.
6. **No-magic-token-bypass invariant** (CRITICAL) —
   pins that `?token=` query parameters do NOT
   short-circuit the session gate.
7. **Cross-permutation status-and-shape invariance**
   — every query permutation produces the same
   status and the same envelope shape.

## See also

- The companion payment-history GET sibling
  [`user-payments-query-spec.md`](user-payments-query-spec.md)
  uses the SAME `auth()` gate + Stripe customer
  lookup + two-tier catch dispatcher pattern but
  returns a top-level **ARRAY** (vs this spec's
  OBJECT-wrapped response). Together the two specs
  pin the divergence between the two response
  shapes that share an identical auth-gate +
  customer-resolution prologue.
- The Stripe billing-portal POST sibling
  [`stripe-subscription-portal-body-spec.md`](stripe-subscription-portal-body-spec.md)
  uses the SAME `auth()` gate + Stripe customer
  lookup but on a different HTTP method.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
