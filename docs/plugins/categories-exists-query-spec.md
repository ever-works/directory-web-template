---
id: categories-exists-query-spec
title: E2E Categories Exists Query Spec (apps/web-e2e/tests/api/categories-exists-query.spec.ts)
sidebar_label: E2E Categories Exists Query Spec
sidebar_position: 619
---

# E2E Categories Exists Query Spec — `apps/web-e2e/tests/api/categories-exists-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public categories-existence probe query-param smoke
spec** paired with
[`apps/web-e2e/tests/api/categories-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/categories-exists-query.spec.ts).

This page is the dedicated per-source-file reference for
the **first per-source-file GET smoke** the docs tree
publishes that pins a **fully public Git-CMS-backed
existence probe whose catch branch ALSO returns `200 OK`**.
Distinct from every other public-route per-source-file
GET smoke the docs tree has published to date — the
companion `collections-exists-query.spec.ts` (sibling
existence probe served from
`apps/web/app/api/collections/exists/route.ts`) has a
**500-on-catch** posture; the
[`items-popularity-scores-query-spec.md`](./items-popularity-scores-query-spec.md)
sibling is gated by a `locale` default-`'en'` fallback
and a `Math.min(parseInt(limit), 100)` admit-clamp but
does not surface a navigation-shell-degradation contract.
The categories-exists route is the **catch-and-200
sibling** of the collections-exists route — same Git-CMS
content surface, same `{ exists, count }` envelope, but
the catch branch maps every thrown error to a 200 with
`{ exists: false, count: 0 }` rather than a 500. The
distinction is load-bearing: the navigation shell hits
both probes on every render and must degrade quietly
(NOT block the whole page) when the content layer is
unavailable.

## Why this spec is the catch-and-200 public-existence-probe smoke

The route under test
([`apps/web/app/api/categories/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/categories/exists/route.ts))
exports a single `GET` handler. The handler combines:

1. **No auth gate** — the route is intentionally public.
   Every caller (anon / signed-in / admin) reaches the
   same handler. The navigation shell hits it on every
   render to decide whether the "Categories" link
   belongs in the header.
2. **`?locale=` query-param read** —
   `request?.nextUrl?.searchParams?.get('locale') || 'en'`.
   Defaults to `'en'` via the `|| 'en'` shortcut. **The
   route reads exactly ONE query param**; every other
   key the caller appends is silently ignored. Distinct
   from the collections-exists sibling which reads
   **zero** query params (the `_request` parameter is
   underscored there to mark it deliberately unused).
3. **`fetchItems({ lang: locale })` Git-CMS read** —
   the load-bearing per-locale category list reader.
   Reads from the per-locale category list stored in
   the Git-based content repository (cloned from
   `DATA_REPOSITORY` into `.content/`); the category
   list is materialised at build time and cached
   in-memory per-locale via the same `getCachedItems`
   path the admin Git-CMS routes use, but exposed
   through the `fetchItems` helper for public routes.
4. **Happy-path success payload** —
   `{ exists: <bool>, count: <number> }` with status
   `200`. `exists` is computed as
   `Array.isArray(categories) && categories.length > 0`;
   `count` is `categories?.length || 0`.
5. **Catch-and-empty fallback** — UNIQUE: every thrown
   error inside `fetchItems` is caught and the route
   returns `{ exists: false, count: 0 }` with status
   `200` (NOT `500`). This is deliberate: the
   navigation shell should degrade quietly when the
   content layer is unavailable rather than blocking
   the whole page. Distinct from the collections-exists
   sibling which surfaces the same fallback envelope
   with a `500` status and an extra `error: 'Failed to
   check collections existence'` field.
6. **Conditional development-mode logging** —
   `console.error` fires inside the catch branch only
   when `process.env.NODE_ENV === 'development'`.
   Distinct from the collections-exists sibling which
   logs unconditionally.
