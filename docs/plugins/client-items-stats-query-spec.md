---
id: client-items-stats-query-spec
title: E2E Client Items Stats Query Spec (apps/web-e2e/tests/api/client-items-stats-query.spec.ts)
sidebar_label: E2E Client Items Stats Query Spec
sidebar_position: 602
---

# E2E Client Items Stats Query Spec — `apps/web-e2e/tests/api/client-items-stats-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client items-stats GET header smoke spec** paired
with
[`apps/web-e2e/tests/api/client-items-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-stats-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins the
**`requireClientAuth()` helper-based auth gate** with
the **`'Unauthorized. Please sign in to continue.'`**
longer-message TWO-key envelope. UNIQUE: a different
auth-helper abstraction than the bare `auth()`
session lookup used in every other per-source-file
smoke; uses the explicit `client-auth` utility
helpers (`requireClientAuth`, `serverErrorResponse`).

## What's distinct from EVERY prior GET smoke

- **`requireClientAuth()` helper-based auth gate** —
  UNIQUE: returns a discriminated union `{ success:
  false, response: NextResponse }` on failure or
  `{ success: true, userId: string }` on success.
  The FIRST per-source-file GET smoke pinning a
  discriminated-union auth-helper return contract.
- **`'Unauthorized. Please sign in to continue.'`**
  401 envelope message — UNIQUE: longer specific
  message naming the action ('Please sign in to
  continue'). Distinct from bare `'Unauthorized'`,
  `'Unauthorized. Admin access required.'` (admin-
  tree), and `'Authentication required'` (Stripe
  siblings).
- **TWO-key 401 envelope** `{ success: false,
  error: 'Unauthorized. Please sign in to
  continue.' }`.
- **TWO-key success payload** `{ success: true,
  stats: <statsObject> }` — UNIQUE: uses `stats`
  key (NOT `data` like most success payloads).
- **`serverErrorResponse(error, 'Failed to fetch
  statistics')`** outer catch — UNIQUE helper
  distinct from `safeErrorResponse`.
- **Zero-arg GET signature** — `export async
  function GET()` with NO `request` / `context`
  arguments.

## Why this spec is the first requireClientAuth-helper smoke

The route under test
([`apps/web/app/api/client/items/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/stats/route.ts))
exports only `GET`. The handler combines:

1. **`requireClientAuth()`** — discriminated-union
   auth-helper.
2. **`getClientItemRepository()`** — repository
   factory.
3. **`clientItemRepository.getStatsByUser(userId)`**
   — load-bearing DB read.
4. **Success payload** — `{ success: true, stats:
   { total, draft, pending, approved, rejected,
   deleted } }`.
5. **Outer catch** — `serverErrorResponse(error,
   'Failed to fetch statistics')`.
6. **Method-resolution surface** — the route
   exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~6
headers) and **seven hand-written scenarios**.

| Block                                                                                          | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                          | ~6 headers.                                                                                                                            |
| `test('… returns 401 with the longer-message TWO-key envelope', …)`                            | Pins the canonical envelope `{ success: false, error: 'Unauthorized. Please sign in to continue.' }`.                                  |
| `test('… 401 envelope shape has exactly success and error keys', …)`                           | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order — `'Failed to fetch statistics'` and the success-branch stats keys must not leak.                 |
| `test('… does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                   | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… clientItemRepository.getStatsByUser is NOT entered on the unauth branch', …)`         | CRITICAL — pins that the load-bearing DB read NEVER runs on unauth.                                                                    |
| `test('… cross-permutation status invariance', …)`                                             | Cross-permutation status invariance.                                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized. Please sign in to continue.' }`
   on the unauth branch.
3. **Strict TWO-key envelope-shape preservation**.
4. **Gate-before-post-auth invariant**.
5. **Side-channel isolation**.
6. **Cross-method invariance** — GET is the only
   exported method.
7. **Gate-before-DB-read invariant** (CRITICAL).
8. **Cross-permutation status invariance**.

## See also

- The companion client-dashboard-stats sibling
  [`client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts)
  is another `requireClientAuth`-gated stats endpoint.
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- The companion client-geo-stats sibling
  [`client-geo-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-geo-stats-query.spec.ts)
  uses the same `requireClientAuth` helper.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
