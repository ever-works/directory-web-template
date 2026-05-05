---
id: client-items-coordinates-query-spec
title: E2E Client Items Coordinates Query Spec (apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts)
sidebar_label: E2E Client Items Coordinates Query Spec
sidebar_position: 619
---

# E2E Client Items Coordinates Query Spec — `apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**`requireClientAuth()`-gated client items-coordinates
GET / query-param surface smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts).

This is the **third per-source-file GET smoke** the
docs tree publishes that pins a
**`requireClientAuth()`-gated zero-argument handler**
(after the sibling `client-dashboard-stats-query`
and `client-geo-stats-query` specs) combining a
**`getClientItemRepository().getCoordinatesByUser(userId)`
repository-delegation pattern** (NOT
`getStatsByUser(userId)` like the
`client-items-stats-query` sibling, NOT
`getGeoStatsByUser(userId)` like the
`client-geo-stats-query` sibling, NOT
`getStats(userId)` on the
`getClientDashboardRepository()` singleton like
the `client-dashboard-stats-query` sibling), a
**nested-`coordinates`-keyed success envelope
`{ success: true, coordinates: Array<{ slug, name,
latitude, longitude }> }`** (the FIRST per-source-
file GET smoke pinning a `coordinates`-keyed
nested-array success envelope -- distinct from
both the spread-into-envelope shape pinned by
`client-dashboard-stats-query` and
`client-geo-stats-query`, AND the `stats`-keyed
nested-object shape pinned by
`client-items-stats-query`), a
**`serverErrorResponse(error, 'Failed to fetch
item coordinates')` outer catch**, and a
**nine-bypass-prevention assertion battery**
extending the six-test battery of the sibling
`client-geo-stats-query` spec with a
**single-item-lookup bypass-prevention contract**
(`?slug=…` / `?itemId=…` / `?itemSlug=…`
invariance), a **content-negotiation
bypass-prevention contract** (`?format=geojson` /
`?format=kml` / `?format=xml` / `?format=csv`
invariance), and an **Accept-header invariance
contract** (`Accept: application/geo+json` /
`application/xml` / `text/html` / `*/*`
round-trip to the same 401 as
`Accept: application/json`).

## What's distinct from EVERY prior per-source-file GET smoke

- **`requireClientAuth()` discriminated-union auth
  gate (zero-argument handler)** — the THIRD
  `requireClientAuth()`-gated GET smoke (after
  `client-items-stats-query`,
  `client-dashboard-stats-query`, and
  `client-geo-stats-query`) and the THIRD
  zero-argument handler in the
  `requireClientAuth()` family. The auth helper
  returns `{ success: false, response: <401
  NextResponse> }` on failure or `{ success:
  true, userId: string }` on success — the
  discriminated-union shape that the spec
  validates by asserting `response.status() ===
  401`.
- **`getClientItemRepository().getCoordinatesByUser(userId)`
  repository-delegation** — UNIQUE: the FIRST
  per-source-file GET smoke pinning a
  `getClientItemRepository()`-singleton-factory
  delegation to the `getCoordinatesByUser(userId)`
  method (NOT `getStatsByUser(userId)` like the
  sibling `client-items-stats-query` spec, NOT
  `getGeoStatsByUser(userId)` like the sibling
  `client-geo-stats-query` spec, NOT
  `getStats(userId)` on the dashboard repository
  like the sibling `client-dashboard-stats-query`
  spec). The route shares the
  `getClientItemRepository()` singleton-factory
  with the `client-items-stats-query` and
  `client-geo-stats-query` routes but diverges on
  which repository method it invokes. The route's
  authentication branch fires before the
  repository call, so the spec's unauth-branch
  assertions do not exercise the repository
  directly — but the repository contract is part
  of the load-bearing design that a future
  contributor must not break.