7. **Method-resolution surface** — the route exports
   `GET` only. `POST` / `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status (Next.js returns
   `405`).
8. **Handler signature** — `GET(request: NextRequest)`
   — the Next-specific request type. The handler
   reaches into `request?.nextUrl?.searchParams?.get(...)`
   via the optional-chaining triple to keep the read
   safe under any future `request === undefined`
   refactor.

## Cross-route exists-probe matrix

| Route                              | Backend             | Reads query param | Catch status | Catch envelope                                                              |
| ---------------------------------- | ------------------- | ----------------- | ------------ | --------------------------------------------------------------------------- |
| `GET /api/categories/exists` (this) | **Git-CMS** (`fetchItems`) | `?locale=` only | **200**      | `{ exists: false, count: 0 }`                                               |
| `GET /api/collections/exists`      | DB repository (`collectionRepository.findAll`) | none            | **500**      | `{ exists: false, count: 0, error: 'Failed to check collections existence' }` |
| `GET /api/surveys/exists`          | DB repository       | (varies)          | (varies)     | (varies)                                                                    |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **four hand-written scenarios**.

| Block                                                                                           | Purpose                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of CATEGORIES_EXISTS_QUERIES) test(…)`                                         | Bulk-loop walk of every plausible query-param permutation (~50 paths covering `?locale=` plus i18n aliases, cache-busting, strict / validate flags, content projection, content negotiation, status / active filters, multi-tenancy, empty values, repeated keys, special-character payloads, long values, and bogus / typo'd keys). |
| `test('… returns the canonical { exists, count } envelope on the happy path', …)`              | Pins the canonical `{ exists, count }` envelope (`typeof body.exists === 'boolean'`, `typeof body.count === 'number'`) on the no-arg call.                                                                                                                                                                                                          |
| `test('… responds identically with and without bogus query parameters', …)`                    | Parameterised-vs-baseline status-stability comparison — ensures the route reads exactly one query param (`?locale=`) and does NOT branch on any unknown key.                                                                                                                                                                                        |
| `test('… keeps the response shape stable across param permutations', …)`                       | Three-way shape-stability walk asserting the canonical `{ exists, count }` envelope round-trips across the no-arg baseline, a `?locale=en&include=categories` combined tuple, and a `?refresh=1&format=json&unknown=value` cache-bust + content-negotiation tuple.                                                                                  |
| `test('… ?locale=en and ?locale= round-trip to the same status as the no-arg case', …)`        | UNIQUE — pins the `searchParams.get('locale') || 'en'` fallback semantics: the no-arg, the empty-string, and the explicit-`'en'` paths must all land in the same branch and return the same status. The body's `count` may legitimately differ if the deployment has any non-default-locale-only categories, so only the status is asserted. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation (~50 total) must round-trip to a
   `< 500` status. Both success branches return `200`;
   no parameter-parsing path can legitimately produce a
   `5xx` today (the catch-and-empty fallback maps every
   thrown error from `fetchItems` to a `200` with
   `{ exists: false, count: 0 }`). The matrix accepts
   `< 500` so a future regression that escapes the
   catch is caught loudly here.
2. **Canonical `{ exists, count }` envelope** — both
   branches share `exists: boolean` and
   `count: number`, so this assertion holds in both
   deployment modes (seeded and empty content) and
   under the catch fallback.
3. **Status invariance across query permutations** —
   the route reads exactly one query param (`?locale=`),
   so the response status must be invariant to any
   combination of other unknown keys.
4. **Three-way shape-stability** — the canonical
   envelope round-trips across the no-arg baseline, a
   combined `?locale=&include=` tuple, and a
   `?refresh=&format=&unknown=` cache-bust + content-
   negotiation tuple.
5. **`searchParams.get('locale') || 'en'` fallback
   semantics** — the no-arg case, the empty-string
   `?locale=` case, and the explicit-`?locale=en` case
   all land in the same branch and return the same
   status.

## What this spec does NOT cover

- The body equality across the three `?locale=`
  fallback cases. A concurrent content-layer
  revalidation could land between the two requests, or
  a non-default-locale-only category could
  legitimately surface in the `?locale=fr` path but not
  the `?locale=en` path. Only the status is asserted
  byte-equal in the fallback-semantics test.
- The 500 catch branch. The route's catch branch
  remaps every thrown error to a `200` with
  `{ exists: false, count: 0 }`, so there is no
  observable 500 path for the smoke layer to assert.
  A future regression that escapes the catch would
  surface as a `>= 500` failure in the bulk-loop walk.
- The category-list payload itself. The
  `?include=categories` and `?expand=categories`
  permutations only check that the route does NOT
  introduce an unintended projection key today; they
  do NOT assert that the route returns the categories
  list inline. (The route returns only the canonical
  `{ exists, count }` envelope.)

## See also

- The DB-backed sibling
  [`collections-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/collections-exists-query.spec.ts)
  covers the **catch-and-500** sibling existence probe
  served from `apps/web/app/api/collections/exists/route.ts`
  — same `{ exists, count }` envelope, but the catch
  branch returns a `500` with an extra
  `error: 'Failed to check collections existence'`
  field. Distinct from this route's catch-and-200
  posture.
- The DB-backed sibling
  [`surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
  covers the surveys existence probe served from
  `apps/web/app/api/surveys/exists/route.ts`.
- The Git-CMS-backed admin sibling
  [`admin-categories-all-query-spec.md`](./admin-categories-all-query-spec.md)
  covers the admin-tree categories listing route at
  `/api/admin/categories/all` — same `getCachedItems`
  Git-CMS reader (under the hood, via `fetchItems`)
  but gated behind an admin-only `auth()` +
  `!isAdmin` -> 401 envelope. Distinct from this
  route's no-auth-gate posture.
- The DB-backed admin sibling at
  `/api/admin/categories` (covered by
  [`admin-categories-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-query.spec.ts))
  serves the database-backed paginated category
  listing.
- The public-route per-source-file
  [`items-popularity-scores-query-spec.md`](./items-popularity-scores-query-spec.md)
  covers another no-auth-gate `?locale=`-aware route
  but with a `Math.min(parseInt(limit), 100)` admit-
  clamp instead of a navigation-shell-degradation
  contract.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 005 — Internationalisation](../spec/005-internationalisation/spec.md)
  governs the `?locale=` fallback semantics this
  route inherits.
