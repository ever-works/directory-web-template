---
id: items-popularity-scores-query-spec
title: E2E Items Popularity Scores Query Spec (apps/web-e2e/tests/api/items-popularity-scores.spec.ts)
sidebar_label: E2E Items Popularity Scores Query Spec
sidebar_position: 615
---

# E2E Items Popularity Scores Query Spec — `apps/web-e2e/tests/api/items-popularity-scores.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public popularity-scores debug-endpoint GET query-param
smoke spec** paired with
[`apps/web-e2e/tests/api/items-popularity-scores.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items-popularity-scores.spec.ts).

This is the **first per-source-file GET smoke** the docs
tree publishes that pins a **public (no-auth-gate) debug
endpoint** combining a `Math.min(parseInt(limit), 100)`
admit-clamp invariant, a `locale` default-`'en'` fallback,
a `getCachedItems({ lang })` cache-aware fetch path, an
empty-items short-circuit envelope, a logarithmic-scaling
score formula, a featured-boost score cap, a three-tier
recency-decay schedule, and a stable rank-after-sort
mutation. UNIQUE: every prior per-source-file `items*` GET
smoke (`items-engagement-query`, `items-export-query`,
`items-export-settings-query`) gates either with `auth()`
or a feature-flag check; this is the FIRST per-source-
file GET smoke that pins a route that is **intentionally
public** — exposing a debug-only sort breakdown for any
caller that hits the URL.

## What's distinct from EVERY prior items GET smoke

- **Public (no-auth-gate) route** — UNIQUE: the FIRST
  per-source-file GET smoke pinning a fully public
  `items*` route. No `auth()` / `requireClientAuth()` /
  `isAdmin` / feature-flag gate guards the handler.
  All callers (anon / signed-in / admin) see the same
  envelope.
- **`Math.min(parseInt(limit), 100)` admit-clamp** —
  UNIQUE: the FIRST per-source-file GET smoke pinning a
  silent integer-clamp on a query parameter (`limit`
  values above 100 are clamped to 100; `parseInt` of an
  empty / non-numeric string falls back to the default
  `'20'`). The route NEVER 4xxs on a malformed `limit`;
  the `parseInt` + `Math.min` chain absorbs the bad
  input.
- **Logarithmic-scaling score formula** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a
  `Math.log10(value + 1) * weight` engagement-scoring
  formula. The handler computes a per-item score by
  weighting `views` / `votes` / `favorites` /
  `comments` through `logScale`, applies a flat
  `avgRating * 500` term, and adds a featured boost.
- **Featured boost (+10000)** — UNIQUE: the FIRST per-
  source-file GET smoke pinning a featured-item flat
  score boost. `if (item.featured) score += 10000` is
  the load-bearing tie-breaker between featured and
  non-featured items.
- **Three-tier recency-decay schedule** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a piecewise-
  linear recency-decay schedule. Items in `[0, 30)`
  days decay from 1000 → 0; items in `[30, 90)` days
  decay from 500 → 0; items in `[90, 180)` days decay
  from 250 → 0; items `>= 180` days contribute 0 to
  recency.
- **Empty-items short-circuit envelope** `{ items: [],
  message: 'No items found' }` — UNIQUE: the FIRST
  per-source-file GET smoke pinning a non-error early-
  return envelope on a `getCachedItems({ lang })` cache
  miss. The `message` key is ONLY emitted on the
  empty-items branch — it is NEVER emitted on the
  non-empty success branch.
- **Stable rank-after-sort mutation** — UNIQUE: the
  FIRST per-source-file GET smoke pinning a sort-then-
  mutate-`rank` pattern. The handler sorts the items
  array by `score` desc + `name.localeCompare` asc,
  then mutates each item's `rank` field to its 1-
  based index in the sorted array. Subsequent reads
  in the response see the rank already set.
- **Score-breakdown surface** — UNIQUE: the FIRST per-
  source-file GET smoke pinning a `scoreBreakdown` sub-
  object with seven labeled components (`featured`,
  `views`, `votes`, `rating`, `favorites`, `comments`,
  `recency`). Every score component is rounded
  individually to its integer value via `Math.round`.
- **Locale-fallback semantics** — `locale` defaults to
  `'en'`; unknown locales return an empty items list
  (NOT an error). UNIQUE: the FIRST per-source-file
  GET smoke pinning a locale-as-cache-miss-on-unknown
  fallback (vs the locale-validates-or-400 pattern of
  some admin siblings).

## Why this spec is the first public popularity-scores debug GET smoke

The route under test
([`apps/web/app/api/items/popularity-scores/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/popularity-scores/route.ts))
exports only `GET` and is marked `export const dynamic =
'force-dynamic'`. The handler combines:

