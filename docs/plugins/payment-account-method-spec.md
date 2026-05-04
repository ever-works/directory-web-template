---
id: payment-account-method-spec
title: E2E Payment Account Method Spec (apps/web-e2e/tests/api/payment-account-method.spec.ts)
sidebar_label: E2E Payment Account Method Spec
sidebar_position: 600
---

# E2E Payment Account Method Spec — `apps/web-e2e/tests/api/payment-account-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**payment-account create / update POST + PUT body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/payment-account-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-account-method.spec.ts).

This is the **first per-source-file dual-method
smoke** the docs tree publishes that documents a
**Q-010-style NO-AUTH-GATE finding for a non-admin
mutating route on BOTH POST AND PUT exports** — the
handler has NO `auth()` call, NO ownership check.
ANY caller can create a payment account for ANY
`userId` + `customerId` (POST) OR update any
payment account by `id` (PUT). See
[`docs/questions.md`](../questions.md) for the
Q-### entry. The smoke spec pins this finding as the
CURRENT contract — a future PR that adds auth would
explicitly break this spec, prompting an update.

## What's distinct from EVERY prior dual-method smoke

- **NO `auth()` gate on EITHER method** — the FIRST
  per-source-file dual-method smoke pinning a Q-010-
  style no-auth-gate finding on BOTH POST AND PUT
  exports.
- **NO ownership check** — POST trusts the caller-
  supplied `userId` + `customerId` directly; PUT
  trusts the caller-supplied `id`.
- **`setupUserPaymentAccount(provider, userId,
  customerId)` runs UNCONDITIONALLY** — both POST
  and PUT call the same load-bearing DB-write
  function. UNIQUE: PUT does NOT check that the
  `id` matches an existing record; it just calls
  `setupUserPaymentAccount` with the body fields
  (effectively the same logic as POST plus an `id`
  gate).
- **THREE-required-field cascade** on POST
  (provider, userId, customerId) and **FOUR-
  required-field cascade** on PUT (id, provider,
  userId, customerId) — each emits a distinct 400
  message via individual `if (!field)` checks.
  UNIQUE: the FIRST per-source-file dual-method
  smoke pinning a per-field individual-required-
  check chain.
- **Bare ONE-key 400 envelope** `{ error: 'Field X
  is required' }` (NO `success` key).
- **Bare ONE-key 500 envelope** `{ error: 'Internal
  server error' }` (NO `success` key).
- **Returns raw paymentAccount fields** in success
  payload — `{ id, userId, providerId, customerId,
  createdAt, updatedAt }` — NO wrapper envelope
  (UNIQUE: most success responses use `{ success:
  true, data: {...} }`).

## Why this spec is the first Q-010 dual-method no-auth-gate smoke

The route under test
([`apps/web/app/api/payment/account/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/payment/account/route.ts))
exports `POST` AND `PUT`. The handlers combine:

1. **POST handler** — NO auth gate; JSON body parse;
   required-field cascade (provider, userId,
   customerId — each individually checked, distinct
   400 message); load-bearing
   `setupUserPaymentAccount(...)` UNCONDITIONAL DB
   write; success payload as raw paymentAccount
   fields; outer catch 500 `'Internal server
   error'`.
2. **PUT handler** — NO auth gate; JSON body parse;
   required-field cascade (id, provider, userId,
   customerId — each individually checked, distinct
   400 message); load-bearing
   `setupUserPaymentAccount(...)` UNCONDITIONAL DB
   write (NOT an actual update by `id`); success
   payload as raw paymentAccount fields; outer
   catch 500 `'Internal server error'`.
3. **Method-resolution surface** — the route
   exports `POST` AND `PUT`. `GET` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **four bulk-loop walks** (~6 headers
× 2 methods + ~7 POST bodies + ~6 PUT bodies) and
**eight hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (POST / PUT)                                                                | ~6 headers per method.                                                                                                                 |
| POST body bulk-loop walk                                                                           | ~7 bodies covering required-field cascade probes + valid bodies.                                                                       |
| PUT body bulk-loop walk                                                                            | ~6 bodies covering the FOUR-required-field cascade.                                                                                    |
| `test('POST … does NOT return 401 (no auth gate Q-010-style finding)', …)`                         | CURRENT contract: handler has NO auth gate. Pins NOT 401.                                                                              |
| `test('PUT … does NOT return 401 (no auth gate Q-010-style finding)', …)`                          | Same Q-010 finding on PUT.                                                                                                             |
| `test('POST … treats unauth and authed requests identically (no auth gate)', …)`                   | Pins that fabricated auth headers produce the SAME status as bare requests.                                                            |
| `test('POST … required-field cascade emits canonical 400 messages', …)`                            | Pins the three distinct 400 messages: `'Provider is required'`, `'User ID is required'`, `'Customer ID is required'`.                   |
| `test('PUT … required-field cascade includes 'Account ID is required'', …)`                       | Pins the FOUR-required-field cascade on PUT (the id check fires FIRST).                                                                |
| `test('POST … 400 envelope shape has exactly the error key', …)`                                   | Strict envelope-shape assertion.                                                                                                       |
| `test('POST … cross-method probe (GET / PATCH / DELETE) does NOT 5xx', …)`                         | Method-resolution walk. POST + PUT are exported.                                                                                       |
| `test('POST … catch-branch generic 500 message is NOT echoed for malformed bodies', …)`            | Pins that valid-shape requests do NOT 5xx.                                                                                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across both methods.
2. **NO-401 contract** on BOTH POST AND PUT — the
   unauth response is NEVER 401 (because there's
   no auth gate).
3. **Auth-signal-ignored contract** — fabricated
   auth headers do NOT change the status.
4. **Required-field cascade canonical messages** —
   POST emits three distinct 400 messages, PUT
   emits a fourth `'Account ID is required'`.
5. **Strict ONE-key 400 envelope-shape preservation**.
6. **Cross-method invariance** — GET / PATCH /
   DELETE return `< 500`.
7. **No-catch-on-valid-body contract**.

## See also

- The companion subscription-update payment sibling
  [`payment-id-method-spec.md`](payment-id-method-spec.md)
  (DOES enforce auth + ownership; distinct from
  this no-auth-gate sibling).
- The provider-specific payment-methods sibling
  [`stripe-payment-methods-create-body-spec.md`](stripe-payment-methods-create-body-spec.md)
  is auth-gated.
- [`docs/questions.md`](../questions.md) — the
  Q-### entry tracking the no-auth-gate finding.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
