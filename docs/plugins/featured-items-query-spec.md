---
id: featured-items-query-spec
title: E2E Featured Items Query Spec (apps/web-e2e/tests/api/featured-items-query.spec.ts)
sidebar_label: E2E Featured Items Query Spec
sidebar_position: 625
---

# E2E Featured Items Query Spec — `apps/web-e2e/tests/api/featured-items-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public featured-items GET query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/featured-items-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/featured-items-query.spec.ts).

This is the **first per-source-file GET smoke** the docs
tree publishes that pins a **public (no-auth-gate)
tenant-resolving listing endpoint** combining a
`Number.parseInt(searchParams.get('limit') ?? '6', 10)`
default-`6` parse path, a
`Math.min(Math.max(rawLimit, 1), 50)` two-sided silent
clamp, a `Number.isFinite(rawLimit)` non-finite
fallback, a strict-string `searchParams.get(
'includeExpired') === 'true'` boolean-from-string
parse (anything other than the literal string `'true'`
keeps `includeExpired` `false`), an `await
getTenantId()` tenant-resolution short-circuit (a
`null` tenant returns `{ success: true, data: [],
count: 0 }` without ever touching the DB), and a
**try / catch empty-list fallback** that swallows
internal errors and returns `{ success: true, data: [],
count: 0 }` rather than 500ing.

## What's distinct from EVERY prior public-route GET smoke

- **Tenant-resolution short-circuit** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a route
  whose null-tenant branch returns the same
  `{ success: true, data: [], count: 0 }` envelope
  as the success branch. The route does NOT 401 or
  403 on a null tenant; it silently swallows the
  failure mode into the empty-list envelope. A
  regression that switches the null-tenant branch to
  `NextResponse.json({ success: false, error:
  'Tenant not found' }, { status: 403 })` would
  change the observable behavior on every
  permutation in this smoke without the suite going
  red, because the bulk-loop's `< 500` envelope still
  holds.
- **`Number.parseInt(value ?? '6', 10)` default-`6`
  parse path** — UNIQUE: the FIRST per-source-file
  GET smoke pinning a `Number.parseInt`-based
  query-param parse with the radix-`10` second
  argument explicit (the sibling
  `items-popularity-scores-query-spec.md` uses
  `parseInt(...)` without an explicit radix; this
  route's `Number.parseInt(..., 10)` makes the
  decimal interpretation load-bearing for any
  caller that submits a leading-`0` value, which
  some `parseInt` implementations would parse as
  octal).
- **`Math.min(Math.max(rawLimit, 1), 50)` two-sided
  silent clamp** — UNIQUE: the FIRST per-source-file
  GET smoke pinning a two-sided clamp on a query
  parameter (the sibling
  `items-popularity-scores-query-spec.md` pins a
  one-sided `Math.min(parseInt(limit), 100)`
  upper-clamp only, with no lower clamp; the sibling
  `sponsor-ads-public.spec.ts` pins a `Math.min(
  Math.max(1, Math.floor(rawLimit)), 50)` two-sided
  clamp but with `Math.floor` instead of
  `Number.parseInt`-based truncation). This route's
  clamp covers BOTH endpoints of the `[1, 50]`
  range; values below `1` are silently raised to `1`
  (`?limit=0` and `?limit=-5` become `1`), values
  above `50` are silently lowered to `50`
  (`?limit=51` / `?limit=999` / `?limit=10000`
  become `50`).
- **Strict-string `=== 'true'` boolean-from-string
  parse** — UNIQUE: the FIRST per-source-file GET
  smoke pinning a strict-string boolean parser on a
  query parameter. Anything other than the literal
  string `'true'` (lowercase, no surrounding
  whitespace) keeps `includeExpired` `false`, so
  `?includeExpired=TRUE`, `?includeExpired=1`,
  `?includeExpired=false`, `?includeExpired=` all
  keep the default. A regression that switches the
  parser to `Boolean(searchParams.get(
  'includeExpired'))` would flip the default on
  EVERY non-empty `?includeExpired=…` value (since
  `Boolean('false')` is `true`) — the smoke walk
  pins both directions of the strict-string check
  without going red because the `< 500` envelope
  still holds.
- **`isActive: true` + `tenantId` two-condition WHERE
  clause** — UNIQUE: the FIRST per-source-file GET
  smoke pinning a public listing route that combines
  the `featuredItems.isActive` flag check with the
  `featuredItems.tenantId` tenant-scoping check
  inside the same `and(...)` clause; the
  `includeExpired` parameter only affects whether
  the optional `or(isNull(featuredItems.featuredUntil),
  gte(featuredItems.featuredUntil, currentDate))`
  expiration filter is appended.
