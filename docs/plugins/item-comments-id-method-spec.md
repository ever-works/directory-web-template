---
id: item-comments-id-method-spec
title: E2E Item Comments [commentId] Method Spec (apps/web-e2e/tests/api/item-comments-id-method.spec.ts)
sidebar_label: E2E Item Comments [commentId] Method Spec
sidebar_position: 569
---

# E2E Item Comments [commentId] Method Spec — `apps/web-e2e/tests/api/item-comments-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-comment edit / delete PUT + DELETE method /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/item-comments-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-id-method.spec.ts).

This is the **first per-source-file PUT + DELETE
smoke** the docs tree publishes for a public per-
comment edit / delete route. The companion comment-
create POST is documented at
[`item-comments-create-body-spec.md`](item-comments-create-body-spec.md);
this spec covers the per-`[commentId]` mutating
surface.

It is also the **first per-source-file PUT or DELETE
smoke** the docs tree publishes that pins a **plain-
text 401 envelope** instead of a JSON one: the unauth
branches return `new NextResponse('Unauthorized',
{ status: 401 })` — a plain-text body, NOT JSON.
EVERY prior per-source-file mutating-method smoke
pins a JSON 401 envelope; this is the FIRST plain-
text 401 contract in the rollout.

## What's distinct from the comment-create POST sibling

- **Plain-text 401 envelope** (NOT JSON like comments
  POST).
- **Plain-text 404 / 403 envelopes** for client-
  profile / tenant errors (NOT JSON like comments
  POST).
- **MIXED-envelope contract:** auth / profile /
  tenant errors return PLAIN-TEXT; body-validation
  errors (PUT only) return JSON with `{ error }`. The
  FIRST per-source-file smoke pinning a mixed plain-
  text + JSON envelope contract on the same handler.
- **Three-step ownership chain:** PUT and DELETE both
  call `checkDatabaseAvailability()` first, then
  `auth()`, then `getClientProfileByUserId(...)`,
  then `getTenantId()`, then a Drizzle query that
  filters by `userId === clientProfile.id` AND
  `tenantId === <user's tenant>` AND `deletedAt IS
  NULL` — embedding the ownership / tenant / soft-
  delete filters in a SINGLE query.
- **DELETE returns 204 No Content** (NOT 200 with a
  body) — distinct from comments POST's 200
  `{ success: true, comment: ... }`.
- **PUT body validation:** `content === undefined &&
  rating === undefined` → 400 JSON `{ error: 'At
  least one of content or rating must be provided' }`.
  The FIRST per-source-file PUT smoke pinning a
  partial-update validation contract.

## Why this spec is the plain-text-401 + mixed-envelope per-comment edit / delete smoke

