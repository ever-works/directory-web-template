---
id: item-votes-status-query-spec
title: E2E Item Votes Status Query Spec (apps/web-e2e/tests/api/item-votes-status-query.spec.ts)
sidebar_label: E2E Item Votes Status Query Spec
sidebar_position: 559
---

# E2E Item Votes Status Query Spec — `apps/web-e2e/tests/api/item-votes-status-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated per-item vote-status GET query-param /
header smoke spec** paired with
[`apps/web-e2e/tests/api/item-votes-status-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-status-query.spec.ts).

`GET /api/items/[slug]/votes/status` is the **first
non-admin per-source-file query smoke** the docs tree
publishes for an **auth-gated** GET that returns the
current user's vote record (or `null`) for a specific
item — distinct from the public
`/api/items/[slug]/votes` GET that
[`item-votes-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-query.spec.ts)
covers and from the public count-only sibling
[`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts)
covers.

It is also the **first per-source-file query smoke**
that pairs the **`'Authentication required'`** 401
message (matching the sibling
[`item-comments-create-body-spec.md`](item-comments-create-body-spec.md))
with the **bare `{ error }` envelope** (no
`success: false` wrapper) — distinct from the
canonical `{ success: false, error: 'Unauthorized' }`
envelope used by the sibling
[`item-votes-cast-body-spec.md`](item-votes-cast-body-spec.md).

## Why this spec is the auth-gated `votes/status` GET smoke

The route under test
([`apps/web/app/api/items/[slug]/votes/status/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/votes/status/route.ts))
exports only `GET`. The handler signature is:

```typescript
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
)
```

`request` is **declared** but **never read** — the
handler awaits `auth()` first, then `context.params`,
then calls `getClientProfileByUserId(...)` and
`getVoteByUserIdAndItemId(...)`. There is NO
`request.url`, `request.headers`, or
`searchParams.get(...)` access anywhere in the body.
The route is therefore invariant to **any** query
parameter the caller appends — present, absent,
empty, repeated, special-character, or long. A
regression that introduces a `request.url`-based
wiring (e.g. a future `?asOf=<timestamp>` filter)
would surface here as a status divergence between
the no-arg and parameter-laden branches.

The handler combines:

1. **`auth()` session lookup**.
2. **`!session?.user?.id` gate** → 401 `{ error:
   'Authentication required' }`. NOTE: the message is
   **`'Authentication required'`** (matches the
   sibling `items/[slug]/comments/route.ts` POST),
   NOT `'Unauthorized'`.
3. **`context.params` resolve** for the `slug`.
4. **`getClientProfileByUserId(session.user.id)`
   lookup** — not found → 404 `{ error: 'Client
   profile not found' }`.
5. **`getVoteByUserIdAndItemId(clientProfile.id,
   slug)`** — load-bearing data read.
6. **Success payload** — `votes[0] || null` with
   status 200. The route may return an explicit
   `null` for the no-vote case — the **only**
   docs-tree per-source-file smoke that pins a
   `null`-or-record payload contract.
7. **Outer catch** — `console.error` + 500
   `{ error: 'Failed to fetch vote status' }`.

The unauth branch is the only branch the e2e harness
can pin without a logged-in fixture, so the bulk-loop
walks pin the `< 500` envelope and the canonical-
envelope assertions pin the 401 `'Authentication
required'` shape.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~57 query
permutations) and **eleven hand-written scenarios**
under a single top-level
`test.describe('API: /api/items/[slug]/votes/status query-param surface (unauthenticated)', …)`.