- **Multi-key composite ORDER BY** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  Drizzle `.orderBy(desc(featuredItems.featuredOrder),
  desc(featuredItems.featuredAt))` two-key composite
  ordering: items are sorted first by
  `featuredOrder` desc (higher = more prominent),
  then by `featuredAt` desc (newer ties win).
- **`{ success, data, count }` three-key envelope**
  — UNIQUE: the FIRST per-source-file GET smoke
  pinning a public-route success envelope that adds
  a `count: number` cardinality key alongside
  `success` / `data`. Every prior public-route GET
  smoke pins either a two-key `{ success, data }`
  envelope (`sponsor-ads-public`) or a non-`success`
  envelope (`items-popularity-scores`); the
  featured-items endpoint adds the `count` key so
  the consumer does not need to call `data.length`.
- **try / catch empty-list fallback (NOT 500)** —
  UNIQUE: the FIRST per-source-file GET smoke
  pinning a route that catches every internal error
  and returns the same `{ success: true, data: [],
  count: 0 }` envelope as the null-tenant branch
  and the `checkDatabaseAvailability()`
  short-circuit. Three distinct branches all
  collapse onto the same observable success envelope
  (DB-unavailable, null-tenant, error-thrown). The
  `< 500` smoke envelope is therefore the ONLY
  contract every branch shares — pinning the body
  shape would break under at least one branch.
- **Public (no-auth-gate) route** — distinct from
  the auth-gated `admin/featured-items` and
  `admin/featured-items/[id]` siblings. All callers
  (anon / signed-in / admin) see the same envelope.
- **Method-resolution surface** — the route exports
  ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
  must round-trip to a `< 500` status (Next.js
  returns 405 by default, which satisfies the
  envelope).

## Why this spec is the first public featured-items GET smoke

