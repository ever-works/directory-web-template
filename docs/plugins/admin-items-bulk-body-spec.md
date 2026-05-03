---
id: admin-items-bulk-body-spec
title: E2E Admin Items Bulk Body Spec (apps/web-e2e/tests/api/admin-items-bulk-body.spec.ts)
sidebar_label: E2E Admin Items Bulk Body Spec
sidebar_position: 514
---

# E2E Admin Items Bulk Body Spec — `apps/web-e2e/tests/api/admin-items-bulk-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items-bulk-action body / header / method smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-items-bulk-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-bulk-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md).

This is the **fourteenth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
[`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
[`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
[`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
[`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md),
[`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
and
[`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
and the **twelfth** under `tests/api/`.

## Why this spec is the most-validation-step admin-tree smoke

The route under test
([`apps/web/app/api/admin/items/bulk/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/bulk/route.ts))
is the **first** admin-tree route the smoke layer covers
that documents the unique combination of:

1. **`POST` handler with a static path** — distinct
   from the **immediately-preceding**
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md)'s
   dynamic-segment `[id]` route. Same static-path
   posture as the sibling `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`,
   `admin/users/check-email`, and
   `admin/users/check-username` routes.
2. **Single-step `auth()` chain** that collapses both
   unauthenticated and authenticated-non-admin branches
   into the SAME 401 envelope — the SAME gate shape as
   the sibling `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`,
   `admin/items/export`, and `admin/items/[id]/review`
   routes. Distinct from the two-step gates of
   `admin/users/check-email`,
   `admin/users/check-username`, and
   `admin/notifications/mark-all-read`.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` —
   matching the sibling `admin/categories/reorder` and
   `admin/items/[id]/review` envelope. Distinct from
   the bare `'Unauthorized'` of the two-step-gated
   routes.
4. **`success: false` envelope key on the 401 branch** —
   matching the sibling `admin/categories/reorder` and
   `admin/items/[id]/review` envelope. Distinct from
   the bare `{ error: 'Unauthorized' }` envelope (no
   `success` key) of the two-step-gated routes.
5. **Body parse via `await request.json()`** AFTER the
   gate — the gate-then-parse-then-validate-then-loop
   order is the load-bearing invariant of this route.
6. **Six-step body validation chain** AFTER the gate
   AND AFTER the body parse — the **most validation
   messages** of any admin-tree route the smoke layer
   covers. The six distinct 400 messages are:
   - (a) `"Action must be 'approve', 'reject', or 'delete'"`
     on `!action || !['approve','reject','delete'].includes(action)`.
   - (b) `'At least one item ID is required'`
     on `!Array.isArray(ids) || ids.length === 0`.
   - (c) `'Maximum 100 items per bulk action'`
     on `ids.length > 100`.
   - (d) `'All item IDs must be non-empty strings'`
     on per-id `!id || typeof id !== 'string' || id.trim().length === 0`.
   - (e) `'Duplicate item IDs are not allowed'`
     on per-id duplicate detection via a
     `Set<string>`.
   - (f) `'Rejection reason is required (minimum 10 characters)'`
     on `action === 'reject' && (!reason || reason.trim().length < 10)`.
   Distinct from the **single-step** body validation
   of `admin/items/[id]/review` (one 400 message) and
   the **three-step** body validation of
   `admin/categories/reorder` (three 400 messages).
   The unauth branch must NEVER reach any of the six
   validation steps — the response body must NOT
   contain ANY of the 400 messages.
7. **Per-id try/catch loop** — the **first** admin-
   tree route the smoke layer covers where individual
   id failures are collected into a
   `results: BulkActionResult[]` array rather than
   failing the whole request. The handler iterates
   `for (const id of ids)` and on each iteration
   catches errors via
   `safeErrorMessage(error, 'Unknown error')`, pushing
   `{ id, success: false, error: <msg> }` into the
   results array rather than throwing. The unauth
   branch must NEVER reach the loop, so the unauth
   response body must NOT contain `results` /
   `summary` keys.
8. **Conditional repository routing on `action`** —
   the per-id branch routes to one of three
   `itemRepository` calls based on the action:
   - `action === 'approve'`:
     `itemRepository.review(id, { status: 'approved' }, auditUser)`
     followed by a fire-and-forget
     `sendReviewNotification(item, 'approved')`
     side-effect.
   - `action === 'reject'`:
     `itemRepository.review(id, { status: 'rejected', review_notes: trimmedReason }, auditUser)`
     followed by a fire-and-forget
     `sendReviewNotification(item, 'rejected', trimmedReason)`
     side-effect.
   - `action === 'delete'`:
     `itemRepository.delete(id, auditUser)` with NO
     email side-effect.
   The success-branch payload shape is
   `{ success: true, message: 'Bulk <action> completed: <successful> <past-tense>, <failed> failed', results, summary }`.
   The unauth branch must NEVER reach any of the
   three repository calls.
9. **`safeErrorResponse(error, 'Failed to process bulk action')`
   catch** — matching the
   `safeErrorResponse(error, 'Failed to reorder categories')`
   catch of `admin/categories/reorder` and the
   `safeErrorResponse(error, 'Failed to review item')`
   catch of `admin/items/[id]/review`. Distinct from
   the `console.error` + `'Internal server error'`
   catch of `admin/users/check-email` /
   `admin/users/check-username`. The unauth branch
   must NEVER reach the catch, so the unauth response
   body must NOT contain the
   `'Failed to process bulk action'` message.
10. **`safeErrorMessage` + `safeErrorResponse`
    twin-import surface** — the **only** admin route
    the smoke layer covers that imports BOTH
    `safeErrorMessage` (for per-id error string
    extraction inside the loop) AND
    `safeErrorResponse` (for the catch-branch
    envelope). Every other admin-tree route imports
    only `safeErrorResponse`.
11. **Method-resolution surface** — the route exports
    ONLY `POST`. Every other method (`GET` / `PUT` /
    `PATCH` / `DELETE`) must round-trip to a `< 500`
    status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The six-step body validation chain is the load-bearing
divergence this spec pins, while the gate / envelope
shape echoes the sibling `admin/categories/reorder`
and `admin/items/[id]/review` specs:

| Route                                          | Method  | Path shape         | Gate steps                                                      | Body validation steps | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/items/bulk` (this spec's route)    | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | **Six** 400 messages  | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | Single-step `!session?.user?.isAdmin`                           | Three 400 messages    | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/test-connection`        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Body forwarded        | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                 | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                       | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/export`                      | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | Two-step `!session?.user?.id` → `!tenantId`                     | n/a (bare handler)    | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                 | `POST`  | Static             | Two-step `!session?.user` → `!session.user.isAdmin`             | One 400 message       | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`              | `POST`  | Static             | Same                                                            | One 400 message       | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/items/bulk method / body / header surface', …)`:

| Block                                                                                          | Purpose                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ADMIN_ITEMS_BULK_HEADERS) test(…)`                           | Bulk-loop walk of every plausible header shape (~18 headers). Asserts the `< 500` no-server-error invariant for each header set.                                        |
| `for (const { data, label } of ADMIN_ITEMS_BULK_BODIES) test(…)`                               | Bulk-loop walk of every plausible body shape (~32 bodies, including the four valid-action variants that would call `itemRepository.review(...)` / `.delete(...)` if reachable, plus six step-(a)–(f) probes that would 400 with one of the six messages if reachable). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                     | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                            |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                      | Negative-property assertion: the unauth response body must NOT contain `results` / `summary` keys, and must NOT contain `success: true`.                                |
| `test('… does NOT echo any of the six body-validation 400 messages on the unauth branch', …)`  | Pins the gate-before-body-validation order: ALL six 400 messages must NEVER appear in the unauth response body.                                                          |
| `test('… does NOT echo the catch-branch 500 message on the unauth branch', …)`                 | Pins the gate-before-catch order: the `'Failed to process bulk action'` message must NEVER appear in the unauth response body.                                          |
| `test('… has a stable status across header / body permutations', …)`                           | Compares eight different parameterised header / body permutations against the no-body baseline status.                                                                  |
| `test('… does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                          |
| `test('… cross-method probe does NOT 5xx', …)`                                                 | Method-resolution walk: GET / PUT / PATCH / DELETE against the route. The route only exports `POST`, so every other method must round-trip to `< 500`.                  |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                       | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                    |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                      | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires.                                                |
| `test('… is invariant to ids-array length on the unauth branch', …)`                           | Pins the gate-before-bound-check order: at-the-bound (length 100), over-the-bound (length 101), and far-over-the-bound (length 200) probes must round-trip to the same status as the no-body baseline. |
| `test('… per-id loop is NOT entered on the unauth branch', …)`                                 | Pins the gate-before-loop order: the unauth response must NOT contain `results` / `summary` keys, and `body.message` must NOT match the success-branch template.        |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header / body
   permutation (~50 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Success-branch-key non-disclosure** — the
   `results` / `summary` keys (the per-id loop
   payload) and the `success: true` key must NOT
   appear in the unauth response.
4. **Gate-before-body-validation invariant** — ALL
   six 400 envelopes
   (`"Action must be 'approve', 'reject', or 'delete'"`,
   `'At least one item ID is required'`,
   `'Maximum 100 items per bulk action'`,
   `'All item IDs must be non-empty strings'`,
   `'Duplicate item IDs are not allowed'`,
   `'Rejection reason is required (minimum 10 characters)'`)
   must NEVER appear in the unauth response body.
5. **Gate-before-catch invariant** — the
   `'Failed to process bulk action'` message must
   NEVER appear in the unauth response body.
6. **Status invariance across header / body
   permutations** — any combination of headers and
   bodies must round-trip to the same status as the
   no-body baseline.
7. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT 5xx
   and do NOT bypass the gate.
8. **Cross-method invariance** — `GET` / `PUT` /
   `PATCH` / `DELETE` against the route round-trip to
   a `< 500` status (typically 405 Method Not
   Allowed).
9. **Strict envelope-shape preservation** — the
   error response body has exactly two keys
   (`error`, `success`), with the values
   `'Unauthorized. Admin access required.'` and
   `false`.
10. **Gate-before-body-parse invariant** — malformed
    JSON bodies (`'not-json'`, `'{ broken: json'`,
    `'{"action": "approve"'`) must NOT 400 with a
    JSON-parse error before the gate fires.
11. **Gate-before-bound-check invariant** — at-the-
    bound (length 100), over-the-bound (length 101),
    and far-over-the-bound (length 200) probes all
    round-trip to the same 401 status, pinning that
    the `ids.length > 100` bound check is NOT
    evaluated on the unauth branch.
12. **Gate-before-loop invariant** — the per-id loop
    is NOT entered on the unauth branch, so the
    `results: BulkActionResult[]` array and the
    `summary: { total, successful, failed }` object
    must NEVER appear in the unauth response body,
    and the success-branch message template
    `'Bulk <action> completed: <successful> <past-tense>, <failed> failed'`
    must NEVER appear.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
  [`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
  [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
  [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
  [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md),
  [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
  and
  [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md)
  — sibling per-spec-file references (the **first eleven**
  under `tests/api/`; this spec is the **twelfth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items-bulk-action route
  sits inside.
