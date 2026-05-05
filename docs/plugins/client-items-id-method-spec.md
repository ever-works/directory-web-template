---
id: client-items-id-method-spec
title: E2E Client Items [id] Method Spec (apps/web-e2e/tests/api/client-items-id-method.spec.ts)
sidebar_label: E2E Client Items [id] Method Spec
sidebar_position: 609
---

# E2E Client Items [id] Method Spec — `apps/web-e2e/tests/api/client-items-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client per-id item GET + PUT + DELETE dynamic-
segment / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-id-method.spec.ts).

This is the **first per-source-file triple-method
smoke** the docs tree publishes that pins **FIVE
distinct helper imports** from the
`@/lib/utils/client-auth` utility module
(`requireClientAuth`, `serverErrorResponse`,
`notFoundResponse`, `forbiddenResponse`,
`badRequestResponse`) on a single source file.
UNIQUE: every prior per-source-file smoke imports
between 1 and 3 helpers from this utility — this is
the FIRST to pin a FIVE-helper-import contract.

It also extends the
[`client-items-method-spec.md`](client-items-method-spec.md)
sibling (which pins the `requireClientAuth` helper on
the COLLECTION-level GET + POST surface) into the
PER-ID GET + PUT + DELETE dynamic-segment surface.

## What's distinct from EVERY prior triple-method smoke

- **5-helper-import contract from `@/lib/utils/client-auth`** —
  `requireClientAuth` + `serverErrorResponse` +
  `notFoundResponse` + `forbiddenResponse` +
  `badRequestResponse`. UNIQUE: every prior per-
  source-file smoke uses 1-3 helpers from this
  utility; this is the FIRST to pin a 5-helper-
  import contract from a single utility module.
- **`itemIdParamSchema.safeParse({ id })` Zod
  validation on a path param** — UNIQUE: the FIRST
  per-source-file triple-method smoke pinning Zod
  validation on a **dynamic-segment parameter** (vs
  query string, body, or both as in prior smokes).
- **GET success payload with `engagement` sub-
  object** — `{ success, item, engagement: { views,
  likes } }`. UNIQUE: the FIRST per-source-file GET
  smoke pinning a nested **engagement-metrics**
  sub-object derived from the item entity (`views ??
  0`, `likes ?? 0`).
- **PUT empty-update guard** —
  `Object.keys(updateData).length === 0` → 400
  `'No fields to update'`. UNIQUE: the FIRST per-
  source-file PUT smoke pinning a **no-op-update
  guard** that triggers AFTER successful Zod
  validation but BEFORE the repository write.
- **PUT `statusChanged` dynamic message** — the
  success message changes based on
  `result.statusChanged`:
  `'Item updated successfully'` (default) vs
  `'Item updated successfully. Since it was
  previously approved, it has been moved to pending
  for re-review.'` (when status flipped). UNIQUE:
  the FIRST per-source-file PUT smoke pinning a
  **dynamic-by-result-flag success message**.
- **PUT FOUR-branch nested catch dispatcher** —
  `error.message === 'Item not found'` → 404,
  `error.message.includes('permission')` → 403,
  `error.message.includes('deleted')` → 400,
  default → outer `serverErrorResponse`. UNIQUE: the
  FIRST per-source-file PUT smoke pinning a **four-
  branch message-substring catch dispatcher**
  layered inside an outer try/catch.
- **DELETE THREE-branch nested catch dispatcher** —
  `error.message === 'Item not found'` → 404,
  `error.message.includes('permission')` → 403,
  `error.message.includes('already deleted')` → 400.
  UNIQUE: the FIRST per-source-file DELETE smoke
  pinning a **three-branch message-substring catch
  dispatcher**.
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key envelope (matches
  [`client-items-method-spec.md`](client-items-method-spec.md)
  and
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)).
- **`notFoundResponse(message)` 404-helper +
  `forbiddenResponse(message)` 403-helper** —
  UNIQUE: the FIRST per-source-file smoke pinning
  **dedicated builder helpers** for 404 and 403
  responses (vs raw `NextResponse.json(..., {
  status: 404 })`).

## Why this spec is the first 5-helper-import smoke