The route under test
([`apps/web/app/api/featured-items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/featured-items/route.ts))
exports only `GET` and is documented via a swagger
JSDoc block. The handler combines:

1. **`checkDatabaseAvailability()` short-circuit** —
   load-bearing — when the DB is not configured the
   route returns `{ success: true, data: [], count:
   0 }` without ever calling `getTenantId()` or
   touching the data layer.
2. **`searchParams` extraction** — `rawLimit =
   Number.parseInt(searchParams.get('limit') ?? '6',
   10)`; `limit = Number.isFinite(rawLimit) ?
   Math.min(Math.max(rawLimit, 1), 50) : 6`;
   `includeExpired = searchParams.get(
   'includeExpired') === 'true'`.
3. **`getTenantId()` resolution** — load-bearing —
   `null` tenant collapses to the same `{ success:
   true, data: [], count: 0 }` envelope as the
   `checkDatabaseAvailability()` short-circuit.
4. **Drizzle `WHERE` composition** — base conditions
   `eq(featuredItems.isActive, true)` +
   `eq(featuredItems.tenantId, tenantId)`; if
   `!includeExpired` an additional
   `or(isNull(featuredItems.featuredUntil),
   gte(featuredItems.featuredUntil, currentDate))`
   is appended.
5. **Drizzle `SELECT`** — `db.select().from(
   featuredItems).where(and(...conditions)).
   orderBy(desc(featuredItems.featuredOrder),
   desc(featuredItems.featuredAt)).limit(limit)`.
6. **Success envelope** — `{ success: true, data:
   featuredItemsList, count: featuredItemsList.
   length }`.
7. **Outer catch + dev-only `console.warn` +
   empty-list fallback** — every internal error
   collapses to `{ success: true, data: [], count:
   0 }`. NEVER 500.
8. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single query-string bulk-loop walk**
covering ~30 permutations (no-arg baseline, valid /
clamped / negative / zero / non-integer / float /
whitespace `limit`, strict-string / case / non-empty
`includeExpired`, combined `limit + includeExpired`,
unknown query keys) under a single top-level
`test.describe('API: /api/featured-items query-param
surface', …)`. The single load-bearing assertion in
the file is `expect(response.status()).toBeLessThan(
500)` — every permutation MUST NOT 5xx, since a 5xx
would indicate the route's parameter-parsing or
tenant-resolution plumbing crashed before the response
renderer or before the try / catch's empty-list
fallback fired.

| Block                                                                                         | Purpose                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No-arg baseline                                                                               | Pins the same path as `items.spec.ts`.                                                                                                                                                   |
| Valid `limit` (`1` / `6` / `10` / `50`)                                                       | Pins admit-no-clamp on in-range integers across both endpoints of the `[1, 50]` clamp.                                                                                                    |
| Out-of-range upper `limit` (`51` / `999` / `10000`)                                           | Pins silent `Math.min(..., 50)` upper clamp.                                                                                                                                              |
| Out-of-range lower `limit` (`0` / `-5`)                                                       | Pins silent `Math.max(..., 1)` lower clamp.                                                                                                                                               |
| Empty / `abc` / `NaN` `limit`                                                                 | Pins `Number.parseInt`-default fallback to `'6'` and `Number.isFinite(NaN) === false` non-finite branch.                                                                                  |
| Float `limit` (`6.5` / `49.9`)                                                                | Pins `Number.parseInt` integer-truncation before clamp.                                                                                                                                   |
| Whitespace / `+` `limit` (`%2010` / `%2B10`)                                                  | Pins `Number.parseInt` leading-whitespace and leading-`+` tolerance.                                                                                                                      |
| Strict-string `includeExpired` (`true` / `false` / `1` / `0` / empty / `TRUE`)                | Pins `=== 'true'` strict-equality check; only lowercase `'true'` flips the default.                                                                                                       |
| Combined `limit + includeExpired` (`limit=10&includeExpired=true`, etc.)                      | Pins both params interact correctly.                                                                                                                                                       |
| Unknown query keys (`unknown=value`, `category=tools&tag=saas`)                               | Pins silent-discard of every key the route does not read.                                                                                                                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a non-crashing
   status, since a 5xx would indicate the route's
   parameter-parsing or tenant-resolution plumbing
   crashed before the response renderer or before
   the try / catch's empty-list fallback fired.

## See also

- The cross-cutting
  [`items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items.spec.ts)
  ALSO probes `GET /api/featured-items` BUT only the
  no-arg baseline; this per-source-file spec adds
  the **query-param surface** so a regression in
  `Number.parseInt`, the `Math.min` / `Math.max`
  clamp, the `Number.isFinite` fallback, the
  `=== 'true'` strict-equality check, the
  `getTenantId() === null` short-circuit, or the
  try / catch empty-list fallback is caught
  explicitly.
- The neighbouring admin sibling
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md)
  documents the auth-gated single-featured-item CRUD
  surface (`GET` / `PUT` / `DELETE` on
  `/api/admin/featured-items/[id]`). The two routes
  share the `featuredItems` Drizzle table but
  diverge entirely on auth posture and method
  surface — the public route is GET-only and
  read-only, the admin route is triple-method and
  mutation-bearing.
- The neighbouring admin listing sibling
  [`admin-featured-items-create-body-spec.md`](admin-featured-items-create-body-spec.md)
  documents the auth-gated featured-items creation
  surface (`POST` on `/api/admin/featured-items`).
- The neighbouring sponsor-ads sibling
  [`sponsor-ads-checkout-body-spec.md`](sponsor-ads-checkout-body-spec.md)
  documents the auth-gated multi-provider checkout
  surface that complements the public listing
  endpoints.
- The neighbouring popularity-scores sibling
  [`items-popularity-scores-query-spec.md`](items-popularity-scores-query-spec.md)
  documents the public popularity-scores debug
  endpoint that ranks items the featured-items
  route surfaces.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.

## Change protocol

Update this page in the same PR that touches:

- The source spec
  [`apps/web-e2e/tests/api/featured-items-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/featured-items-query.spec.ts)
  (any change to the `FEATURED_ITEMS_QUERIES`
  array, the `test.describe` block, or the load-
  bearing `< 500` assertion).
- The route under test
  [`apps/web/app/api/featured-items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/featured-items/route.ts)
  (any change to the `Number.parseInt` parse, the
  `Math.min(Math.max(...))` clamp, the
  `Number.isFinite` fallback, the
  `=== 'true'` strict-equality check, the
  `getTenantId()` short-circuit, the Drizzle
  `WHERE` composition, the `orderBy` ordering, the
  `{ success, data, count }` envelope, or the try /
  catch empty-list fallback).

Cross-cutting bookkeeping:

- Update `docs/log.md` with the per-source-file
  entry.
- Update `docs/index.md`'s plugins table-of-contents
  with a one-line entry pointing at this page.
- Run `pnpm tsc --noEmit` in `apps/web-e2e`.
- Run the smoke-subset Playwright invocation
  targeting `featured-items-query.spec.ts` if the
  route or the spec actually changed:
  `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "featured-items"`.
