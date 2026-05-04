---
id: item-comments-rating-query-spec
title: E2E Item Comments Rating Query Spec (apps/web-e2e/tests/api/item-comments-rating-query.spec.ts)
sidebar_label: E2E Item Comments Rating Query Spec
sidebar_position: 561
---

# E2E Item Comments Rating Query Spec — `apps/web-e2e/tests/api/item-comments-rating-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public per-item rating-aggregate GET query-param /
header smoke spec** paired with
[`apps/web-e2e/tests/api/item-comments-rating-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-rating-query.spec.ts).

`GET /api/items/[slug]/comments/rating` is the **first
per-source-file query smoke** the docs tree publishes
for a public item-detail endpoint that uses
**`checkDatabaseAvailability()` as a *graceful-fallback*
gate** (NOT as a 503-returning gate like the sibling
[`item-comments-create-body-spec.md`](item-comments-create-body-spec.md)
POST). When `process.env.DATABASE_URL` is missing OR
the tenant resolution returns null OR the Drizzle
aggregate query throws, the handler returns the SAME
success-shaped envelope `{ averageRating: 0,
totalRatings: 0 }` with status 200 — NEVER a 4xx or
5xx. This is a deliberately permissive contract: the
item-detail page reads ratings on every render, and a
503 / 500 response would cause a render-time failure
instead of a quiet zero-ratings display.

It is also the **first per-source-file query smoke**
the docs tree publishes that pins a **two-key envelope
shape** (`{ averageRating, totalRatings }`) with NO
`success` discriminant key — distinct from every
prior per-source-file query spec which uses either the
canonical `{ success: true, data: ... }` envelope OR
the bare `{ error }` envelope.

## Why this spec is the graceful-degrade rating-aggregate smoke

The route under test
([`apps/web/app/api/items/[slug]/comments/rating/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/rating/route.ts))
exports only `GET`. The handler signature is:

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
)
```

`request` is **declared** but **never read** — the
handler only awaits `params`, calls
`checkDatabaseAvailability()`,
`getItemIdFromSlug(slug)`, `getTenantId()`, and a
single Drizzle `select({ avg, count })` aggregate.
There is NO `request.url`, `request.headers`, or
`searchParams.get(...)` access anywhere in the
function body. The route is therefore invariant to
**any** query parameter the caller appends — present,
absent, empty, repeated, special-character, or long.

The handler combines:

1. **`checkDatabaseAvailability()` graceful-fallback
   gate** — returns NON-null when `DATABASE_URL` is
   missing → handler returns 200 `{ averageRating: 0,
   totalRatings: 0 }` (NOT the 503 envelope used by
   `items/[slug]/comments` POST).
2. **`params` resolve** for the `slug`.
3. **`getItemIdFromSlug(slug)`** — synchronous slug→id
   mapping.
4. **`getTenantId()` graceful-fallback** — returns null
   if the tenant header / cookie isn't present →
   handler returns 200 with the zero-rating envelope
   (NOT a 403 / 401).
5. **Drizzle `select({ avg(rating), count() })`
   aggregate** — filtered by `eq(itemId)` +
   `isNull(deletedAt)` + `eq(tenantId)`.
6. **Success payload** — `{ averageRating:
   Number(avg) || 0, totalRatings: Number(count) || 0 }`
   with status 200.
7. **Outer catch** — `console.warn` (dev-only) + 200
   `{ averageRating: 0, totalRatings: 0 }` (NOT a
   500). The route NEVER surfaces a 5xx.

In the e2e environment the slug is non-existent, so
the aggregate query returns `{ avg: null, count: 0 }`,
which collapses through `Number(null) || 0` to the
same zero-rating envelope. The unauth-branch contract
and the unknown-slug contract are therefore the SAME
envelope — a regression that introduces a 4xx / 5xx
on either branch would surface here as a status
divergence between the no-arg and parameter-laden
walks.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~57 query
permutations) and **eleven hand-written scenarios**
under a single top-level
`test.describe('API: /api/items/[slug]/comments/rating query-param surface (public, graceful-fallback)', …)`.

| Block                                                                                | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const suffix of ITEM_COMMENTS_RATING_QUERIES) test(…)`                         | Bulk-loop walk of every plausible query-param shape (~57 paths). Asserts the `< 500` no-server-error invariant for each path.          |
| `test('… returns 200 with the canonical zero-rating envelope on the unknown-slug branch', …)` | Pins the canonical envelope `{ averageRating: 0, totalRatings: 0 }` with status 200.                                                   |
| `test('… envelope shape has exactly averageRating and totalRatings keys', …)`        | Strict envelope-shape assertion — `Object.keys(body) === ['averageRating', 'totalRatings']`, no `success` / `data` / `error` keys.     |
| `test('… averageRating and totalRatings are numbers (not null / not strings)', …)`   | Pins the `Number(...)` cast invariant — a regression that bypasses the cast (returning the raw Drizzle `avg(...)` string) would surface here. |
| `test('… response is NOT a 4xx / 5xx envelope on the unknown-slug branch', …)`       | Pins the graceful-degrade contract — the response must NEVER echo an `error` key on any branch.                                        |
| `test('… round-trips to a stable status across query permutations', …)`              | Compares five different parameterised paths against the no-arg baseline status.                                                        |
| `test('… round-trips to a stable envelope shape across query permutations', …)`     | Compares the envelope shape across five different parameterised paths.                                                                  |
| `test('… does not branch on Accept header', …)`                                      | Header-isolation walk: 4 `Accept` header values.                                                                                       |
| `test('… does not branch on side-channel cookies / headers', …)`                     | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` / `Authorization` / `X-User-Id` headers. |
| `test('… cross-method probe does NOT 5xx', …)`                                       | Cross-method probe: POST / PUT / PATCH / DELETE must round-trip to `< 500` (typically 405).                                            |
| `test('… graceful-degrade catch-branch is NOT entered as a 5xx', …)`                 | Pins the catch branch's graceful-degrade behavior — a regression that re-orders the catch branch to surface a 500 envelope would surface here. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~57 paths) must round-trip to a
   `< 500` status.
2. **Canonical zero-rating envelope** — pins
   `{ averageRating: 0, totalRatings: 0 }` with status
   200.
3. **Strict envelope shape** —
   `Object.keys(body) === ['averageRating',
   'totalRatings']` (no `success`, `data`, or `error`
   keys).
4. **Number-cast invariant** — `averageRating` and
   `totalRatings` must both be of type `number`.
5. **Graceful-degrade non-disclosure** — no `error`
   key may appear on any branch; no `success` key may
   appear either.
6. **Status invariance across query permutations** —
   five parameterised paths' statuses equal the no-arg
   baseline's status.
7. **Envelope-shape invariance across query
   permutations** — five different parameterised
   paths return the same `{ averageRating: 0,
   totalRatings: 0 }` envelope.
8. **`Accept` header isolation** — four `Accept`
   header values do NOT change the baseline status.
9. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For`, `X-Real-IP`,
   `Authorization`, and `X-User-Id` headers do NOT
   change the baseline status.
10. **Cross-method `< 500`** — POST / PUT / PATCH /
    DELETE round-trip to a `< 500` status.

## See also

- [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md)
  — the sibling per-source-file POST smoke for
  `apps/web/app/api/items/[slug]/comments/route.ts`
  that uses `checkDatabaseAvailability()` as a
  **load-bearing 503-returning gate** (the OPPOSITE
  of this route's graceful-fallback gate).
- [`item-votes-status-query-spec.md`](item-votes-status-query-spec.md)
  — the sibling per-source-file GET smoke for the
  auth-gated `items/[slug]/votes/status` endpoint.
- [`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts)
  — the sibling public per-item count-only smoke
  that uses a similar zero-`request`-read pattern.
- [`item-comment-rating-by-id.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comment-rating-by-id.spec.ts)
  — the per-comment rating sibling that covers the
  `[commentId]` dynamic segment with GET + PATCH.
- [`item-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-public.spec.ts)
  — the public per-item-endpoint gauntlet that
  already pins the `< 500` no-server-error contract
  for this route as one of many; this spec drills
  into the query-param surface specifically.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 002 — Plugin Architecture](../spec/002-plugin-architecture/spec.md)
  is the architectural target for the comments /
  ratings plugin this route will eventually live
  inside.
