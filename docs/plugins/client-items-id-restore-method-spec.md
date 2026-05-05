---
id: client-items-id-restore-method-spec
title: E2E Client Items [id] Restore Method Spec (apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts)
sidebar_label: E2E Client Items [id] Restore Method Spec
sidebar_position: 617
---

# E2E Client Items [id] Restore Method Spec — `apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client-scoped per-id soft-delete restore POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **`requireClientAuth()`-
gated soft-delete restore action** — a single-method
sub-route whose handler delegates to a
`clientItemRepository.restoreForUser(id, userId)` entry
point with a **THREE-branch nested catch dispatcher**
mapping repo-thrown error messages to the
`@/lib/utils/client-auth` builder helpers
(`notFoundResponse`, `forbiddenResponse`,
`badRequestResponse`).

It is the companion to the broader smoke at
[`client-item-restore.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-item-restore.spec.ts)
which stays as the single-test "did it 5xx?" canary;
this spec is the detailed per-source-file
invariant-pinning sibling.

## What's distinct from EVERY prior per-source-file POST smoke

- **`requireClientAuth()` + repository-layer
  restoreForUser delegation** — UNIQUE: the FIRST
  per-source-file POST smoke that gates a soft-delete
  *restore* action with the `requireClientAuth`
  discriminated-union helper. Every prior
  `client-items*` POST smoke covers a CRUD-style
  collection / per-id mutation or a batch-import
  service entry point.
- **5-helper-import contract** — `requireClientAuth` +
  `serverErrorResponse` + `notFoundResponse` +
  `forbiddenResponse` + `badRequestResponse` from
  `@/lib/utils/client-auth`. Same import surface as
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  but on a single-method `POST` action sub-route (vs
  the parent `[id]` route's triple-method
  `GET + PUT + DELETE` surface).
- **`itemIdParamSchema.safeParse({ id })` Zod
  validation on the dynamic-segment parameter** —
  paired with a `'Item ID is required'` 400
  fallback message.
- **THREE-branch repo-error catch dispatcher** —
  `error.message === 'Item not found'` → 404 (exact-
  string match), `error.message.includes
  ('permission')` → 403 (substring match),
  `error.message.includes('not deleted')` → 400
  (substring match), default → outer
  `serverErrorResponse(error, 'Failed to restore
  item')` 500. UNIQUE: every prior per-source-file
  smoke either pins a four-branch dispatcher
  (`client-items-id-method-spec.md` PUT) or a
  different mix of branches; this one's
  `'not deleted'` branch is the soft-delete-aware
  400 contract that no other repo throws.
- **`'Failed to restore item'`** outer-catch default
  message — UNIQUE: every prior per-source-file
  `client-items*` smoke has a different default-
  message string (`'Failed to fetch item'`,
  `'Failed to update item'`, `'Failed to delete
  item'`, `'Failed to execute import'`).
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches
  [`client-items-method-spec.md`](client-items-method-spec.md),
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md),
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md),
  and every other `requireClientAuth`-gated sibling).

## Why this spec is the first restore-action POST smoke

The route under test
([`apps/web/app/api/client/items/[id]/restore/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/%5Bid%5D/restore/route.ts))
exports ONLY `POST`. The handler combines:

1. **POST handler** — `requireClientAuth()` →
   discriminated-union check; `itemIdParamSchema
   .safeParse({ id })` Zod validation on the dynamic
   segment with `'Item ID is required'` 400
   fallback; `clientItemRepository.restoreForUser
   (id, userId)` (ownership + deleted-state checks
   live inside the repository); success returns
   `{ success: true, item, message: 'Item restored
   successfully' }`; THREE-branch nested catch.
2. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status (Next.js
   returns 405).

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~6 headers +
~6 POST bodies) and a battery of **hand-written
invariant scenarios**.

| Block                                                                                               | Purpose                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk (POST)                                                                        | ~6 headers asserting `< 500`.                                                                                                 |
| POST body bulk-loop walk                                                                            | ~6 bodies covering empty / fabricated bypass-attempt shapes (`force`, `userId`, `id`, `deleted_at`).                          |
| `test('POST … returns 401 with the longer-message TWO-key envelope', …)`                            | Pins the canonical envelope on POST.                                                                                          |
| `test('POST … 401 envelope shape has exactly success and error keys', …)`                           | Strict TWO-key envelope-shape assertion (no `item` / `message` leak).                                                         |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order across the catch-branch messages, the success message, and the 500-catch default.       |
| `test('POST … restoreForUser is NOT entered on the unauth branch', …)`                              | CRITICAL — pins that XSS markers placed in the body are NEVER echoed back AND that the load-bearing repo NEVER executes.     |
| `test('POST … Zod path-param validation is NOT entered on the unauth branch', …)`                   | Pins the gate-before-Zod-param-validation order — even with a malformed itemId, response is 401 NOT 400 'Item ID is required'. |
| `test('POST … cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                    | Method-resolution walk. POST is the ONLY exported method.                                                                     |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk on POST (Cookie / X-User-Id / Authorization).                                                               |
| `test('POST … cross-id invariance — different IDs produce IDENTICAL unauth envelope', …)`           | Pins that the auth gate fires BEFORE any per-id branch.                                                                       |
| `test('POST … cross-permutation status invariance — every body produces an IDENTICAL unauth envelope', …)` | Pins that the auth gate is THE first thing the handler does — every body permutation collapses to a byte-identical 401 envelope. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status.
2. **Canonical TWO-key envelope** `{ success: false,
   error: 'Unauthorized. Please sign in to
   continue.' }` on POST.
3. **Strict TWO-key envelope-shape preservation** —
   exactly `['error', 'success']` keys; no `item` /
   `message` leak.
4. **Gate-before-post-auth invariant** — none of the
   THREE catch-branch messages (`'Item not found'`,
   `'permission'` substring, `'not deleted'`
   substring), the success message (`'Item restored
   successfully'`), or the 500-catch default
   (`'Failed to restore item'`) leak on unauth.
5. **Gate-before-repository-call invariant**
   (CRITICAL) — XSS markers placed in the body are
   NEVER echoed back AND the load-bearing
   `clientItemRepository.restoreForUser` repository
   entry point NEVER executes on unauth.
6. **Gate-before-Zod-param-validation invariant** —
   even with a malformed itemId (empty, special
   characters, very long), response is 401 NOT 400
   `'Item ID is required'`.
7. **Cross-method invariance** — GET / PUT / PATCH /
   DELETE return `< 500` (Next.js 405).
8. **Side-channel isolation** on POST (Cookie /
   X-User-Id / Authorization).
9. **Cross-id invariance** — different itemIds
   collapse to a byte-identical 401 envelope.
10. **Cross-permutation status invariance** — every
    body permutation (no body, empty, fabricated
    `force`, fabricated `userId`, fabricated `id`,
    fabricated `deleted_at`) collapses to a byte-
    identical 401 envelope.

## See also

- The companion broader smoke
  [`client-item-restore.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-item-restore.spec.ts)
  is the single-test "did it 5xx?" canary that stays
  alongside this richer per-source-file spec.
- The companion client-items per-id sibling
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md)
  pins the `requireClientAuth` 5-helper-import
  contract on the `GET + PUT + DELETE` triple-method
  surface; this spec extends it into the single-
  method `POST /restore` action sub-route.
- The companion client-items collection sibling
  [`client-items-method-spec.md`](client-items-method-spec.md)
  pins the same gate on the COLLECTION-level
  `GET + POST` surface.
- The companion client-items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  uses the same gate on a single GET surface.
- The companion client-items-import sibling
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md)
  pins the same gate on a batch-import POST
  surface.
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