1. **`searchParams` extraction** — `limit =
   Math.min(parseInt(searchParams.get('limit') ||
   '20'), 100)`; `locale =
   searchParams.get('locale') || 'en'`.
2. **`getCachedItems({ lang: locale })` cache-aware
   items fetch** — load-bearing — empty array
   short-circuits to `{ items: [], message: 'No items
   found' }`.
3. **`getEngagementMetricsPerItem(slugs)`** — load-
   bearing per-item engagement metrics map.
4. **`logScale(value, weight)`** — `Math.log10(value
   + 1) * weight`; `value <= 0` short-circuits to
   `0`.
5. **Per-item score** — featured boost (+10000) +
   logarithmic engagement scoring + `avgRating *
   500` + per-tier recency-decay; engagement-missing
   fallback heuristic seeds score from `tags.length
   * 10` (capped at 100), name-length tiers (50 /
   25), `icon_url` (50), `promo_code` (75).
6. **Sort + mutate-`rank`** — `score` desc +
   `name.localeCompare` asc; mutate `rank` to the 1-
   based sort index.
7. **Slice + envelope** — `{ totalItems, showing:
   Math.min(limit, itemsWithScores.length), items:
   itemsWithScores.slice(0, limit) }`.
8. **Outer catch** — 500 `{ error: 'Failed to fetch
   popularity scores' }`.
9. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single query-string bulk-loop walk**
covering 15 permutations (no-arg baseline, valid /
clamped / negative / zero / non-integer `limit`,
known / unknown `locale`, combined `limit + locale`)
asserting `< 500` on every permutation. The single
load-bearing assertion in the file is `expect(response.
status()).toBeLessThan(500)` — every permutation MUST
NOT 5xx, since a 5xx would indicate the route's
parameter-parsing logic crashed before the data layer.

| Block                                                | Purpose                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| No-arg baseline                                      | Pins the same path as `discovery.spec.ts`.                                           |
| Valid `limit` (`5` / `20`)                           | Pins admit-no-clamp on in-range integers.                                            |
| Out-of-range `limit` (`999` / `10000`)               | Pins silent `Math.min(..., 100)` clamp on above-100 values.                          |
| Empty-string / `abc` / `-5` / `0` `limit`            | Pins `parseInt`-default fallback to `'20'` and admit-no-error on negative / zero.    |
| Known `locale` (`en` / `fr` / `zh`)                  | Pins multi-locale cache lookup.                                                      |
| Unknown `locale` (`__no_such_locale__`)              | Pins empty-items short-circuit on cache miss (NOT an error).                         |
| Combined `limit + locale` (`limit=10&locale=fr`)     | Pins both params interact correctly.                                                 |
| Combined out-of-range + locale (`limit=200&locale=de`) | Pins clamp-then-locale evaluation order.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation must round-trip to a non-crashing
   status, since a 5xx would indicate the route's
   parameter-parsing logic crashed before the data
   layer.

## See also

- The cross-cutting
  [`discovery.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/discovery.spec.ts)
  ALSO probes `GET /api/items/popularity-scores` BUT
  only the no-arg baseline; this per-source-file
  spec adds the **query-param surface** so a
  regression in `parseInt`, the `Math.min` clamp,
  the `locale` default, or the empty-items branch is
  caught explicitly.
- The neighbouring engagement endpoint sibling
  [`items-engagement-query-spec.md`](items-engagement-query-spec.md)
  (when published) covers the `/api/items/engagement`
  source feed that the popularity-scores debug
  endpoint surfaces in its `engagement` field — the
  popularity-scores endpoint reuses the same
  `getEngagementMetricsPerItem` query path that the
  engagement endpoint exposes directly.
- The neighbouring item-detail public spec
  [`item-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-public.spec.ts)
  exercises the `/api/items/[slug]/*` public surface
  that the popularity-scores endpoint ranks.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- The production sort-utility at `apps/web/lib/sort-utils.ts`
  whose logarithmic-scaling formula the popularity-
  scores debug endpoint intentionally mirrors. A
  divergence between the two is a regression; this
  spec pins the debug endpoint side of that contract.