| Block                                                                             | Purpose                                                                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const suffix of ITEM_VOTES_STATUS_QUERIES) test(…)`                         | Bulk-loop walk of every plausible query-param shape (~57 paths). Asserts the `< 500` no-server-error invariant for each path.          |
| `test('… returns 401 with the canonical Authentication required envelope', …)`    | Pins the canonical envelope `{ error: 'Authentication required' }` with status 401.                                                    |
| `test('… envelope shape has exactly the error key', …)`                           | Strict envelope-shape assertion — `Object.keys(body) === ['error']`, no `success` key.                                                 |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`   | Pins the gate-before-post-auth order across three candidate static messages.                                                            |
| `test('… does NOT echo a vote record on the unauth branch', …)`                   | Negative-property assertion: `id`, `userId`, `itemId`, `voteType`, `createdAt`, `updatedAt` keys must NOT appear on the unauth branch.  |
| `test('… response is NOT the literal null payload on the unauth branch', …)`     | Pins that the unauth response is NOT the success-branch `null` payload.                                                                 |
| `test('… round-trips to a stable status across query permutations', …)`           | Compares five different parameterised paths against the no-arg baseline status — the route's invariance to its query string is the load-bearing assertion. |
| `test('… does not branch on Accept header', …)`                                   | Header-isolation walk: 4 `Accept` header values.                                                                                       |
| `test('… does not branch on side-channel cookies / headers', …)`                  | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` / `Authorization` / `X-User-Id` headers. |
| `test('… cross-method probe does NOT 5xx', …)`                                    | Cross-method probe: POST / PUT / PATCH / DELETE must round-trip to `< 500` (typically 405).                                            |
| `test('… client-profile lookup is NOT entered on the unauth branch', …)`          | A regression that re-orders `getClientProfileByUserId(...)` before the auth gate would surface here.                                   |
| `test('… vote-record read is NOT entered on the unauth branch', …)`               | A regression that re-orders `getVoteByUserIdAndItemId(...)` before the auth gate would surface here.                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~57 paths) must round-trip to a
   `< 500` status. This is the loosest envelope that
   still surfaces a real regression: a 500 from
   `getClientProfileByUserId(...)` or
   `getVoteByUserIdAndItemId(...)` throwing under any
   of the parsed parameters would surface here.
2. **Canonical-envelope authentication-required 401**
   — pins `{ error: 'Authentication required' }` with
   status 401.
3. **Strict envelope shape** —
   `Object.keys(body) === ['error']` (no `success`
   key, no payload key). Distinct from the canonical
   `{ success: false, error }` envelope used by the
   sibling votes-cast POST.
4. **Gate-before-post-auth invariant** — none of the
   three post-auth static messages may appear in any
   unauth response: `'Client profile not found'`,
   `'Failed to fetch vote status'`, `'Internal server
   error'`.
5. **Vote-record non-disclosure** — no `id`,
   `userId`, `itemId`, `voteType`, `createdAt`, or
   `updatedAt` key may appear on the unauth branch.
6. **Null-payload non-disclosure** — the unauth
   response is NOT the literal `null` payload (the
   success + no-vote branch).
7. **Status invariance across query permutations** —
   five parameterised paths' statuses equal the
   no-arg baseline's status.
8. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For`, `X-Real-IP`,
   `Authorization`, and `X-User-Id` headers do NOT
   change the baseline status.
9. **Cross-method `< 500`** — POST / PUT / PATCH /
   DELETE round-trip to a `< 500` status.

## See also

- [`item-votes-cast-body-spec.md`](item-votes-cast-body-spec.md)
  — the sibling per-source-file POST smoke for
  `apps/web/app/api/items/[slug]/votes/route.ts` that
  uses the same auth-gate-then-data-read pattern but
  with the canonical `{ success: false, error:
  'Unauthorized' }` envelope.
- [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md)
  — the sibling per-source-file POST smoke for
  `apps/web/app/api/items/[slug]/comments/route.ts`
  that uses the same `'Authentication required'`
  401 message but with the
  `{ success: false, error }` envelope.
- [`item-votes-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-public.spec.ts)
  and
  [`item-votes-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-query.spec.ts)
  — the public per-item votes GET smokes.
- [`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts)
  — the public count-only sibling.
- [`payment-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-protected.spec.ts)
  — the auth-gated-endpoint gauntlet that already
  pins the `< 500` no-server-error contract for this
  route as one of many; this spec drills into the
  query-param surface specifically.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 002 — Plugin Architecture](../spec/002-plugin-architecture/spec.md)
  is the architectural target for the votes plugin
  this route will eventually live inside.
