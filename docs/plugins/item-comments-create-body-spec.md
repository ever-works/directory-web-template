---
id: item-comments-create-body-spec
title: E2E Item Comments Create Body Spec (apps/web-e2e/tests/api/item-comments-create-body.spec.ts)
sidebar_label: E2E Item Comments Create Body Spec
sidebar_position: 558
---

# E2E Item Comments Create Body Spec — `apps/web-e2e/tests/api/item-comments-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public per-item comment-create POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/item-comments-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-create-body.spec.ts).

`POST /api/items/[slug]/comments` is the **first non-
admin per-source-file POST smoke** the docs tree
publishes that uses **`checkDatabaseAvailability()`**
from `apps/web/lib/utils/database-check.ts` as the
**load-bearing FIRST gate** (BEFORE `auth()`). When
`process.env.DATABASE_URL` is missing, the helper
returns a **503** `{ error: 'Database not configured',
code: 'DATABASE_UNAVAILABLE', message: 'This feature
requires database configuration' }` envelope — the
FIRST POST smoke that pins this helper-emitted
envelope shape with a 503 status.

It is also the **first** non-admin POST smoke that
uses the **`'Authentication required'`** 401 message
(distinct from the `'Unauthorized'` message used by
the sibling [`item-votes-cast-body-spec.md`](item-votes-cast-body-spec.md)).
And it is the **second non-admin POST smoke** that
pins the **`isUserBlocked(clientProfile.status)`
moderation-status gate** (the first being
`item-votes-cast-body-spec.md`).

In the e2e test environment `DATABASE_URL` IS
configured, so the db-availability gate passes
through and the auth gate fires for unauthenticated
requests, producing the 401 `'Authentication
required'` envelope.

## Why this spec is the database-availability-and-moderation-gated comment-create POST smoke

The route under test
([`apps/web/app/api/items/[slug]/comments/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`checkDatabaseAvailability()` gate** — the
   load-bearing FIRST gate. Returns 503 with the
   DATABASE_UNAVAILABLE envelope when `DATABASE_URL`
   is missing; otherwise returns null (passthrough).
2. **`auth()` session lookup**.
3. **`!session?.user` gate** → 401 `{ success:
   false, error: 'Authentication required' }`.
   NOTE: the message is **`'Authentication
   required'`**, NOT `'Unauthorized'`.
4. **JSON body parse via `await request.json()`**.
5. **Content validation** — `!content?.trim()` →
   400 `{ success: false, error: 'Content is
   required' }`.
6. **Rating range validation** — `typeof rating !==
   'number' || rating < 1 || rating > 5` → 400
   `{ success: false, error: 'Rating must be
   between 1 and 5' }`.
7. **`getClientProfileByUserId(session.user.id!)`
   lookup** — if not found → 404 `{ success: false,
   error: 'Client profile not found' }`.
8. **`isUserBlocked(clientProfile.status)`
   moderation-status gate** — if true → 403
   `{ success: false, error: getBlockReasonMessage
   (clientProfile.status) }` with a DYNAMIC message.
9. **`createComment({ content, rating, userId,
   itemId })`** — load-bearing comment-create call.
10. **`getCommentWithUserById(comment.id)` post-
    write lookup** — if null → 500 `{ success:
    false, error: 'Failed to retrieve comment' }`.
    The first POST smoke that pins a post-write
    null-check 500 envelope.
11. **Success payload** — `{ success: true,
    comment: commentWithUser }` with status 200.
12. **Outer catch** — `console.error` + 500
    `{ success: false, error: 'Failed to create
    comment' }`.
13. **Method-resolution surface** — the route
    exports `GET` + `POST`. `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~17
bodies) and **twelve hand-written scenarios**.

| Block                                                                                     | Purpose                                                                                                                                |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ITEM_COMMENTS_CREATE_HEADERS) test(…)`                  | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of ITEM_COMMENTS_CREATE_BODIES) test(…)`                      | Bulk-loop walk of every plausible body shape (~17 bodies covering required-field / content-validation / rating-range / valid bodies). |
| `test('… returns 401 with the canonical Authentication required envelope', …)`            | Pins the canonical envelope `{ success: false, error: 'Authentication required' }`.                                                    |
| `test('… envelope shape has exactly success and error keys', …)`                          | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                 | Negative-property assertion: `comment` key must NOT appear; `success` must be `false`.                                                 |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`           | Pins the gate-before-post-auth order across five candidate static messages.                                                            |
| `test('… every error message comes from the allowed list', …)`                            | Pins the static-string allow-list.                                                                                                     |
| `test('… has a stable status across header / body permutations', …)`                      | Seven body permutations vs the no-body baseline.                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                          | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                     | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                 | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… content-and-rating validation chain is NOT entered on the unauth branch', …)`    | Pins the gate-before-validation order.                                                                                                 |
| `test('… client-profile lookup + moderation gate are NOT entered on the unauth branch', …)` | Pins the gate-before-moderation order: 401 (NOT 403) for unauth requests.                                                            |
| `test('… createComment + post-write lookup are NOT entered on the unauth branch', …)`     | Pins the gate-before-comment-write order.                                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Authentication required' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `comment`
   key must NOT appear in any unauth response.
5. **Gate-before-post-auth invariant**.
6. **Static-string allow-list** for all unauth-branch
   error messages (including `'Database not
   configured'` for the 503 branch).
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is exported
   alongside GET; PUT / PATCH / DELETE must
   round-trip to `< 500`.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-content-and-rating-validation
    invariant**.
12. **Gate-before-moderation invariant** — unauth
    requests land on 401, NOT 403 (a regression that
    re-ordered `isUserBlocked(...)` before the auth
    gate would surface here).
13. **Gate-before-comment-write invariant** —
    `createComment(...)` and `getCommentWithUserById
    (...)` must NEVER run on the unauth branch.

## See also

- The companion public GET smoke
  [`comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/comments.spec.ts)
  covers the GET surface (which degrades to an empty
  array via the same `checkDatabaseAvailability()`
  helper).
- The first moderation-gated POST sibling
  [`item-votes-cast-body-spec.md`](item-votes-cast-body-spec.md)
  uses the SAME `isUserBlocked(...)` /
  `getBlockReasonMessage(...)` moderation gate but
  with the `'Unauthorized'` 401 message (NOT
  `'Authentication required'` like this route).
- The dynamic-segment per-comment routes
  [`items/[slug]/comments/[commentId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/[commentId]/route.ts)
  cover the per-comment edit and delete surface.
- The rating sub-route
  [`items/[slug]/comments/rating/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/rating/route.ts)
  covers per-comment rating updates.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
