---
id: payment-account-id-query-spec
title: E2E Payment Account [userId] Query Spec (apps/web-e2e/tests/api/payment-account-id-query.spec.ts)
sidebar_label: E2E Payment Account [userId] Query Spec
sidebar_position: 601
---

# E2E Payment Account [userId] Query Spec — `apps/web-e2e/tests/api/payment-account-id-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-user payment-account-lookup GET dynamic-segment
/ query / header smoke spec** paired with
[`apps/web-e2e/tests/api/payment-account-id-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-account-id-query.spec.ts).

This is the **first per-source-file dynamic-segment
GET smoke** the docs tree publishes that pins a
**strict user-id-IDOR check** (`session.user.id !==
params.userId` → 403 bare `{ error: 'Forbidden' }`
with NO message specifying ownership) on a per-user
resource lookup endpoint. CRITICAL: provides the
auth-gated counterpart to the
[`payment-account-method-spec.md`](payment-account-method-spec.md)
sibling which has NO auth gate (Q-010 finding).

## What's distinct from EVERY prior dynamic-segment GET smoke

- **Strict user-id-IDOR check** — `session.user.id
  !== userId` → 403 BARE `{ error: 'Forbidden' }`
  (UNIQUE: just `'Forbidden'` message, distinct
  from
  [`payment-id-method-spec.md`](payment-id-method-spec.md)'s
  `'Forbidden: You do not own this subscription'`).
- **userId-then-IDOR-then-provider validation
  order** — `!userId` 400 (impossible from dynamic
  segment) → IDOR 403 → `!provider` 400. UNIQUE:
  the IDOR check is INTERLEAVED between two
  validation checks (the FIRST per-source-file GET
  smoke pinning an IDOR check placed mid-validation-
  cascade).
- **`?provider=` query parameter required** —
  missing → 400 `{ error: 'Provider is required' }`
  (consistent with the
  [`payment-account-method-spec.md`](payment-account-method-spec.md)
  POST/PUT siblings' body-required check; this GET
  reads it from the query string).
- **404 with bare envelope** — `{ error: 'Payment
  account not found' }` when the DB query returns
  null (UNIQUE: the FIRST per-source-file GET smoke
  pinning a 404 with the literal message
  `'Payment account not found'`).
- **Returns raw paymentAccount fields** in success
  — `{ id, userId, providerId, customerId,
  createdAt, updatedAt }` — NO wrapper envelope
  (matches POST/PUT siblings).
- **DOES have `auth()` gate** — CONTRAST with the
  no-auth-gate POST/PUT siblings on the same parent
  route (Q-010 finding). The FIRST per-source-file
  GET smoke documenting an auth-gated GET sibling
  of an unguarded POST/PUT pair (a security-
  asymmetry finding).

## Why this spec is the first IDOR-mid-cascade smoke

The route under test
([`apps/web/app/api/payment/account/[userId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/payment/account/[userId]/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 bare ONE-key `{ error: 'Unauthorized' }`.
2. **`{ userId } = await params`** dynamic-segment
   resolution.
3. **`searchParams.get('provider')`** — `?provider=`
   query extraction.
4. **`!userId` check** — 400 (impossible from
   dynamic segment, but pinned).
5. **IDOR check** — `session.user.id !== userId` →
   403 bare `{ error: 'Forbidden' }`.
6. **`!provider` check** — 400 `{ error: 'Provider
   is required' }`.
7. **`getUserPaymentAccountByProvider(userId,
   provider)`** — load-bearing DB read.
8. **404 if null** — `{ error: 'Payment account
   not found' }`.
9. **Success payload** — raw paymentAccount fields
   with status 200.
10. **Outer catch** — 500 `{ error: 'Internal
    server error' }`.
11. **Method-resolution surface** — the route
    exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~6 headers +
~8 query permutations) and **eight hand-written
scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~6 headers.                                                                                                                            |
| Query-permutation bulk-loop walk                                                                   | ~8 query strings covering valid providers, invalid provider, empty provider, fabricated tokens.                                        |
| `test('… returns 401 with the canonical bare ONE-key envelope', …)`                                | Pins the canonical envelope.                                                                                                           |
| `test('… 401 envelope shape has exactly the error key', …)`                                        | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across five candidate messages including `'Forbidden'`, `'Provider is required'`, `'Payment account not found'`. |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                       | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… getUserPaymentAccountByProvider is NOT entered on the unauth branch', …)`                 | CRITICAL — pins that the load-bearing DB read NEVER runs on unauth (no `providerId` / `customerId` / `createdAt` leak).                |
| `test('… cross-userId invariance — different user IDs produce IDENTICAL unauth envelope', …)`     | Pins that the auth gate fires BEFORE any per-userId IDOR branch.                                                                       |
| `test('… cross-provider invariance — different providers produce IDENTICAL unauth envelope', …)`  | Pins that the auth gate fires BEFORE the `?provider=` query branch.                                                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   query permutation must round-trip to a `< 500`
   status.
2. **Canonical envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict ONE-key envelope-shape preservation**.
4. **Gate-before-post-auth invariant**.
5. **Side-channel isolation**.
6. **Cross-method invariance** — GET is the only
   exported method.
7. **Gate-before-DB-read invariant** (CRITICAL).
8. **Cross-userId invariance** — different user IDs
   produce IDENTICAL unauth envelopes (the auth
   gate fires BEFORE the IDOR check).
9. **Cross-provider invariance** — different
   `?provider=` values produce IDENTICAL unauth
   envelopes.

## See also

- The companion POST + PUT sibling
  [`payment-account-method-spec.md`](payment-account-method-spec.md)
  has NO auth gate (Q-010 finding); this GET sibling
  IS auth-gated and does have an IDOR check.
- The companion subscription-update payment sibling
  [`payment-id-method-spec.md`](payment-id-method-spec.md)
  uses a different IDOR message
  (`'Forbidden: You do not own this subscription'`).
- [`docs/questions.md`](../questions.md) — the
  Q-### entry tracking the security-asymmetry
  finding (auth-gated GET vs no-auth-gate POST/PUT
  on the same parent route).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