- **Nested-`coordinates`-keyed success envelope
  `{ success: true, coordinates: Array<{ slug,
  name, latitude, longitude }> }`** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  `coordinates`-keyed nested-array success
  contract. Distinct from the spread-into-
  envelope shape pinned by
  `client-dashboard-stats-query`
  (`{ success: true, ...stats }`) and
  `client-geo-stats-query`
  (`{ success: true, ...geoStats }`) — a
  regression that switches the route to a
  `{ success: true, ...coordinates }` spread-into-
  envelope shape would break consumer code that
  reads `body.coordinates`. ALSO distinct from
  the `stats`-keyed nested-object shape pinned by
  `client-items-stats-query`
  (`{ success: true, stats: <statsObject> }`) —
  this is a nested-array NOT a nested-object.
- **Nine-bypass-prevention assertion battery** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a nine-test bypass-prevention battery
  (canonical 401 envelope shape, bogus-parameter
  status invariance, `?userId=…` admin-
  impersonation, `?token=…` magic-token bypass,
  `?admin=…` query-admin-override, `?bbox=…`
  spatial-filter bypass, `?slug=…` single-item-
  lookup bypass, `?format=geojson` content-
  negotiation bypass, multi-permutation shape
  stability, Accept-header invariance). The
  `client-geo-stats-query` sibling pins six
  bypass-prevention contracts; this spec extends
  the battery with three additional contracts
  (single-item lookup, content negotiation,
  Accept-header) that no prior per-source-file
  GET smoke covers.
- **Single-item-lookup bypass-prevention** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a `?slug=…` / `?itemId=…` / `?itemSlug=…`
  query-parameter invariance contract on a
  collection endpoint. The route returns the full
  per-user coordinate list today (no per-slug /
  per-itemId filtering); a regression that reads
  `searchParams.get('slug')` /
  `searchParams.get('itemId')` before the gate
  would change the response payload shape on the
  auth branch from a collection (`Array<…>`) to a
  single-item lookup, breaking consumer code that
  iterates `body.coordinates`.
- **Content-negotiation bypass-prevention** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a content-negotiation
  (`?format=geojson` / `?format=kml` /
  `?format=xml` / `?format=csv`) query-parameter
  invariance contract that pins ALL non-default
  format keys to the same 401 as the no-arg
  baseline (the sibling `client-geo-stats-query`
  spec lists `?format=geojson` / `?format=kml` in
  its bulk-loop walk but does NOT pin a hand-
  written named test for the content-negotiation
  bypass-prevention).
- **Accept-header invariance** — UNIQUE: the
  FIRST per-source-file GET smoke pinning an
  `Accept`-header invariance contract (`Accept:
  application/geo+json` / `application/xml` /
  `text/html` / `*/*` round-trip to the same 401
  as `Accept: application/json`). The route does
  not negotiate content-types today; this
  contract pins the "auth gate fires before any
  Accept-header parsing" invariant. No prior
  `requireClientAuth()`-gated GET smoke pins a
  hand-written Accept-header invariance test.
- **`?lat=NaN` / `?lat=Infinity` defensive
  spatial-filter bypass-prevention** — UNIQUE:
  the FIRST per-source-file GET smoke pinning
  defensive spatial-filter values (`NaN` /
  `Infinity`) on the unauth branch. A regression
  that reads `parseFloat(searchParams.get('lat'))`
  before the gate could trigger a `NaN`-
  comparison bug in a future spatial-filter
  implementation; this spec pins that the gate
  fires first, neutralising the bug.
- **`?zoom=…` / `?center=lat,lng` map-control
  bypass-prevention** — UNIQUE: the FIRST per-
  source-file GET smoke pinning map-control
  query keys (`?zoom=12` /
  `?center=40.7128,-74.0060`) — these are the
  obvious extensions for a future "items inside
  the current viewport" feature.
- **`serverErrorResponse(error, 'Failed to fetch
  item coordinates')` outer-catch** — matches
  the discriminated-union helper-contract shared
  with the `client-dashboard-stats-query`,
  `client-geo-stats-query`, and
  `client-items-stats-query` siblings (NOT
  `safeErrorResponse` like
  `client-items-import-sample-query`). The outer
  catch maps any thrown error to a 500 with the
  documented message. UNIQUE within the
  coordinates family: this is the FIRST per-
  source-file GET smoke pinning the helper-
  contract pairing for the coordinates endpoint
  specifically.
