---
id: surveys-exists-query-spec
title: E2E Surveys Exists Query Spec (apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
sidebar_label: E2E Surveys Exists Query Spec
sidebar_position: 620
---

# E2E Surveys Exists Query Spec — `apps/web-e2e/tests/api/surveys-exists-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public surveys-existence probe query-param smoke
spec** paired with
[`apps/web-e2e/tests/api/surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts).

This page is the dedicated per-source-file reference for
the **third member of the public-existence-probe trio**
(after the previously-landed
[`categories-exists-query-spec.md`](./categories-exists-query-spec.md)
catch-and-200 Git-CMS sibling and the still-undocumented
DB-backed `collections-exists-query.spec.ts` catch-and-500
sibling) — the one public-existence probe whose handler
reads a **`?type=` query param** rather than a `?locale=`
key, and whose backend is the **DB-backed
`surveyService.getMany`** rather than the Git-CMS
`fetchItems` reader. Distinct from every other public-route
per-source-file GET smoke the docs tree has published to
date — both the categories-exists and the collections-exists
siblings live above the **Git-CMS backing store** (the
`.content/` mirror cloned from `DATA_REPOSITORY`); this
route lives above a **DB-backed survey service** that
selects published surveys from the configured database.
The surveys-exists route is the **catch-and-no-count
sibling** of the categories-exists route — same
**catch-and-200** posture (every thrown error inside
`surveyService.getMany` is caught and the route returns
`{ exists: false }` with status `200`), but the response
envelope is the **leaner `{ exists }` shape** with NO
`count` field (distinct from the
`{ exists, count }` envelope the categories-exists and
collections-exists siblings emit). The distinction is
load-bearing: the navigation shell hits all three probes
on every render to decide whether the "Surveys",
"Categories", and "Collections" links belong in the
header, and must degrade quietly when any of the three
backing stores is unavailable rather than blocking the
whole page shell.

## Why this spec is the catch-and-200 DB-backed
public-existence-probe smoke

The route under test
([`apps/web/app/api/surveys/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/exists/route.ts))
exports a single `GET` handler. The handler combines:

1. **No auth gate** — the route is intentionally public.
   Every caller (anon / signed-in / admin) reaches the
   same handler. The navigation shell hits it on every
   render to decide whether the "Surveys" link belongs
   in the header (the same way the sibling
   `categories/exists` and `collections/exists` probes
   decide whether the "Categories" / "Collections"
   links belong there).
2. **`?type=` query-param read** —
   `searchParams.get('type')`. The route reads exactly
   ONE query param; every other key the caller appends
   is silently ignored. Distinct from the
   categories-exists sibling which reads `?locale=` only
   and from the collections-exists sibling which reads
   **zero** query params (the `_request` parameter is
   underscored there to mark it deliberately unused).
3. **Strict byte-for-byte type coercion** —
   `typeParam === SurveyTypeEnum.ITEM ?
   SurveyTypeEnum.ITEM : SurveyTypeEnum.GLOBAL`. The
   ternary maps every non-`'item'` value (including
   `null` for the absent key, `''` for the empty value,
   `'global'` for the explicit value, every typo /
   unknown / case-variant) to the **same GLOBAL
   branch**. The comparison is byte-for-byte against
   `SurveyTypeEnum.ITEM` (`'item'`). Any other value —
   `'ITEM'`, `'global'`, `''`, `null`, a typo — falls
   through to `SurveyTypeEnum.GLOBAL` (`'global'`).
4. **DB-backed `surveyService.getMany({ type, status:
   PUBLISHED, limit: 1 })` read** — the load-bearing
   per-survey-type read. Reads from the database via
   the surveys repository / service layer; the route
   hard-codes the `PUBLISHED` status and the `limit: 1`
   short-circuit (the route only needs to know whether
   AT LEAST ONE published survey exists for the
   requested type — a single row is all the navigation
   shell needs to flip the link visibility).
5. **Happy-path success payload** —
   `{ exists: <bool> }` with status `200`. `exists` is
   computed as `(result.surveys?.length || 0) > 0`.
   Distinct from the categories-exists and
   collections-exists siblings: this route returns the
   **leaner `{ exists }` shape** with NO `count` field
   (since the `limit: 1` short-circuit makes the count
   uninformative anyway — the route can only ever
   distinguish between zero published surveys and one-
   or-more published surveys, never the exact count).
6. **Catch-and-empty fallback** — every thrown error
   inside `surveyService.getMany` is caught and the
   route returns `{ exists: false }` with status `200`
   (NOT `500`). This is deliberate: the navigation
   shell should degrade quietly when the survey backing
   store is unavailable rather than blocking the whole
   page. Same catch-and-200 posture as the
   categories-exists sibling; distinct from the
   collections-exists sibling which surfaces the
   fallback envelope with a `500` status.
