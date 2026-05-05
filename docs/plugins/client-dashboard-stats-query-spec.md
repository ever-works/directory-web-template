---
id: client-dashboard-stats-query-spec
title: E2E Client Dashboard Stats Query Spec (apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts)
sidebar_label: E2E Client Dashboard Stats Query Spec
sidebar_position: 617
---

# E2E Client Dashboard Stats Query Spec — `apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**`requireClientAuth()`-gated client dashboard-stats
GET / query-param surface smoke spec** paired with
[`apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins a
**`requireClientAuth()`-gated zero-argument handler**
combining a **`getClientDashboardRepository().getStats(userId)`
repository-delegation pattern**, a **spread-stats
success envelope `{ success: true, ...stats }`** (NOT
the `{ success: true, stats: <statsObject> }` nested
shape used by the sibling `client-items-stats-query`
spec), a **`serverErrorResponse(error, 'Failed to
fetch dashboard statistics')` outer catch**, and a
**five-bypass-prevention assertion battery**
(`?userId=…` admin-impersonation, `?token=…` magic-
token bypass, `?admin=…` query-admin-override,
`?from=…` date-range bypass, multi-permutation
shape stability) on top of the standard query-string
bulk-loop walk.

## What's distinct from EVERY prior per-source-file GET smoke

- **`requireClientAuth()` discriminated-union auth
  gate (zero-argument handler)** — UNIQUE: every
  prior `requireClientAuth()`-gated GET smoke
  (`client-items-stats-query`, `client-items-method`,
  `client-items-id-method`, `client-items-import-
  sample-query`) takes a `request: NextRequest`
  argument; this is the SECOND `requireClientAuth()`
  gate after `client-items-stats-query` and the
  SECOND zero-argument handler in the
  `requireClientAuth()` family. The auth helper
  returns `{ success: false, response: <401
  NextResponse> }` on failure or `{ success: true,
  userId: string }` on success — the
  discriminated-union shape that the spec validates
  by asserting `response.status() === 401`.
- **Spread-stats success envelope `{ success: true,
  ...stats }`** — UNIQUE: every prior
  `requireClientAuth()`-gated GET smoke pins a
  nested envelope (`{ success: true, stats: ... }`,
  `{ success: true, items: [...] }`, `{ success:
  true, data: ... }`); this is the FIRST per-source-
  file GET smoke pinning a `...stats` spread-into-
  envelope success contract where the dashboard
  fields (`totalSubmissions`, `totalViews`,
  `totalVotesReceived`, `totalCommentsReceived`,
  `viewsAvailable`, `recentActivity`,
  `uniqueItemsInteracted`, `totalActivity`,
  `activityChartData`, `engagementChartData`,
  `submissionTimeline`, `engagementOverview`,
  `statusBreakdown`, `topItems`) become top-level
  keys of the response envelope alongside `success`.
- **Five-bypass-prevention assertion battery** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a five-test bypass-prevention battery
  (`?userId=…` does NOT bypass the session gate,
  `?token=…` does NOT introduce a query-token
  bypass, `?admin=…` does NOT introduce a query-
  admin-override, `?from=…` date-range params do
  NOT change the unauth branch, multi-permutation
  shape stability across three different parameter
  sets). Every prior `requireClientAuth()`-gated
  GET smoke pins at most a single
  bogus-parameter-invariance test; this spec pins
  five distinct bypass-prevention contracts as
  named tests.
- **`serverErrorResponse(error, 'Failed to fetch
  dashboard statistics')` outer-catch** — matches
  the `client-items-stats-query` sibling helper
  contract (NOT `safeErrorResponse` like
  `client-items-import-sample-query`). The outer
  catch maps any thrown error to a 500 with the
  documented message. UNIQUE within the
  dashboard-stats family: this is the FIRST
  per-source-file GET smoke pinning the helper-
  contract pairing for the dashboard-stats
  endpoint specifically.
- **`getClientDashboardRepository().getStats(userId)`
  repository-delegation** — UNIQUE: the FIRST per-
  source-file GET smoke pinning a
  `getClientDashboardRepository()`-singleton-
  factory delegation (vs the
  `new ItemExportService()` direct-instantiation
  pattern of `client-items-import-sample-query`).
  The route's authentication branch fires before
  the repository call, so the spec's unauth-branch
  assertions do not exercise the repository
  directly — but the repository contract is part
  of the load-bearing design that a future
  contributor must not break.
- **Admin-allowed-on-client-endpoints note** —
  UNIQUE: the route's `requireClientAuth()` helper
  notes in a comment that admins are allowed to
  use client endpoints today; the spec pins that
  the admin-status read happens via `session.user.
  isAdmin`, NEVER via `?admin=…` / `?asAdmin=…` /
  `?bypass=…` / `?impersonate=…` query parameters.
  No prior per-source-file GET smoke pins a
  query-admin-override-bypass-prevention contract
  on a `requireClientAuth()`-gated endpoint.
- **`?from=…` / `?to=…` date-range bypass-
  prevention** — UNIQUE: the FIRST per-source-
  file GET smoke pinning a date-range query-
  parameter invariance contract on a stats
  endpoint. The route returns the full all-time
  payload today; a regression that reads
  `searchParams.get('from')` /
  `searchParams.get('to')` before the gate would
  change the response payload shape on the auth
  branch. The unauth branch's status must be
  invariant to the date-range keys.

## Why this spec is the first dashboard-stats GET smoke

The route under test
([`apps/web/app/api/client/dashboard/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/dashboard/stats/route.ts))
exports only `GET` with a **zero-argument** handler
signature (Next 16 form — no `NextRequest` argument
and no `searchParams` reads). The handler combines:

1. **`requireClientAuth()`** — discriminated-union
   auth helper. Returns `{ success: false, response:
   <401 NextResponse> }` on failure (the route
   returns `authResult.response` directly via the
   early-return idiom) or `{ success: true,
   userId: string }` on success.
2. **`getClientDashboardRepository()`** — singleton-
   factory pattern. Returns the dashboard repository
   instance.
3. **`dashboardRepository.getStats(userId)`** —
   load-bearing repository-delegation call. Returns
   the dashboard payload with `totalSubmissions`,
   `totalViews`, `totalVotesReceived`,
   `totalCommentsReceived`, `viewsAvailable`,
   `recentActivity`, `uniqueItemsInteracted`,
   `totalActivity`, `activityChartData`,
   `engagementChartData`, `submissionTimeline`,
   `engagementOverview`, `statusBreakdown`, and
   `topItems` keys.
4. **Spread-stats success envelope** —
   `NextResponse.json({ success: true, ...stats })`.
   The spread merges the dashboard fields into the
   top level of the response envelope alongside
   `success`. UNIQUE within the
   `requireClientAuth()`-gated GET family.
5. **Outer catch** — `serverErrorResponse(error,
   'Failed to fetch dashboard statistics')` maps
   any thrown error to a 500 with the documented
   message. The catch can ONLY fire AFTER the auth
   gate has already let the call through, so the
   unauth branch is invariant to it.
6. **Method-resolution surface** — the route
   exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
   `DELETE` round-trip to a 405 (Next.js missing-
   method response). The spec does NOT walk the
   cross-method surface today — the focus is the
   query-param surface on the unauth GET branch.

The spec's unauth-branch focus is the load-bearing
contract: every assertion below pins that the
response is deterministically 401 on the
unauthenticated GET branch regardless of which
keys the caller appends to the URL. A regression
that switches the signature to `GET(request:
NextRequest)` and starts reading
`request.nextUrl.searchParams.get(...)` would not
change the unauth branch's status (the gate fires
first), but a regression that reads `searchParams`
**before** the gate (e.g. for a `?token=…`
magic-token bypass or a `?userId=…` admin-
impersonation key that bypasses
`requireClientAuth()`) would change the unauth
branch's behaviour from "always 401" to "200 / 400
/ 500 if the right query is present" — and that
change is exactly what this spec catches.

## How the spec walks its scenario tree

The spec emits a **single query-string bulk-loop
walk** covering ~60 permutations (no-arg baseline,
`?userId=` / `?user_id=` / `?uid=` / `?id=`
admin-impersonation keys, `?clientId=` /
`?client_id=` / `?clientID=` client-terminology
variants, `?token=` / `?secret=` / `?api_key=` /
`?authorization=` / `?session=` magic-auth keys,
`?from=` / `?to=` / `?startDate=` / `?endDate=`
date-range filter keys, `?period=` / `?range=` /
`?window=` time-window keys, `?limit=` / `?offset=`
/ `?page=` pagination keys, `?fields=` / `?select=`
/ `?include=` projection keys, `?refresh=` /
`?force=` / `?fresh=` / `?cache=` / `?nocache=`
cache-busting keys, `?format=` content-negotiation,
`?locale=` / `?lang=` / `?currency=` i18n keys,
`?status=` / `?type=` filter keys, `?sort=` /
`?order=` / `?direction=` sort-override keys,
`?tenant=` / `?tenantId=` / `?org=` multi-tenancy
keys, `?admin=` / `?asAdmin=` / `?bypass=` /
`?impersonate=` admin-override keys, empty values,
repeated keys, special-character values, 500-
character long values, bogus / typo'd query keys)
plus EIGHT hand-written tests pinning the
canonical 401 envelope shape, the bogus-
parameter status invariance, the `?userId=…`
session-gate-bypass-prevention, the `?token=…`
query-token-auth-bypass-prevention, the `?admin=…`
query-admin-override-prevention, the `?from=…`
date-range-bypass-prevention, and the multi-
permutation shape stability across three different
parameter sets.

| Block                                                                                                  | Purpose                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Query-string bulk-loop walk (~60 permutations)                                                         | Pins `< 500` on every parameter combination — the auth gate fires before the dashboard-repository call.                |
| `GET /api/client/dashboard/stats returns 401 with the canonical { success: false, error } envelope on the unauth branch` | Pins `response.status() === 401`, `body.success === false`, and `typeof body.error === 'string'`.                      |
| `GET /api/client/dashboard/stats returns 401 identically with and without bogus query parameters`     | Pins status invariance to any combination of unknown query keys.                                                        |
| `GET /api/client/dashboard/stats?userId=… does NOT bypass the session gate`                            | Pins that `?userId=` / `?user_id=` / `?uid=` / `?id=` / `?clientId=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/dashboard/stats?token=… does NOT introduce a query-token auth bypass`                | Pins that `?token=` / `?secret=` / `?api_key=` / `?authorization=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/dashboard/stats?admin=… does NOT introduce a query-admin-override`                   | Pins that `?admin=` / `?asAdmin=` / `?bypass=` / `?impersonate=` keys all return the same 401 as the no-arg baseline.   |
| `GET /api/client/dashboard/stats?from=… date-range params do NOT change the unauth branch`            | Pins that `?from=` / `?to=` / `?period=` keys all return the same 401 as the no-arg baseline.                          |
| `GET /api/client/dashboard/stats keeps the response shape stable across param permutations`           | Pins the canonical 401 envelope shape across three different parameter sets.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a non-crashing
   status. The route's auth gate fires before any
   potential `searchParams` parsing or dashboard-
   repository call, so the unauthenticated GET
   surface returns 401 deterministically. There is
   no 5xx branch reachable on the unauthenticated
   GET surface because the catch can only fire
   AFTER the gate has already let the call through.
2. **Canonical 401 envelope shape** —
   `response.status() === 401`, `body.success ===
   false`, and `typeof body.error === 'string'` on
   the no-arg baseline. The body's `error` value
   is `'Unauthorized. Please sign in to continue.'`
   today, but the test only pins the type to
   accommodate any future i18n-friendly rework.
3. **Status invariance to bogus query parameters**
   — the response status with
   `?userId=admin&period=7d&token=anything&unknown=
   value` must equal the no-arg baseline status
   (401) and the body shape must remain the same.
4. **No `?userId=…` session-gate bypass** — five
   distinct admin-impersonation key shapes
   (`?userId=admin`, `?user_id=admin`, `?uid=admin`,
   `?id=admin`, `?clientId=admin`) all return the
   same 401 as the no-arg baseline. A regression
   that reads `searchParams.get('userId')` as a
   fallback for `requireClientAuth()`'s
   `session.user.id` resolution would change the
   unauth branch from "always 401" to "200 if
   `?userId=…` is present" and silently grant any
   anonymous caller arbitrary-user dashboard access.
5. **No `?token=…` query-token bypass** — four
   distinct magic-auth key shapes (`?token=…`,
   `?secret=…`, `?api_key=…`,
   `?authorization=Bearer+…`) all return the same
   401 as the no-arg baseline. The route
   authenticates via the NextAuth session cookie
   only.
6. **No `?admin=…` query-admin-override** — five
   distinct admin-override key shapes (`?admin=1`,
   `?admin=true`, `?asAdmin=true`, `?bypass=1`,
   `?impersonate=admin`) all return the same 401
   as the no-arg baseline. The route's
   `requireClientAuth()` helper notes that admins
   are allowed to use client endpoints today, but
   the admin-status read happens via
   `session.user.isAdmin`, NEVER via the query
   string.
7. **No `?from=…` date-range bypass** — five
   distinct date-range key shapes
   (`?from=2026-01-01`, `?to=2026-12-31`,
   `?from=2026-01-01&to=2026-12-31`, `?period=7d`,
   `?period=invalid`) all return the same 401 as
   the no-arg baseline.
8. **Multi-permutation envelope-shape stability**
   — three different parameter sets (no-arg,
   `?userId=admin&period=7d&fields=topItems&admin=1`,
   `?from=invalid&period=invalid&token=foo&unknown=bar`)
   all return `401` with the canonical
   `{ success: false, error: <string> }` envelope.

## See also

- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-items-stats-query.spec.ts`
  and pins the `{ success: true, stats: ... }`
  nested-stats success envelope on the auth branch
  (vs the spread-stats `{ success: true, ...stats }`
  shape this spec pins). Both specs share the
  same `requireClientAuth()` discriminated-union
  auth-helper return contract and the same
  `'Unauthorized. Please sign in to continue.'`
  longer-message TWO-key 401 envelope.
- The neighbouring `requireClientAuth()`-gated
  client family specs
  [`client-items-method-spec.md`](client-items-method-spec.md),
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md),
  [`client-items-import-validate-method-spec.md`](client-items-import-validate-method-spec.md),
  and
  [`client-items-import-sample-query-spec.md`](client-items-import-sample-query-spec.md)
  cover the parallel `client/items/*` routes that
  share the `requireClientAuth()` gate but diverge
  on success-envelope shape and outer-catch helper.
- The cross-cutting
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader auth-protected client surface
  that this dashboard-stats endpoint sits within.
- The neighbouring sibling
  [`client-geo-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-geo-stats-query.spec.ts)
  covers the `/api/client/geo-stats` companion
  endpoint that returns geographic-distribution
  stats with a parallel `requireClientAuth()` gate.
  No per-source-file landing page yet for the
  geo-stats sibling.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- The production client-dashboard repository at
  `apps/web/lib/repositories/client-dashboard.repository.ts`
  is the load-bearing data layer that the
  dashboard-stats endpoint delegates to. A
  regression in the repository's `getStats(userId)`
  signature would surface as a 500 on the auth
  branch — out of scope for this spec.
