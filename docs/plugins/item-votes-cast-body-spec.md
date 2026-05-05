---
id: item-votes-cast-body-spec
title: E2E Item Votes Cast Body Spec (apps/web-e2e/tests/api/item-votes-cast-body.spec.ts)
sidebar_label: E2E Item Votes Cast Body Spec
sidebar_position: 557
---

# E2E Item Votes Cast Body Spec — `apps/web-e2e/tests/api/item-votes-cast-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public per-item vote-casting POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/item-votes-cast-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-cast-body.spec.ts).

`POST /api/items/[slug]/votes` is the **first non-
admin per-source-file POST smoke** the docs tree
publishes that pins a **moderation-status gate**:
after the auth + body-validation + client-profile
gates, the handler runs `isUserBlocked(clientProfile.
status)` from
`apps/web/lib/db/queries/moderation.queries.ts` and
returns 403 with a **dynamic message** from
`getBlockReasonMessage(clientProfile.status)` if the
client is suspended or banned. No prior POST smoke
covers a moderation-status gate of this shape.

The companion public GET smoke is
[`item-votes-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-public.spec.ts)
which covers the GET surface (zero-vote fallback for
unknown slugs). The mutating POST and DELETE
surfaces have only generic `< 500` coverage in
`items-engagement-and-favorites.spec.ts`; this spec
drills into the POST surface specifically.

## Why this spec is the moderation-gated vote-casting POST smoke

The route under test
([`apps/web/app/api/items/[slug]/votes/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/votes/route.ts))
exports `GET`, `POST`, and `DELETE`. The POST handler
combines:

1. **`auth()` session lookup + slug param resolution**
   via `Promise.all([auth(), Promise.resolve(params.
   params)])`.
2. **`!session?.user?.id` gate** → 401 `{ success:
   false, error: 'Unauthorized' }` (canonical
   envelope with `success: false` AND short
   `'Unauthorized'` message).
3. **JSON body parse via `await request.json()`**
   AFTER the auth gate.
4. **Vote-type enum validation** — `if (!type ||
   (type !== 'up' && type !== 'down'))` → 400
   `{ success: false, error: "Invalid vote type.
   Must be 'up' or 'down'" }`.
5. **`getClientProfileByUserId(session.user.id)`
   lookup** — if not found → 404 `{ success: false,
   error: 'Client profile not found' }`.
6. **`isUserBlocked(clientProfile.status)`
   moderation-status gate** — the load-bearing
   moderation invariant. If true → 403 `{ success:
   false, error: getBlockReasonMessage
   (clientProfile.status) }` with a DYNAMIC message
   (block-reason varies by status: suspended /
   banned / etc.).
7. **Existing-votes lookup + replace** —
   `getVoteByUserIdAndItemId(clientProfile.id,
   slug)`; if any exist, calls `deleteVote(id)` to
   replace.
8. **`createVote({ userId, itemId, voteType })`** —
   load-bearing vote-creation call. `voteType`
   derived from `type === 'up' ? VoteType.UPVOTE :
   VoteType.DOWNVOTE`.
9. **`getVoteCountForItem(slug)`** — the post-write
   count read.
10. **Success payload** — `{ success: true, count,
    userVote: type }` with status 200.
11. **Outer catch** — `console.error` + 500
    `{ success: false, error: 'Internal server
    error' }`.
12. **Method-resolution surface** — the route
    exports `GET` + `POST` + `DELETE`. `PUT` /
    `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~14
bodies) and **twelve hand-written scenarios**.

| Block                                                                                       | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ITEM_VOTES_CAST_HEADERS) test(…)`                         | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of ITEM_VOTES_CAST_BODIES) test(…)`                             | Bulk-loop walk of every plausible body shape (~14 bodies covering valid up/down votes, invalid types, bypass shapes).                  |
| `test('… returns 401 with the canonical-envelope bare-message envelope', …)`                | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                               |
| `test('… envelope shape has exactly success and error keys', …)`                            | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                   | Negative-property assertion: `count`, `userVote` must NOT appear; `success` must be `false`.                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`             | Pins the gate-before-post-auth order across three candidate static messages.                                                           |
| `test('… every error message comes from the allowed list', …)`                              | Pins the static-string allow-list.                                                                                                     |
| `test('… has a stable status across header / body permutations', …)`                        | Seven body permutations vs the no-body baseline.                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                            | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH) does NOT 5xx', …)`                                | Method-resolution walk. Note: GET + POST + DELETE are exported; only PUT and PATCH are probed.                                         |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                   | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… vote-type validation is NOT entered on the unauth branch', …)`                     | Pins the gate-before-validation order.                                                                                                 |
| `test('… client-profile lookup + moderation gate are NOT entered on the unauth branch', …)` | Pins the gate-before-moderation order: 401 (NOT 403) for unauth requests.                                                              |
| `test('… createVote + getVoteCountForItem are NOT entered on the unauth branch', …)`        | Pins the gate-before-vote-write order: the unauth response must NEVER echo a `count` or `userVote`.                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~23 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `count`,
   `userVote` keys must NOT appear in any unauth
   response.
5. **Gate-before-post-auth invariant**.
6. **Static-string allow-list** for all unauth-branch
   error messages.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — only PUT and PATCH
   are probed (GET + POST + DELETE are exported).
10. **Gate-before-body-parse invariant**.
11. **Gate-before-vote-type-validation invariant**.
12. **Gate-before-moderation invariant** — unauth
    requests land on 401, NOT 403 (a regression that
    re-ordered `isUserBlocked(...)` before the auth
    gate would surface here).
13. **Gate-before-vote-write invariant**.

## See also

- The companion public GET smoke
  [`item-votes-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-public.spec.ts).
- The public count-only sibling
  `/api/items/[slug]/votes/count` covered by
  [`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts).
- The auth-gated `votes/status` GET covered by
  [`item-votes-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-query.spec.ts).
- The generic mutating-method `< 500` smoke at
  [`items-engagement-and-favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items-engagement-and-favorites.spec.ts).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