7. **No development-mode logging** — the catch branch
   is silent on every environment. Distinct from the
   categories-exists sibling which logs to
   `console.error` in development mode and from the
   collections-exists sibling which logs
   unconditionally.
8. **Method-resolution surface** — the route exports
   `GET` only. `POST` / `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status (Next.js returns
   `405`).
9. **Handler signature** — `GET(request: NextRequest)`
   — the Next-specific request type. The handler
   constructs a `new URL(request.url)` rather than
   reaching into `request.nextUrl` (distinct from the
   categories-exists sibling which uses the
   `request?.nextUrl?.searchParams?.get(...)`
   optional-chaining triple).

## Cross-route exists-probe matrix

| Route                              | Backend                                       | Reads query param | Catch status | Catch envelope                                                                  |
| ---------------------------------- | --------------------------------------------- | ----------------- | ------------ | ------------------------------------------------------------------------------- |
| `GET /api/surveys/exists` (this)   | **DB** (`surveyService.getMany`)              | `?type=` only     | **200**      | `{ exists: false }`                                                             |
| `GET /api/categories/exists`       | Git-CMS (`fetchItems`)                        | `?locale=` only   | **200**      | `{ exists: false, count: 0 }`                                                   |
| `GET /api/collections/exists`      | DB repository (`collectionRepository.findAll`) | none              | **500**      | `{ exists: false, count: 0, error: 'Failed to check collections existence' }`   |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **five hand-written scenarios**.

| Block                                                                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of SURVEYS_EXISTS_QUERIES) test(…)`                                                 | Bulk-loop walk of every plausible query-param permutation (~50 paths covering `?type=` permutations across `item` / `global` plus case-variants (`ITEM` / `Item` / `iTeM` / `GLOBAL` / `Global`) plus unknown values (`location` / `tag` / `category` / `unknown` / `null`) plus empty / whitespace values, future filter keys (`?status=` / `?published=`), pagination keys (`?limit=`), i18n keys (`?locale=` / `?lang=`), cache-busting (`?refresh=` / `?force=` / `?fresh=` / `?nocache=`), strict / validate flags, content projection (`?include=` / `?fields=` / `?select=` / `?expand=`), content negotiation (`?format=`), multi-tenancy (`?tenant=` / `?tenantId=`), combined keys, repeated keys, special-character payloads, long values, and bogus / typo'd keys). |
| `test('… returns the canonical { exists } envelope on the happy path', …)`                          | Pins the canonical leaner `{ exists }` envelope (`typeof body.exists === 'boolean'`) on the no-arg call. Distinct from the categories-exists / collections-exists siblings whose envelope ALSO carries a `count: number` field.                                                                                                                                                                                                          |
| `test('… responds identically with and without bogus query parameters', …)`                          | Parameterised-vs-baseline status-stability comparison — ensures the route reads exactly one query param (`?type=`) and does NOT branch on any unknown key (`?refresh=` / `?include=` / `?format=` / `?unknown=` / `?foo=`).                                                                                                                                                                                                              |
| `test('… keeps the response shape stable across param permutations', …)`                             | Three-way shape-stability walk asserting the canonical `{ exists }` envelope round-trips across the no-arg baseline, a `?type=item&status=published` combined tuple, and a `?refresh=1&format=json&unknown=value` cache-bust + content-negotiation tuple.                                                                                                                                                                                |
| `test('… ?type=global, no-arg, and ?type=unknown all land in the GLOBAL branch', …)`                | UNIQUE — pins the `typeParam === SurveyTypeEnum.ITEM ? ITEM : GLOBAL` ternary fallback semantics: the no-arg, the explicit `?type=global`, the unknown `?type=unknown`, the case-variant `?type=ITEM`, and the empty `?type=` paths all land in the same GLOBAL branch and return the same status. The body's `exists` may legitimately differ if the deployment has any item-scoped surveys but no global-scoped ones, so only the status is asserted. |
| `test('… ?type=item lands in a distinct branch from the no-arg case but returns the same envelope', …)` | Pins the **shape invariance across the route's only branching dimension** — the ITEM branch (`?type=item`) and the GLOBAL branch (no-arg) land in different `surveyService.getMany` calls but both return `{ exists: boolean }` and both return `200`. Distinct from the fallback-semantics walk above which only asserts status equality across the GLOBAL-branch variants.                                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation (~50 total) must round-trip to a
   `< 500` status. Both success branches return `200`;
   no parameter-parsing path can legitimately produce a
   `5xx` today (the catch-and-empty fallback maps every
   thrown error from `surveyService.getMany` to a
   `200` with `{ exists: false }`). The matrix accepts
   `< 500` so a future regression that escapes the
   catch is caught loudly here.
2. **Canonical leaner `{ exists }` envelope** — both
   branches share `exists: boolean`, so this assertion
   holds in both deployment modes (seeded and empty
   surveys) and under the catch fallback. Distinct from
   the `{ exists, count }` envelope the categories-
   exists and collections-exists siblings emit.
3. **Status invariance across query permutations** —
   the route reads exactly one query param (`?type=`),
   so the response status must be invariant to any
   combination of other unknown keys.
4. **Three-way shape-stability** — the canonical
   envelope round-trips across the no-arg baseline, a
   combined `?type=&status=` tuple, and a
   `?refresh=&format=&unknown=` cache-bust + content-
   negotiation tuple.
5. **`typeParam === SurveyTypeEnum.ITEM` fallback
   semantics** — the no-arg case, the explicit
   `?type=global` case, the unknown `?type=unknown`
   case, the case-variant `?type=ITEM` case, and the
   empty `?type=` case all land in the same GLOBAL
   branch and return the same status.
6. **Branch-split shape invariance** — the ITEM branch
   (`?type=item`) and the GLOBAL branch (no-arg) land
   in different service calls but both return the same
   canonical `{ exists }` envelope shape and both return
   `200`.

## What this spec does NOT cover

- The body equality across the GLOBAL-branch fallback
  cases. A concurrent service revalidation could land
  between the two requests, or a deployment could
  legitimately have item-scoped surveys but no global-
  scoped ones. Only the status is asserted byte-equal
  in the fallback-semantics test.
- The 500 catch branch. The route's catch branch
  remaps every thrown error to a `200` with
  `{ exists: false }`, so there is no observable 500
  path for the smoke layer to assert. A future
  regression that escapes the catch would surface as a
  `>= 500` failure in the bulk-loop walk.
- The survey-list payload itself. The `?include=surveys`
  and `?expand=surveys` permutations only check that
  the route does NOT introduce an unintended projection
  key today; they do NOT assert that the route returns
  the surveys list inline. (The route returns only the
  canonical leaner `{ exists }` envelope.)
- The exact `count` of published surveys. The route's
  `limit: 1` short-circuit and leaner envelope mean
  the smoke layer can only distinguish between zero
  surveys and one-or-more surveys — never the exact
  count. The categories-exists and collections-exists
  siblings DO emit a `count` field, but this route
  omits it deliberately.

## See also

- The catch-and-200 Git-CMS-backed sibling
  [`categories-exists-query-spec.md`](./categories-exists-query-spec.md)
  covers the **first per-source-file GET smoke** the
  docs tree publishes that pins a fully public Git-CMS
  existence probe whose catch branch ALSO returns
  `200 OK`. Same catch-and-200 posture as this route
  but distinct query-param surface (`?locale=` vs
  `?type=`) and distinct envelope shape (`{ exists,
  count }` vs `{ exists }`).
- The catch-and-500 DB-backed sibling
  [`collections-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/collections-exists-query.spec.ts)
  covers the sibling existence probe served from
  `apps/web/app/api/collections/exists/route.ts` —
  same `{ exists, count }` envelope posture as the
  categories-exists sibling, but the catch branch
  surfaces a `500` with an extra `error: 'Failed to
  check collections existence'` field. Distinct from
  this route's catch-and-200 posture and from the
  leaner `{ exists }` envelope.
- The cross-cutting [`feature-existence.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence.spec.ts)
  also probes `GET /api/surveys/exists` BUT only the
  no-arg baseline; this per-source-file spec adds the
  **query-param surface** so a regression that introduces
  a `?status=` filter (which a future "show draft
  surveys" feature might tempt a contributor into
  adding), a `?lang=` filter, a `?refresh=` cache-bust,
  or a non-200 status on an unknown `?type=` value
  (which a future "throw on unknown survey type" change
  might add) is caught immediately as a status
  divergence between the no-arg and parameter-laden
  branches.
- The DB-backed admin sibling
  [`surveys-id-method-spec.md`](./surveys-id-method-spec.md)
  covers the survey-detail GET / PUT / DELETE surface
  for individual surveys at `/api/surveys/[surveyId]`.
- The DB-backed admin sibling
  [`surveys-id-responses-method-spec.md`](./surveys-id-responses-method-spec.md)
  covers the per-survey responses surface at
  `/api/surveys/[surveyId]/responses`.
- The DB-backed admin sibling
  [`surveys-responses-id-query-spec.md`](./surveys-responses-id-query-spec.md)
  covers the response-detail GET surface at
  `/api/surveys/responses/[responseId]`.
- The public-route per-source-file
  [`items-popularity-scores-query-spec.md`](./items-popularity-scores-query-spec.md)
  covers another no-auth-gate `?locale=`-aware route
  but with a `Math.min(parseInt(limit), 100)` admit-
  clamp instead of a navigation-shell-degradation
  contract.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 005 — Internationalisation](../spec/005-internationalisation/spec.md)
  governs the locale fallback semantics that the
  sibling categories-exists route inherits (this route
  does NOT read `?locale=` itself, but the navigation
  shell that consumes both probes does).