The route under test
([`apps/web/app/api/client/items/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/[id]/route.ts))
exports `GET`, `PUT`, AND `DELETE`. The handlers
share the following helper-import contract from
`@/lib/utils/client-auth`:

```ts
import {
  requireClientAuth,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/utils/client-auth';
```

The handlers combine:

1. **GET handler** — `requireClientAuth()` →
   discriminated-union check;
   `itemIdParamSchema.safeParse({ id })` → 400 via
   `badRequestResponse('Item ID is required')` on
   miss; `clientItemRepository.findByIdForUser(id,
   userId)` ownership-checked load; `!item` →
   `notFoundResponse('Item not found or you do not
   have permission to view it')`; success returns
   `{ success, item, engagement: { views, likes } }`;
   outer catch → `serverErrorResponse(error,
   'Failed to fetch item')`.
2. **PUT handler** — `requireClientAuth()`; param
   Zod; `clientUpdateItemSchema.safeParse(body)` →
   400 with **issues-joined** message on failure;
   empty-update guard → 400 `'No fields to update'`;
   `clientItemRepository.updateAsClient(id, userId,
   updateData)` load-bearing DB write; success
   returns `{ success, item, statusChanged,
   previousStatus, message }` with **dynamic
   message** based on `statusChanged`; FOUR-branch
   nested catch then outer
   `serverErrorResponse(error, 'Failed to update
   item')`.
3. **DELETE handler** — `requireClientAuth()`; param
   Zod;
   `clientItemRepository.softDeleteForUser(id,
   userId)` load-bearing DB write; success returns
   `{ success, message: 'Item deleted successfully'
   }`; THREE-branch nested catch then outer
   `serverErrorResponse(error, 'Failed to delete
   item')`.
4. **Method-resolution surface** — the route exports
   `GET`, `PUT`, AND `DELETE`. `POST` / `PATCH` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **four bulk-loop walks** (~6 headers
× 3 methods + ~7 PUT bodies) and a battery of
**hand-written invariant scenarios**.

| Block                                                                              | Purpose                                                                                                               |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / PUT / DELETE)                                        | ~6 headers per method asserting `< 500`.                                                                              |
| PUT body bulk-loop walk                                                            | ~7 bodies covering minimal valid bodies, type-violation probes, bypass attempts (status / userId).                    |
| `test('GET … returns 401 with the longer-message TWO-key envelope', …)`            | Pins the canonical envelope on GET.                                                                                    |
| `test('PUT … returns 401 with the longer-message TWO-key envelope', …)`            | Pins the canonical envelope on PUT.                                                                                    |
| `test('DELETE … returns 401 with the longer-message TWO-key envelope', …)`         | Pins the canonical envelope on DELETE.                                                                                 |
| `test('GET / PUT / DELETE … have IDENTICAL 401 envelopes', …)`                     | Pins byte-identical 401 envelopes across all three methods.                                                            |
| `test('GET … 401 envelope shape has exactly success and error keys', …)`           | Strict envelope-shape assertion (no `item`, no `engagement` leak).                                                     |
| `test('PUT … does NOT echo any of the post-auth messages on the unauth branch', …)` | Pins the gate-before-post-auth order across **eight** candidate post-auth messages spanning GET / PUT / DELETE branches. |
| `test('PUT … updateAsClient is NOT entered on the unauth branch', …)`              | CRITICAL — pins that XSS markers in the PUT body are NEVER echoed back.                                                |
| `test('DELETE … softDeleteForUser is NOT entered on the unauth branch', …)`        | CRITICAL — pins that the URL itemId marker is NEVER echoed back.                                                       |
| `test('PUT … catch-branch dispatcher is NOT entered on the unauth branch', …)`     | Pins the gate-before-FOUR-branch-catch order — none of `'Item not found'` / `'permission'` / `'deleted'` leak.         |
| `test('PUT … Zod body-validation is NOT entered on the unauth branch', …)`         | Pins the gate-before-Zod-body-validation order — invalid body shapes still produce 401 NOT 400.                        |
| `test('GET … cross-method probe (POST / PATCH) does NOT 5xx', …)`                  | Method-resolution walk. GET + PUT + DELETE are exported.                                                               |
| `test('PUT … does NOT branch on side-channel cookies / headers', …)`               | Side-channel walk on PUT (Cookie / X-User-Id / Authorization).                                                         |
| `test('GET … cross-id invariance — different IDs produce IDENTICAL unauth envelope', …)` | Pins that the auth gate fires BEFORE any per-id branch. The 404-or-403 path is unreachable on unauth.            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across all three methods.
2. **Canonical TWO-key envelope** `{ success:
   false, error: 'Unauthorized. Please sign in to
   continue.' }` on GET, PUT, and DELETE.
3. **Cross-method 401-envelope equality** — GET,
   PUT, and DELETE return BYTE-IDENTICAL 401
   envelopes.
4. **Strict TWO-key envelope-shape preservation** —
   exactly `['error', 'success']` keys; no
   `item` or `engagement` leak.
5. **Gate-before-post-auth invariant** — none of
   the eight post-auth messages
   (`'Item not found'`, `'No fields to update'`,
   `'Item updated successfully'`, `'moved to
   pending for re-review'`, `'Failed to update
   item'`, `'Item deleted successfully'`,
   `'Failed to delete item'`, `'Failed to fetch
   item'`) leak on unauth.
6. **Gate-before-DB-mutation invariant** on PUT and
   DELETE (CRITICAL).
7. **Gate-before-FOUR-branch-catch invariant** on
   PUT — none of `'Item not found'` / `'permission'`
   / `'deleted'` leak.
8. **Gate-before-Zod-body-validation invariant** on
   PUT — invalid body shapes still produce 401 NOT
   400.
9. **Cross-method invariance** — POST / PATCH
   return `< 500`.
10. **Side-channel isolation** on PUT (Cookie /
    X-User-Id / Authorization).
11. **Cross-id invariance** — different IDs produce
    BYTE-IDENTICAL unauth envelopes (the auth gate
    fires BEFORE any per-id branch; the
    `notFoundResponse` / `forbiddenResponse` paths
    are unreachable on unauth).

## See also

- The companion client-items collection sibling
  [`client-items-method-spec.md`](client-items-method-spec.md)
  pins the `requireClientAuth` helper on the
  COLLECTION-level GET + POST surface; this spec
  extends it into the PER-ID dynamic-segment surface.
- The companion client-items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  uses the same `requireClientAuth()` helper on a
  single GET surface for the stats endpoint.
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- The admin per-id sibling
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)
  pins the admin-gated GET + PUT + DELETE surface
  for the same item entity (admin-scoped instead of
  client-scoped).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