The route under test
([`apps/web/app/api/items/[slug]/comments/[commentId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/[commentId]/route.ts))
exports `GET`, `PUT`, and `DELETE`. The PUT and
DELETE handlers share the same gate chain:

1. **`checkDatabaseAvailability()` gate** — load-
   bearing FIRST gate. Returns 503 with the
   DATABASE_UNAVAILABLE envelope when `DATABASE_URL`
   is missing.
2. **`auth()` session lookup** — `!session?.user?.id`
   → 401 PLAIN-TEXT `'Unauthorized'`.
3. **`getClientProfileByUserId(...)` lookup** — not
   found → 404 PLAIN-TEXT `'Client profile not
   found'`.
4. **`getTenantId()` resolution** — null → 403 PLAIN-
   TEXT `'Tenant not found'`.
5. **Drizzle ownership query** with embedded `userId`
   + `tenantId` + `deletedAt IS NULL` filters.
   Comment not found → 404 PLAIN-TEXT `'Comment not
   found or not authorized'`.
6. **(PUT only)** body parse + partial-update
   validation. Both fields missing → 400 JSON
   `{ error: 'At least one of content or rating must
   be provided' }`. Content type-check (string), non-
   empty trim, length ≤ 1000.
7. **(PUT)** `updateComment(...)` →
   `commentWithUser` JSON payload (200). **(DELETE)**
   `deleteComment(commentId)` → 204 No Content.
8. **Outer catch** — 500 PLAIN-TEXT `'Internal
   Server Error'`.
9. **Method-resolution surface** — the route exports
   `GET` + `PUT` + `DELETE`. `POST` / `PATCH` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a doubled header walk** (~10 headers ×
2 methods = ~20 tests), a **PUT body walk** (~12
bodies), and **fourteen hand-written scenarios**.

| Block                                                                                         | Purpose                                                                                                                                |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ITEM_COMMENTS_ID_HEADERS) test('PUT/DELETE …')`             | Bulk-loop walk of ~10 header shapes × 2 methods.                                                                                       |
| `for (const { data, label } of ITEM_COMMENTS_PUT_BODIES) test(…)`                             | Bulk-loop walk of ~12 PUT body shapes.                                                                                                 |
| `test('PUT … returns 401 with PLAIN-TEXT Unauthorized body', …)`                              | Pins the canonical plain-text 401 envelope on PUT.                                                                                     |
| `test('DELETE … returns 401 with PLAIN-TEXT Unauthorized body', …)`                           | Pins the canonical plain-text 401 envelope on DELETE.                                                                                  |
| `test('PUT … unauth body is NOT a JSON envelope', …)`                                         | Defensive assertion that the unauth body must NOT begin with `{` or `[`.                                                               |
| `test('DELETE … unauth body is NOT a JSON envelope', …)`                                      | Same defensive assertion for DELETE.                                                                                                   |
| `test('PUT … does NOT echo any of the post-auth messages on the unauth branch', …)`           | Pins the gate-before-post-auth order across five candidate messages (mixed plain + JSON).                                              |
| `test('DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`        | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('PUT … has a stable status across header / body permutations', …)`                      | Six body permutations vs the no-body baseline.                                                                                         |
| `test('DELETE … has a stable status across header permutations', …)`                          | Four header permutations vs the no-header baseline.                                                                                    |
| `test('Cross-method probe (POST / PATCH) on … does NOT 5xx', …)`                              | Method-resolution walk. GET + PUT + DELETE are exported.                                                                               |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                 | Pins the gate-before-body-parse order: malformed JSON still produces 401 plain-text.                                                   |
| `test('PUT … body validation chain is NOT entered on the unauth branch', …)`                  | Pins the gate-before-body-validation order: the JSON `'At least one of content or rating'` 400 must NEVER fire on unauth.              |
| `test('PUT + DELETE … ownership Drizzle query is NOT entered on the unauth branch', …)`       | Pins the gate-before-Drizzle-query order.                                                                                              |
| `test('PUT + DELETE … updateComment / deleteComment are NOT entered on the unauth branch', …)` | Pins the gate-before-write order: DELETE must NEVER return 204; PUT must NEVER return a comment payload.                               |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation across both methods must round-
   trip to a `< 500` status.
2. **Plain-text 401 envelope** `'Unauthorized'` on
   the unauth branch for BOTH methods.
3. **No-JSON-prefix invariant** for unauth bodies.
4. **Gate-before-post-auth invariant** with mixed
   plain-text / JSON message-set non-disclosure.
5. **Status invariance across body / header
   permutations**.
6. **Cross-method invariance** — POST / PATCH return
   `< 500`.
7. **Gate-before-body-parse invariant** for PUT —
   malformed JSON on the unauth branch does NOT
   downgrade to a 400 'JSON parse' error.
8. **Gate-before-body-validation invariant** for
   PUT — the JSON `'At least one of content or
   rating must be provided'` envelope must NEVER
   fire on the unauth branch.
9. **Gate-before-Drizzle-ownership-query
   invariant** for both methods — the unauth
   response must NEVER echo `'Comment not found or
   not authorized'`.
10. **Gate-before-write invariant** for both
    methods — DELETE must NEVER return 204; PUT
    must NEVER return a comment payload.

## See also

- The companion comment-create POST sibling
  [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md)
  uses JSON 401 envelopes (NOT plain-text like this
  per-comment edit / delete spec).
- The public per-item comment-list GET smoke
  [`item-comments-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-query.spec.ts)
  covers the GET sibling of the parent route.
- The per-comment rating sibling
  [`item-comment-rating-by-id.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comment-rating-by-id.spec.ts)
  covers the GET + PATCH surface of the per-comment
  rating sub-route.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