- **Admin-allowed-on-client-endpoints note** —
  matches the sibling `client-dashboard-stats-query`
  and `client-geo-stats-query` specs' contract
  for a parallel `requireClientAuth()`-gated
  client-tree endpoint. The spec pins that the
  admin-status read happens via
  `session.user.isAdmin`, NEVER via `?admin=…` /
  `?asAdmin=…` / `?bypass=…` / `?impersonate=…`
  query parameters.

## Why this spec is the third zero-argument requireClientAuth GET smoke

The route under test
([`apps/web/app/api/client/items/coordinates/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/coordinates/route.ts))
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
   `client-items-stats-query` route AND the
   sibling `client-geo-stats-query` route, but
   invoked for a different method (`getCoordinatesByUser`).
3. **`clientItemRepository.getCoordinatesByUser(userId)`**
   — load-bearing repository-delegation call.
   Returns the per-user coordinate list as
   `Array<{ slug: string, name: string,
   latitude: number, longitude: number }>`.
4. **Nested-`coordinates`-keyed success envelope**
   — `NextResponse.json({ success: true,
   coordinates })`. The repository result is
   nested under a `coordinates` key (NOT spread
   into the envelope like the
   `client-dashboard-stats-query` /
   `client-geo-stats-query` siblings, NOT under a
   `stats` key like the `client-items-stats-query`
   sibling). UNIQUE within the
   `requireClientAuth()`-gated GET family.
5. **Outer catch** — `serverErrorResponse(error,
   'Failed to fetch item coordinates')` maps any
   thrown error to a 500 with the documented
   message. The catch can ONLY fire AFTER the
   auth gate has already let the call through, so
   the unauth branch is invariant to it.
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
keys the caller appends to the URL or which
`Accept` header the caller sets. A regression that
switches the signature to `GET(request:
NextRequest)` and starts reading
`request.nextUrl.searchParams.get(...)` would not
change the unauth branch's status (the gate fires
first), but a regression that reads `searchParams`
**before** the gate (e.g. for a `?token=…`
magic-token bypass, a `?userId=…` admin-
impersonation key that bypasses
`requireClientAuth()`, a `?slug=…` single-item-
lookup branch that forwards a caller-supplied slug
to the coordinates repository, or a `?format=geojson`
content-negotiation switch that emits a `application/geo+json`
response without auth) would change the unauth
branch's behaviour from "always 401" to "200 / 400
/ 500 if the right query is present" — and that
change is exactly what this spec catches.

## How the spec walks its scenario tree

The spec emits a **single query-string bulk-loop
walk** covering ~110 permutations (no-arg
baseline, `?userId=` / `?user_id=` / `?uid=` /
`?id=` admin-impersonation keys, `?clientId=` /
`?client_id=` / `?clientID=` client-terminology
variants, `?itemId=` / `?slug=` / `?itemSlug=`
single-item-lookup keys, `?token=` / `?secret=` /
`?api_key=` / `?authorization=` / `?session=`
magic-auth keys, `?country=` / `?city=` /
`?region=` / `?area=` / `?countryCode=`
geographic-filter keys, `?lat=` / `?lng=` /
`?bbox=` / `?radius=` / `?zoom=` / `?center=`
spatial / map-control filter keys, `?status=` /
`?type=` / `?published=` item-status filter keys,
`?limit=` / `?offset=` / `?page=` / `?cursor=`
pagination keys, `?fields=` / `?select=` /
`?include=` projection keys, `?refresh=` /
`?force=` / `?fresh=` / `?cache=` / `?nocache=`
cache-busting keys, `?format=json` / `?format=xml`
/ `?format=csv` / `?format=geojson` / `?format=kml`
content-negotiation, `?locale=` / `?lang=` i18n
keys, `?sort=` / `?order=` / `?direction=` sort-
override keys, `?tenant=` / `?tenantId=` /
`?org=` multi-tenancy keys, `?admin=` /
`?asAdmin=` / `?bypass=` / `?impersonate=` admin-
override keys, empty values, repeated keys,
special-character values including `lat=NaN` /
`lat=Infinity`, 500-character long values, bogus
/ typo'd query keys) plus NINE hand-written
tests pinning the canonical 401 envelope shape,
the bogus-parameter status invariance, the
`?userId=…` session-gate-bypass-prevention, the
`?token=…` query-token-auth-bypass-prevention,
the `?admin=…` query-admin-override-prevention,
the `?bbox=…` spatial-filter-bypass-prevention,
the `?slug=…` single-item-lookup-bypass-
prevention, the `?format=geojson` content-
negotiation-bypass-prevention, the multi-
permutation shape stability across three
different parameter sets, and the Accept-header
invariance across five Accept-header values.

| Block                                                                                            | Purpose                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Query-string bulk-loop walk (~110 permutations)                                                  | Pins `< 500` on every parameter combination — the auth gate fires before the coordinates-repository call.              |
| `GET /api/client/items/coordinates returns 401 with the canonical { success: false, error } envelope on the unauth branch` | Pins `response.status() === 401`, `body.success === false`, and `typeof body.error === 'string'`.                      |
| `GET /api/client/items/coordinates returns 401 identically with and without bogus query parameters` | Pins status invariance to any combination of unknown query keys.                                                        |
| `GET /api/client/items/coordinates?userId=… does NOT bypass the session gate`                    | Pins that `?userId=` / `?user_id=` / `?uid=` / `?id=` / `?clientId=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/items/coordinates?token=… does NOT introduce a query-token auth bypass`         | Pins that `?token=` / `?secret=` / `?api_key=` / `?authorization=` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/items/coordinates?admin=… does NOT introduce a query-admin-override`            | Pins that `?admin=` / `?asAdmin=` / `?bypass=` / `?impersonate=` keys all return the same 401 as the no-arg baseline.   |
| `GET /api/client/items/coordinates?bbox=… spatial-filter params do NOT change the unauth branch` | Pins that `?lat=` / `?lng=` / `?bbox=` / `?radius=` / `?zoom=` / `?center=` / `?lat=NaN` / `?lat=Infinity` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/items/coordinates?slug=… does NOT introduce a single-item lookup branch`        | Pins that `?slug=` / `?itemId=` / `?itemSlug=` keys all return the same 401 as the no-arg baseline.                    |
| `GET /api/client/items/coordinates?format=geojson does NOT introduce a content-negotiation bypass` | Pins that `?format=json` / `?format=xml` / `?format=csv` / `?format=geojson` / `?format=kml` keys all return the same 401 as the no-arg baseline. |
| `GET /api/client/items/coordinates keeps the response shape stable across param permutations`   | Pins the canonical 401 envelope shape across three different parameter sets.                                            |
| `GET /api/client/items/coordinates does NOT branch on Accept header`                             | Pins that `Accept: application/json` / `application/geo+json` / `application/xml` / `text/html` / `*/*` all return 401. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a non-crashing
   status. The route's auth gate fires before any
   potential `searchParams` parsing or coordinates-
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
   value&bbox=-74.1,40.6,-73.9,40.8` must equal
   the no-arg baseline status (401) and the body
   shape must remain the same.
4. **No `?userId=…` session-gate bypass** — five
   distinct admin-impersonation key shapes
   (`?userId=admin`, `?user_id=admin`, `?uid=admin`,
   `?id=admin`, `?clientId=admin`) all return the
   same 401 as the no-arg baseline.
5. **No `?token=…` query-token bypass** — four
   distinct magic-auth key shapes (`?token=…`,
   `?secret=…`, `?api_key=…`,
   `?authorization=Bearer+…`) all return the same
   401 as the no-arg baseline.
6. **No `?admin=…` query-admin-override** — five
   distinct admin-override key shapes (`?admin=1`,
   `?admin=true`, `?asAdmin=true`, `?bypass=1`,
   `?impersonate=admin`) all return the same 401
   as the no-arg baseline.
7. **No `?bbox=…` spatial-filter bypass** — nine
   distinct spatial-filter key shapes
   (`?lat=40.7128`, `?lng=-74.0060`,
   `?lat=40.7128&lng=-74.0060`,
   `?bbox=-74.1,40.6,-73.9,40.8`, `?radius=10`,
   `?zoom=12`, `?center=40.7128,-74.0060`,
   `?lat=NaN`, `?lat=Infinity`) all return the
   same 401 as the no-arg baseline. A regression
   that reads `searchParams.get('bbox')` /
   `searchParams.get('lat')` /
   `searchParams.get('radius')` before the gate
   would change the response payload shape on the
   auth branch.
8. **No `?slug=…` single-item-lookup bypass** —
   three distinct slug-filter key shapes
   (`?slug=any-slug`, `?itemId=anything`,
   `?itemSlug=any-slug`) all return the same 401
   as the no-arg baseline. A regression that
   reads `searchParams.get('slug')` /
   `searchParams.get('itemId')` before the gate
   would change the response payload shape on the
   auth branch from a collection (`Array<…>`) to
   a single-item lookup, breaking consumer code
   that iterates `body.coordinates`.
9. **No `?format=geojson` content-negotiation
   bypass** — five distinct format key shapes
   (`?format=json`, `?format=xml`, `?format=csv`,
   `?format=geojson`, `?format=kml`) all return
   the same 401 as the no-arg baseline. A future
   `?format=geojson` extension would be a natural
   fit for a coordinates endpoint, but it must
   not bypass the auth gate.
10. **Multi-permutation envelope-shape stability**
    — three different parameter sets (no-arg,
    `?userId=admin&country=US&token=foo&format=geojson`,
    `?bbox=-74.1,40.6,-73.9,40.8&radius=10&slug=any-slug&unknown=bar`)
    all return `401` with the canonical
    `{ success: false, error: <string> }` envelope.
11. **Accept-header invariance** — five distinct
    Accept-header values (`application/json`,
    `application/geo+json`, `application/xml`,
    `text/html`, `*/*`) all return 401. The route
    does not negotiate content-types today; the
    auth gate fires before any Accept-header
    parsing.

## See also

- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-geo-stats-query-spec.md`](client-geo-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-geo-stats-query.spec.ts`
  and pins the spread-geo-stats success envelope
  shape on a stats-only payload (vs the nested-
  `coordinates`-keyed array shape this spec pins
  on a coordinate-list payload). Shares the
  `getClientItemRepository()` singleton-factory
  with this route, but diverges on which
  repository method it invokes (`getGeoStatsByUser`
  vs `getCoordinatesByUser`).
- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-dashboard-stats-query-spec.md`](client-dashboard-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`
  and pins the spread-stats success envelope
  shape (vs the nested-`coordinates`-keyed array
  shape this spec pins). Both specs share the
  same `requireClientAuth()` discriminated-union
  auth-helper return contract and the same
  `'Unauthorized. Please sign in to continue.'`
  longer-message TWO-key 401 envelope.
- The neighbouring `requireClientAuth()`-gated GET
  sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  pairs with `apps/web-e2e/tests/api/client-items-stats-query.spec.ts`
  and pins the `{ success: true, stats: ... }`
  nested-stats success envelope shape on the auth
  branch (vs the nested-`coordinates`-keyed array
  shape this spec pins). Shares the
  `getClientItemRepository()` singleton-factory
  with this route, but diverges on which
  repository method it invokes (`getStatsByUser`
  vs `getCoordinatesByUser`).
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
  that this coordinates endpoint sits within.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- The production client-item repository at
  `apps/web/lib/repositories/client-item.repository.ts`
  is the load-bearing data layer that the
  coordinates endpoint delegates to via the
  `getCoordinatesByUser(userId)` method. A
  regression in the repository's
  `getCoordinatesByUser(userId)` signature would
  surface as a 500 on the auth branch — out of
  scope for this spec.
