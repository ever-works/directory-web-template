---
id: client-geo-stats-query-spec
title: E2E Client Geo Stats Query Spec (apps/web-e2e/tests/api/client-geo-stats-query.spec.ts)
sidebar_label: E2E Client Geo Stats Query Spec
sidebar_position: 618
---

# E2E Client Geo Stats Query Spec — `apps/web-e2e/tests/api/client-geo-stats-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**`requireClientAuth()`-gated client geo-stats GET /
query-param surface smoke spec** paired with
[`apps/web-e2e/tests/api/client-geo-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-geo-stats-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins a
**`requireClientAuth()`-gated zero-argument handler**
combining a **`getClientItemRepository().getGeoStatsByUser(userId)`
repository-delegation pattern** (NOT
`getClientDashboardRepository().getStats(userId)`
like the sibling `client-dashboard-stats-query`
spec, NOT `getClientItemRepository().getStatsByUser(userId)`
like the sibling `client-items-stats-query` spec),
a **spread-geo-stats success envelope `{ success: true,
...geoStats }`** (matches the spread-into-envelope
shape pinned by `client-dashboard-stats-query` --
NOT the `{ success: true, stats: <statsObject> }`
nested shape pinned by `client-items-stats-query`),
a **`serverErrorResponse(error, 'Failed to fetch
geographic statistics')` outer catch**, and a
**six-bypass-prevention assertion battery**
(`?userId=…` admin-impersonation, `?token=…` magic-
token bypass, `?admin=…` query-admin-override,
`?country=…` / `?city=…` / `?lat=…` geographic-filter
bypass, multi-permutation shape stability) on top of
the standard query-string bulk-loop walk.

## What's distinct from EVERY prior per-source-file GET smoke

- **`requireClientAuth()` discriminated-union auth
  gate (zero-argument handler)** — UNIQUE: every
  prior `requireClientAuth()`-gated GET smoke takes
  a `request: NextRequest` argument EXCEPT the
  sibling `client-dashboard-stats-query` spec; this
  is the THIRD `requireClientAuth()`-gated GET
  smoke after `client-items-stats-query` and
  `client-dashboard-stats-query`, and the SECOND
  zero-argument handler in the
  `requireClientAuth()` family. The auth helper
  returns `{ success: false, response: <401
  NextResponse> }` on failure or `{ success: true,
  userId: string }` on success — the
  discriminated-union shape that the spec validates
  by asserting `response.status() === 401`.
- **`getClientItemRepository().getGeoStatsByUser(userId)`
  repository-delegation** — UNIQUE: the FIRST per-
  source-file GET smoke pinning a
  `getClientItemRepository()`-singleton-factory
  delegation to the `getGeoStatsByUser(userId)`
  method (NOT `getStatsByUser(userId)` like the
  sibling `client-items-stats-query` spec, NOT
  `getStats(userId)` on the dashboard repository
  like the sibling `client-dashboard-stats-query`
  spec). The route shares the
  `getClientItemRepository()` singleton-factory
  with the `client-items-stats-query` route but
  diverges on which repository method it invokes.
  The route's authentication branch fires before
  the repository call, so the spec's unauth-branch
  assertions do not exercise the repository
  directly — but the repository contract is part
  of the load-bearing design that a future
  contributor must not break.
- **Spread-geo-stats success envelope `{ success:
  true, ...geoStats }`** — UNIQUE: the SECOND per-
  source-file GET smoke (after
  `client-dashboard-stats-query`) pinning a
  spread-into-envelope success contract where the
  geo-stats fields (`total_items`,
  `items_with_location`, `items_remote`,
  `service_area_breakdown`, `top_cities`,
  `top_countries`) become top-level keys of the
  response envelope alongside `success`. NOT the
  nested-stats `{ success: true, stats: ... }`
  shape used by the sibling
  `client-items-stats-query` spec. UNIQUE within
  the spread-stats family: the FIRST per-source-
  file GET smoke pinning a spread-stats envelope
  on a **geographic** dataset (vs the dashboard
  payload of the sibling
  `client-dashboard-stats-query` spec).
- **Six-bypass-prevention assertion battery** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a six-test bypass-prevention battery
  (`?userId=…` does NOT bypass the session gate,
  `?token=…` does NOT introduce a query-token
  bypass, `?admin=…` does NOT introduce a query-
  admin-override, `?country=…` / `?city=…` /
  `?lat=…` geographic-filter params do NOT change
  the unauth branch, multi-permutation shape
  stability across three different parameter sets).
  The sibling `client-dashboard-stats-query` spec
  pins five bypass-prevention contracts; this spec
  extends the battery with the geographic-filter
  bypass-prevention contract that no prior per-
  source-file GET smoke covers.
- **Geographic-filter bypass-prevention** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a geographic-filter query-parameter
  invariance contract on a stats endpoint. The
  route returns the full per-user payload today
  (no per-country / per-city filtering); a
  regression that reads `searchParams.get('country')`
  / `searchParams.get('city')` / `searchParams.get('lat')`
  / `searchParams.get('lng')` / `searchParams.get('bbox')`
  / `searchParams.get('radius')` before the gate
  would change the response payload shape on the
  auth branch. The unauth branch's status must be
  invariant to the geographic-filter keys.
- **`serverErrorResponse(error, 'Failed to fetch
  geographic statistics')` outer-catch** — matches
  the discriminated-union helper-contract shared
  with the `client-dashboard-stats-query` and
  `client-items-stats-query` siblings (NOT
  `safeErrorResponse` like
  `client-items-import-sample-query`). The outer
  catch maps any thrown error to a 500 with the
  documented message. UNIQUE within the geo-stats
  family: this is the FIRST per-source-file GET
  smoke pinning the helper-contract pairing for
  the geo-stats endpoint specifically.
- **Admin-allowed-on-client-endpoints note** —
  UNIQUE: the route's `requireClientAuth()` helper
  notes in a comment that admins are allowed to
  use client endpoints today; the spec pins that
  the admin-status read happens via
  `session.user.isAdmin`, NEVER via `?admin=…` /
  `?asAdmin=…` / `?bypass=…` / `?impersonate=…`
  query parameters. Matches the sibling
  `client-dashboard-stats-query` spec's contract
  for a parallel `requireClientAuth()`-gated
  client-tree endpoint.
- **`?lat=…` / `?lng=…` / `?bbox=…` / `?radius=…`
  spatial-filter bypass-prevention** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  spatial-filter query-parameter invariance
  contract. The route returns the full per-user
  payload today; a regression that adds spatial
  filtering ("items near a point" or "items inside
  a bounding box") before the gate would change
  the response payload shape on the auth branch.
- **`?serviceArea=…` / `?service_area=…` /
  `?coverage=…` service-area-filter bypass-
  prevention** — UNIQUE: the FIRST per-source-
  file GET smoke pinning a service-area-filter
  query-parameter invariance contract. The
  service-area filter keys are particularly
  relevant to the `service_area_breakdown` array
  inside the response payload.
- **`?topN=…` / `?fields=top_cities` per-bucket
  pagination/projection bypass-prevention** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a per-bucket pagination key (`?topN=…`)
  and per-bucket projection keys
  (`?fields=top_cities`, `?fields=top_countries,
  service_area_breakdown`, `?select=items_with_location`,
  `?include=items_remote`) invariance contract.
  These keys are particularly tempting on a geo-
  stats endpoint where the `top_cities` and
  `top_countries` arrays could be paginated or
  filtered.
- **`?format=geojson` / `?format=kml` content-
  negotiation bypass-prevention** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  geographic-format content-negotiation invariance
  contract. The route returns JSON exclusively
  today; a regression that adds GeoJSON or KML
  output formats would need to respect the gate.

## Why this spec is the second zero-argument requireClientAuth GET smoke

The route under test
([`apps/web/app/api/client/geo-stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/geo-stats/route.ts))
exports only `GET` with a **zero-argument** handler
signature (Next 16 form — no `NextRequest` argument
and no `searchParams` reads). The handler combines:

1. **`requireClientAuth()`** — discriminated-union
   auth helper. Returns `{ success: false, response:
   <401 NextResponse> }` on failure (the route
   returns `authResult.response` directly via the
   early-return idiom) or `{ success: true,
   userId: string }` on success.
2. **`getClientItemRepository()`** — singleton-
   factory pattern. Returns the client-item
   repository instance. SHARED with the sibling
   `client-items-stats-query` route, but invoked
   for a different method.
3. **`clientItemRepository.getGeoStatsByUser(userId)`**
   — load-bearing repository-delegation call.
   Returns the geo-stats payload with `total_items`,
   `items_with_location`, `items_remote`,
   `service_area_breakdown`, `top_cities`, and
   `top_countries` keys.
4. **Spread-geo-stats success envelope** —
   `NextResponse.json({ success: true, ...geoStats })`.
   The spread merges the geo-stats fields into the
   top level of the response envelope alongside
   `success`. SHARED-SHAPE with the sibling
   `client-dashboard-stats-query` spec — both
   spread their respective stats payloads into the
   envelope rather than nesting under a `stats`
   key.
5. **Outer catch** — `serverErrorResponse(error,
   'Failed to fetch geographic statistics')` maps
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
magic-token bypass, a `?userId=…` admin-
impersonation key that bypasses
`requireClientAuth()`, or a `?country=…` /
`?city=…` per-region scoping that forwards a
caller-supplied region into the geo-stats
repository) would change the unauth branch's
behaviour from "always 401" to "200 / 400 / 500
if the right query is present" — and that change
is exactly what this spec catches.

## How the spec walks its scenario tree

The spec emits a **single query-string bulk-loop
walk** covering ~95 permutations (no-arg baseline,
`?userId=` / `?user_id=` / `?uid=` / `?id=`
admin-impersonation keys, `?clientId=` /
`?client_id=` / `?clientID=` client-terminology
variants, `?token=` / `?secret=` / `?api_key=` /
`?authorization=` / `?session=` magic-auth keys,
`?country=` / `?city=` / `?region=` / `?area=` /
`?countryCode=` geographic-filter keys,
`?serviceArea=` / `?service_area=` / `?coverage=`
service-area filter keys, `?lat=` / `?lng=` /
`?bbox=` / `?radius=` spatial-filter keys,
`?period=` / `?range=` / `?window=` time-window
keys, `?limit=` / `?offset=` / `?page=` / `?topN=`
pagination keys, `?fields=` / `?select=` /
`?include=` projection keys, `?refresh=` /
`?force=` / `?fresh=` / `?cache=` / `?nocache=`
cache-busting keys, `?format=json` / `?format=xml`
/ `?format=csv` / `?format=geojson` / `?format=kml`
content-negotiation, `?locale=` / `?lang=` /
`?currency=` i18n keys, `?status=` / `?type=`
filter keys, `?sort=` / `?order=` / `?direction=`
sort-override keys, `?tenant=` / `?tenantId=` /
`?org=` multi-tenancy keys, `?admin=` /
`?asAdmin=` / `?bypass=` / `?impersonate=` admin-
override keys, empty values, repeated keys,
special-character values, 500-character long
values, bogus / typo'd query keys) plus EIGHT
hand-written tests pinning the canonical 401
envelope shape, the bogus-parameter status
invariance, the `?userId=…` session-gate-bypass-
prevention, the `?token=…` query-token-auth-
bypass-prevention, the `?admin=…` query-admin-
override-prevention, the `?country=…` /
`?city=…` / `?lat=…` geographic-filter-bypass-
prevention, and the multi-permutation shape
stability across three different parameter sets.

| Block                                                                                                  | Purpose                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Query-string bulk-loop walk (~95 permutations)                                                         | Pins `< 500` on every parameter combination — the auth gate fires before the geo-stats-repository call.                 |
| `GET /api/client/geo-stats returns 401 with the canonical { success: false, error } envelope on the unauth branch` | Pins `response.status() === 401`, `body.success === false`, and `typeof body.error === 'string'`.                      |
| `GET /api/client/geo-stats returns 401 identically with and without bogus query parameters`           | Pins status invariance to any combination of unknown query keys.                                                        |
| `GET /api/client/geo-stats?userId=… does NOT bypass the session gate`                                  | Pins that `?userId=` / `?user_id=` / `?uid=` / `?id=` / `?clientId=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/geo-stats?token=… does NOT introduce a query-token auth bypass`                      | Pins that `?token=` / `?secret=` / `?api_key=` / `?authorization=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/geo-stats?admin=… does NOT introduce a query-admin-override`                         | Pins that `?admin=` / `?asAdmin=` / `?bypass=` / `?impersonate=` keys all return the same 401 as the no-arg baseline.   |
| `GET /api/client/geo-stats?country=… geographic-filter params do NOT change the unauth branch`        | Pins that `?country=` / `?city=` / `?lat=` / `?lng=` / `?bbox=` / `?radius=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/geo-stats keeps the response shape stable across param permutations`                 | Pins the canonical 401 envelope shape across three different parameter sets.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a non-crashing
   status. The route's auth gate fires before any
   potential `searchParams` parsing or geo-stats-
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
   `?userId=admin&country=US&token=anything&unknown=
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
   anonymous caller arbitrary-user geo-stats
   access.
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
7. **No `?country=…` geographic-filter bypass** —
   seven distinct geographic-filter key shapes
   (`?country=US`, `?city=NYC`, `?country=US&city=NYC`,
   `?lat=40.7128&lng=-74.0060`, `?bbox=-74.1,40.6,-73.9,40.8`,
   `?radius=10`, `?country=invalid`) all return
   the same 401 as the no-arg baseline. A
   regression that reads
   `searchParams.get('country')` /
   `searchParams.get('city')` /
   `searchParams.get('lat')` before the gate would
   change the response payload shape on the auth
   branch and could leak per-user data through a
   cross-tenant filter regression.
8. **Multi-permutation envelope-shape stability**
   — three different parameter sets (no-arg,
   `?userId=admin&country=US&fields=top_cities&admin=1`,
   `?country=invalid&period=invalid&token=foo&unknown=bar`)
   all return `401` with the canonical
   `{ success: false, error: <string> }` envelope.

## See also

- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-dashboard-stats-query-spec.md`](client-dashboard-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`
  and pins the spread-stats `{ success: true,
  ...stats }` shape this spec mirrors. Both specs
  share the same `requireClientAuth()`
  discriminated-union auth-helper return contract,
  the same `'Unauthorized. Please sign in to
  continue.'` longer-message TWO-key 401 envelope,
  the same zero-argument handler signature, and
  the same spread-into-envelope success-payload
  shape — but diverge on which repository they
  delegate to (`getClientDashboardRepository()` vs
  `getClientItemRepository()`) and on which
  bypass-prevention assertions they pin (date-
  range vs geographic-filter).
- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-items-stats-query.spec.ts`
  and pins the `{ success: true, stats: ... }`
  nested-stats success envelope shape on the auth
  branch (vs the spread-stats shape this spec
  pins). Shares the
  `getClientItemRepository()` singleton-factory
  with this route, but diverges on which
  repository method it invokes (`getStatsByUser`
  vs `getGeoStatsByUser`).
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
  that this geo-stats endpoint sits within.
- The neighbouring sibling
  [`client-items-coordinates-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts)
  covers another geographic-data endpoint
  (`/api/client/items/coordinates`) under the
  client-tree. No per-source-file landing page
  yet for the coordinates sibling.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- The production client-item repository at
  `apps/web/lib/repositories/client-item.repository.ts`
  is the load-bearing data layer that the
  geo-stats endpoint delegates to via the
  `getGeoStatsByUser(userId)` method. A regression
  in the repository's `getGeoStatsByUser(userId)`
  signature would surface as a 500 on the auth
  branch — out of scope for this spec.
