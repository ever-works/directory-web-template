---
id: collections-exists-query-spec
title: E2E Collections Exists Query Spec (apps/web-e2e/tests/api/collections-exists-query.spec.ts)
sidebar_label: E2E Collections Exists Query Spec
sidebar_position: 621
---

# E2E Collections Exists Query Spec — `apps/web-e2e/tests/api/collections-exists-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public collections-existence probe query-param smoke
spec** paired with
[`apps/web-e2e/tests/api/collections-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/collections-exists-query.spec.ts).

This page is the dedicated per-source-file reference for
the **second member of the public-existence-probe trio**
to receive a landing page (after the previously-landed
[`categories-exists-query-spec.md`](./categories-exists-query-spec.md)
catch-and-200 Git-CMS sibling and the
[`surveys-exists-query-spec.md`](./surveys-exists-query-spec.md)
catch-and-200 DB-backed sibling). With this entry the
**three-member existence-probe trio** is now fully
documented per-source-file. The collections-exists route
is **uniquely** the **catch-and-500** member of the trio:
every thrown error inside `collectionRepository.findAll`
is caught and the route returns a `500` status with the
extra `error: 'Failed to check collections existence'`
field — distinct from both siblings whose catch branches
return `200 OK`. Distinct from every other public-route
per-source-file GET smoke the docs tree has published to
date — the route reads **zero** query parameters today
(the `_request` parameter is underscored to mark it
deliberately unused), runs above the **DB-repository**
backing store via `collectionRepository.findAll`, returns
the `{ exists, count }` envelope on the happy path AND
the `{ exists: false, count: 0, error: 'Failed to check
collections existence' }` envelope on the catch path,
and logs every catch-branch error to `console.error`
**unconditionally** (not only in development mode like
the categories-exists sibling, and not silently like the
surveys-exists sibling). The distinction is load-bearing:
the navigation shell hits all three probes on every
render to decide whether the "Collections" / "Categories"
/ "Surveys" links belong in the header, and tolerates the
`500` here by hiding the link rather than blocking the
whole page — but the additional `error` field is meant
to be visible to operators tailing the logs, not to be
exposed beyond the navigation-degradation contract.

## Why this spec is the catch-and-500 DB-repo
public-existence-probe smoke

The route under test
([`apps/web/app/api/collections/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/collections/exists/route.ts))
exports a single `GET` handler. The handler combines:

1. **No auth gate** — the route is intentionally public.
   Every caller (anon / signed-in / admin) reaches the
   same handler. The navigation shell hits it on every
   render to decide whether the "Collections" link
   belongs in the header (the same way the sibling
   `categories/exists` and `surveys/exists` probes
   decide whether the "Categories" / "Surveys" links
   belong there).
2. **Zero query-param read** — the `_request` parameter
   is underscored to mark it deliberately unused. Every
   key the caller appends is silently ignored. Distinct
   from the categories-exists sibling which reads
   `?locale=` only and from the surveys-exists sibling
   which reads `?type=` only. UNIQUE: the only
   public-existence probe that reads zero query input.
3. **Hard-coded `{ includeInactive: false }`** —
   `collectionRepository.findAll({ includeInactive:
   false })`. The repository's `includeInactive` flag
   is hard-coded; no caller-supplied
   `?includeInactive=` query param flips it. This is
   load-bearing: a future contributor who wires
   `?includeInactive=true` into the call would also
   need to flip the response envelope shape (or add a
   separate `inactiveCount` field).
4. **DB-repository-backed `collectionRepository.findAll`
   read** — distinct from the categories-exists
   sibling's Git-CMS `fetchItems` reader and from the
   surveys-exists sibling's `surveyService.getMany`
   service-layer reader. The collections-exists route
   talks directly to a DB repository (no service layer
   wrapper).
5. **Happy-path success payload** —
   `{ exists: <bool>, count: <number> }` with status
   `200`. `exists` is computed as
   `Array.isArray(collections) && collections.length > 0`;
   `count` is `collections?.length || 0`. Same shape as
   the categories-exists sibling; distinct from the
   leaner `{ exists }` shape the surveys-exists sibling
   emits.
6. **Catch-and-`500` fallback** — UNIQUE within the
   public-existence trio: every thrown error inside
   `collectionRepository.findAll` is caught and the
   route returns `{ exists: false, count: 0, error:
   'Failed to check collections existence' }` with
   status **`500`** (NOT `200`). The error message is
   intentionally generic — detailed errors are logged
   server-side only — to avoid information disclosure.
   Distinct from the catch-and-200 catch posture the
   categories-exists and surveys-exists siblings adopt.
7. **Unconditional `console.error` logging** — the
   catch branch fires `console.error('Error checking
   collections existence:', error)` on **every**
   environment. Distinct from the categories-exists
   sibling which fires only when `process.env.NODE_ENV
   === 'development'` and from the surveys-exists
   sibling which is silent on every environment.
8. **Method-resolution surface** — the route exports
   `GET` only. `POST` / `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status (Next.js returns
   `405`).
9. **Handler signature** — `GET(_request: NextRequest)`
   — the Next-specific request type with the
   underscored parameter. UNIQUE within the
   public-existence trio: the only handler whose
   parameter is underscored to mark it deliberately
   unused.

## Cross-route exists-probe matrix

| Route                               | Backend                                       | Reads query param | Catch status | Catch envelope                                                                  | Catch logging                                                |
| ----------------------------------- | --------------------------------------------- | ----------------- | ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /api/collections/exists` (this) | **DB repository** (`collectionRepository.findAll`) | **none**          | **500**      | `{ exists: false, count: 0, error: 'Failed to check collections existence' }`   | `console.error` **unconditionally**                          |
| `GET /api/categories/exists`        | Git-CMS (`fetchItems`)                        | `?locale=` only   | **200**      | `{ exists: false, count: 0 }`                                                   | `console.error` **only in development**                      |
| `GET /api/surveys/exists`           | DB service (`surveyService.getMany`)          | `?type=` only     | **200**      | `{ exists: false }`                                                             | **silent on every environment**                              |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **five hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of COLLECTIONS_EXISTS_QUERIES) test(…)`                                              | Bulk-loop walk of every plausible query-param permutation (~50 paths covering `?locale=` permutations across all eight illustrated locales (`en` / `fr` / `es` / `de` / `ar` / `zh` / `pt` / `ja`), i18n aliases (`?lang=` / combined `?locale=&lang=`), cache-busting (`?refresh=` / `?force=` / `?fresh=` / `?nocache=`), strict / validate flags, content projection (`?include=` / `?fields=` / `?select=` / `?expand=`), `?includeInactive=` repository-flag flips, content negotiation (`?format=`), status / active filters, multi-tenancy (`?tenant=` / `?tenantId=`), empty values (`?locale=` / `?lang=` / `?refresh=` / `?include=`), repeated keys (`?locale=en&locale=fr`), special-character payloads (`%25` / `%2F` / `%5C` / `%27` / `%3Cscript%3E` / `%22%3Eoops`), long values (500-char `?locale=` / `?include=`), and bogus / typo'd keys; each must round-trip to a `>= 200 && < 600` status — both branches (`200` happy + `500` catch) are part of the route's contract). |
| `test('… returns the canonical { exists, count } envelope on the happy path', …)`                     | Pins the canonical `{ exists: boolean, count: number }` envelope on the no-arg call. The status is asserted via `expect([200, 500]).toContain(...)` because both branches (happy + catch) share the `{ exists, count }` shape; the catch branch ALSO carries an extra `error: 'Failed to check collections existence'` field but the envelope assertion is shape-stable across both.                                                                                |
| `test('… responds identically with and without bogus query parameters', …)`                          | Parameterised-vs-baseline status-stability comparison — ensures the route reads **zero** query params and does NOT branch on any unknown key (`?refresh=` / `?include=` / `?format=` / `?unknown=` / `?foo=`).                                                                                                                                                                                                                                                          |
| `test('… keeps the response shape stable across param permutations', …)`                              | Three-way shape-stability walk asserting the canonical `{ exists, count }` envelope round-trips across the no-arg baseline, a `?locale=en&include=collections` combined tuple, and a `?refresh=1&format=json&unknown=value` cache-bust + content-negotiation tuple.                                                                                                                                                                                                    |
| `test('… ?locale=en and ?locale= round-trip to the same status as the no-arg case', …)`              | UNIQUE — pins the **zero-query-input contract**: the explicit-locale, empty-locale, and absent-locale cases must all return the same status because the route reads no query input. Distinct from the categories-exists fallback-semantics walk which pins the `searchParams.get('locale') \|\| 'en'` ternary; this route has NO ternary because no key is read.                                                                                                       |
| `test('… ?includeInactive=true does not flip the repository's includeInactive flag', …)`              | UNIQUE — pins that the route hard-codes `includeInactive: false` against the repository today, and a `?includeInactive=true` query param does NOT flip it. This is the only existence-probe spec in the trio with a per-flag invariance walk: a future contributor who wires the query param into the repository call would likely also flip the response envelope shape, and the byte-identical status / shape assertion catches the most obvious version of that regression. |

## What the spec asserts

1. **Bulk-loop `>= 200 && < 600` contract** — every
   query permutation (~50 total) must round-trip to a
   `>= 200 && < 600` status. Both branches (`200`
   happy + `500` catch) are part of the route's
   contract; the matrix accepts both so a regression
   that introduces a 4xx (e.g. an unintentionally-wired
   authentication gate) or a non-standard status would
   still fail loudly here.
2. **Canonical `{ exists, count }` envelope** — both
   branches share `exists: boolean` and
   `count: number`, so this assertion holds in both
   deployment modes (seeded and empty content) and
   under the catch fallback. The catch branch ALSO
   carries an extra `error: 'Failed to check
   collections existence'` field but the envelope
   shape assertion is stable across both.
3. **Status invariance across query permutations** —
   the route reads zero query params, so the response
   status must be invariant to any combination of
   unknown keys.
4. **Three-way shape-stability** — the canonical
   envelope round-trips across the no-arg baseline, a
   combined `?locale=&include=` tuple, and a
   `?refresh=&format=&unknown=` cache-bust + content-
   negotiation tuple.
5. **Zero-query-input contract** — the explicit-locale,
   empty-locale, and absent-locale cases must all
   return the same status because the route reads no
   query input. UNIQUE within the existence-probe
   trio.
6. **`?includeInactive=` invariance walk** — pins that
   the hard-coded `includeInactive: false` repository
   flag is NOT flipped by a caller-supplied
   `?includeInactive=true` query param. UNIQUE within
   the existence-probe trio.

## What this spec does NOT cover

- The exact `error` field byte equality on the catch
  branch. The route returns
  `error: 'Failed to check collections existence'` on
  every thrown error from
  `collectionRepository.findAll`, but the smoke layer
  only asserts the `{ exists, count }` shape (since
  the catch branch is environment-dependent — a stable
  deployment may never enter the catch branch at all
  during the test run).
- The `console.error` log line. The unconditional
  development-mode logging is observable in the
  server-side logs but not in the HTTP response, and
  the smoke layer does NOT introspect server logs.
- The collection-list payload itself. The
  `?include=collections` and `?expand=collections`
  permutations only check that the route does NOT
  introduce an unintended projection key today; they
  do NOT assert that the route returns the collections
  list inline. (The route returns only the canonical
  `{ exists, count }` envelope.)
- The exact `count` of active collections. The
  `findAll({ includeInactive: false })` call returns
  only active collections; the smoke layer does NOT
  assert the exact count (which would pin the spec to
  a single deployment shape and break under others).

## See also

- The catch-and-200 Git-CMS-backed sibling
  [`categories-exists-query-spec.md`](./categories-exists-query-spec.md)
  covers the **first member of the public-existence-
  probe trio** — same `{ exists, count }` envelope
  posture as this route on the happy path, but the
  catch branch returns `200` with `{ exists: false,
  count: 0 }` (NOT `500`) and conditional development-
  mode logging. Distinct from this route's catch-and-
  500 posture and unconditional logging.
- The catch-and-200 DB-service-backed sibling
  [`surveys-exists-query-spec.md`](./surveys-exists-query-spec.md)
  covers the **third member of the public-existence-
  probe trio** — DB-backed but via a service layer
  (`surveyService.getMany`) rather than a repository,
  reads `?type=` only, returns the leaner `{ exists }`
  envelope (NO `count` field), catch branch returns
  `200` with `{ exists: false }` and silent logging on
  every environment. Distinct from this route's
  catch-and-500 posture, repository-direct read, and
  unconditional logging.
- The cross-cutting [`feature-existence.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence.spec.ts)
  also probes `GET /api/collections/exists` BUT only
  the no-arg baseline; this per-source-file spec adds
  the **query-param surface** so a regression that
  introduces a `?fresh=` cache-busting wiring, a
  `?strict=` validation that throws, a
  `?include=inactive` toggle (which a future
  "show archived collections" feature might tempt a
  contributor into adding), or a per-locale 404 (which
  a hypothetical i18n-aware variant might add) is
  caught immediately as a status divergence between
  the no-arg and parameter-laden branches.
- The DB-backed admin sibling at `/api/admin/collections`
  (covered by the
  [`admin-collections-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-query.spec.ts)
  spec) serves the database-backed paginated
  collection listing.
- The collection-detail GET / PUT / DELETE sibling
  [`admin-collections-id-method-spec.md`](./admin-collections-id-method-spec.md)
  covers the per-collection detail surface at
  `/api/admin/collections/[id]`.
- The collection-create POST sibling
  [`admin-collections-create-body-spec.md`](./admin-collections-create-body-spec.md)
  covers the collection-create surface at
  `/api/admin/collections`.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
