---
id: sponsor-ads-user-stats-query-spec
title: E2E Sponsor Ads User Stats Query Spec (apps/web-e2e/tests/api/sponsor-ads-user-stats-query.spec.ts)
sidebar_label: E2E Sponsor Ads User Stats Query Spec
sidebar_position: 606
---

# E2E Sponsor Ads User Stats Query Spec — `apps/web-e2e/tests/api/sponsor-ads-user-stats-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**user-scoped sponsor-ads stats GET header smoke spec**
paired with
[`apps/web-e2e/tests/api/sponsor-ads-user-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-stats-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins a **THREE-bucket nested-
stats success payload** — `{ success: true, stats: {
overview, byInterval, revenue } }`. Each bucket has its
own required-keys contract (status counts, billing-
interval counts, revenue rollups). UNIQUE — every
prior per-source-file GET stats smoke pins a flat
shallow stats key set; this is the FIRST that pins a
THREE-bucket nested-stats invariant where `stats` is a
triple-nested aggregate.

## What's distinct from EVERY prior GET smoke

- **THREE-bucket nested-stats success payload** —
  `{ success: true, stats: { overview, byInterval,
  revenue } }`. UNIQUE — the FIRST per-source-file
  GET smoke pinning a triple-nested aggregate stats
  payload. The `overview` bucket has SEVEN status
  counts (`total`, `pendingPayment`, `pending`,
  `active`, `rejected`, `expired`, `cancelled`); the
  `byInterval` bucket has TWO billing-interval counts
  (`weekly`, `monthly`); the `revenue` bucket has
  THREE revenue rollups (`totalRevenue`,
  `weeklyRevenue`, `monthlyRevenue`).
- **Bare `auth()` session lookup** — distinct from
  the `requireClientAuth()` discriminated-union
  helper used by `client-items-stats-query` and
  other client-tree siblings.
- **TWO-key 401 envelope** `{ success: false,
  error: 'Unauthorized' }` — same shape as the
  `sponsor-ads/user` parent route; distinct from the
  bare ONE-key envelope used by `user-payments` and
  `subscription` siblings.
- **TWO-key success payload** `{ success: true,
  stats }` — uses `stats` key (NOT `data` like most
  success payloads, NOT `paymentHistory` like
  `user-payments`).
- **Service-call delegation** —
  `sponsorAdService.getSponsorAdStatsByUser(session.
  user.id)` is the ONLY post-auth load-bearing call
  (no DB-helper layer between auth and service like
  the repository factories used in client-tree
  siblings).
- **TWO-key 500 catch envelope** `{ success: false,
  error: 'Failed to fetch sponsor ad stats' }` —
  distinct catch message from the parent
  `/sponsor-ads/user` route's `'Failed to fetch
  sponsor ads'` and `'Failed to create sponsor ad'`
  messages (NO 's' on `stat` — `stats`).
- **Zero-arg GET signature** — `export async
  function GET()` with NO `request` / `context`
  arguments.

## Why this spec is the first triple-bucket-stats smoke

The route under test
([`apps/web/app/api/sponsor-ads/user/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/user/stats/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 TWO-key `{ success: false, error:
   'Unauthorized' }`.
2. **`sponsorAdService.getSponsorAdStatsByUser(userId)`**
   — load-bearing service call returning the THREE-
   bucket aggregate.
3. **Success payload** — `{ success: true, stats:
   { overview, byInterval, revenue } }`.
4. **Outer catch** — 500 `{ success: false, error:
   'Failed to fetch sponsor ad stats' }`.
5. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~6
headers) and **eight hand-written scenarios**.

| Block                                                                                          | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                          | ~6 headers.                                                                                                                            |
| `test('… returns 401 with the canonical TWO-key envelope', …)`                                 | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                               |
| `test('… 401 envelope shape has exactly success and error keys', …)`                           | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order — `'Failed to fetch sponsor ad stats'` must not leak.                                              |
| `test('… sponsorAdService.getSponsorAdStatsByUser is NOT entered on the unauth branch', …)`    | CRITICAL — pins the THREE-bucket aggregate keys NEVER leak.                                                                            |
| `test('… does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                   | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… catch-branch dispatcher is NOT entered on the unauth branch', …)`                     | Pins the 500-catch never fires on unauth.                                                                                              |
| `test('… cross-permutation status invariance', …)`                                             | Cross-permutation status invariance.                                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical TWO-key envelope** `{ success: false,
   error: 'Unauthorized' }` on the unauth branch.
3. **Strict TWO-key envelope-shape preservation** —
   no `stats`, `data`, or `message` leak.
4. **Gate-before-service-call invariant** — the
   `'Failed to fetch sponsor ad stats'` message
   never leaks.
5. **Gate-before-aggregate-leak invariant**
   (CRITICAL) — neither the bucket names
   (`overview`, `byInterval`, `revenue`) nor the
   inner status / interval / revenue keys leak on
   unauth.
6. **Side-channel isolation**.
7. **Cross-method invariance** — GET is the only
   exported method.
8. **Catch-branch isolation** — the 500-catch never
   fires on unauth.
9. **Cross-permutation status invariance**.

## See also

- The companion sponsor-ads parent sibling
  [`sponsor-ads-user-method-spec.md`](sponsor-ads-user-method-spec.md)
  covers the GET + POST surface of the parent
  `/sponsor-ads/user` route.
- The companion sponsor-ads cancel sibling
  [`sponsor-ads-user-id-cancel-body-spec.md`](sponsor-ads-user-id-cancel-body-spec.md)
  uses a per-id POST verb.
- The companion sponsor-ads renew sibling
  [`sponsor-ads-user-id-renew-body-spec.md`](sponsor-ads-user-id-renew-body-spec.md)
  uses a per-id POST verb.
- The companion client-items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  is another per-source-file stats GET smoke (uses
  the `requireClientAuth` helper instead of bare
  `auth()`).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
