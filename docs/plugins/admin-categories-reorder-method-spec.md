---
id: admin-categories-reorder-method-spec
title: E2E Admin Categories Reorder Method Spec (apps/web-e2e/tests/api/admin-categories-reorder-method.spec.ts)
sidebar_label: E2E Admin Categories Reorder Method Spec
sidebar_position: 512
---

# E2E Admin Categories Reorder Method Spec — `apps/web-e2e/tests/api/admin-categories-reorder-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin categories-reorder method / body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-categories-reorder-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-reorder-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md).

This is the **twelfth** per-source-file reference the
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
and
[`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md),
and the **tenth** under `tests/api/`.

## Why this spec is the first PUT-method admin-tree smoke

The route under test
([`apps/web/app/api/admin/categories/reorder/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/reorder/route.ts))
is the **first** admin-tree route the smoke layer covers
that documents the unique combination of:

1. **`PUT` handler** — the first `PUT`-only route the
   e2e suite exercises. Distinct from every other
   admin-tree smoke spec which targets `GET` / `POST` /
   `PATCH`. The handler signature accepts
   `request: NextRequest` (the body-reading variant
   distinct from the bare `PATCH()` of
   `admin/notifications/mark-all-read` which narrows
   the request surface to zero).
2. **Single-step `auth()` chain** that collapses both
   unauthenticated and authenticated-non-admin branches
   into the SAME 401 envelope — distinct from the two-
   step gates of `admin/notifications/mark-all-read`
   (which splits 401 / 403 on the `tenantId` boundary)
   and `admin/users/check-email` /
   `admin/users/check-username` (which split on the
   `isAdmin` boundary).
3. **`'Unauthorized. Admin access required.'`
   canonical longer 401 message** — the SAME message
   shape as the sibling
   `admin/twenty-crm/test-connection`,
   `admin/twenty-crm/config`, and `admin/sponsor-ads`
   routes. Distinct from the bare `'Unauthorized'`
   message of `admin/notifications/mark-all-read` and
   `admin/users/check-email` /
   `admin/users/check-username`.
4. **`success: false` envelope** on the 401 branch —
   the SAME envelope shape as the sibling
   `admin/twenty-crm/test-connection` route. Distinct
   from the bare `{ error: 'Unauthorized' }` envelope
   (no `success` key) of
   `admin/notifications/mark-all-read`.
5. **Body parse via `await request.json()`** AFTER
   the gate — distinct from the bare `PATCH()` of
   `admin/notifications/mark-all-read` and the bare
   `POST()` of `admin/twenty-crm/test-connection`,
   both of which never read the body. The gate-then-
   parse-then-validate-then-call order is the load-
   bearing invariant of this route.
6. **Three-step body validation** AFTER the gate
   AND AFTER the body parse: (a)
   `Array.isArray(categoryIds)` →
   400 `'categoryIds must be an array'`; (b)
   `categoryIds.length === 0` →
   400 `'categoryIds array cannot be empty'`; (c)
   `categoryIds.filter(id => typeof id !== 'string').length > 0`
   → 400 `'All category IDs must be strings'`. The
   unauth branch must NEVER reach any of the three
   validation steps — the response body must NOT
   contain any of the three 400 messages.
7. **`categoryRepository.reorder(categoryIds)` call**
   followed by `invalidateContentCaches()` — the
   success-branch payload shape is
   `{ success: true, message: 'Categories reordered successfully' }`.
   The unauth branch must NEVER reach the repository
   call, so the unauth response body must NOT
   contain `success: true` or
   `'Categories reordered successfully'`.
8. **`safeErrorResponse(error, 'Failed to reorder categories')`
   catch** — distinct from the
   `console.error` + `'Internal server error'`
   catch of the sibling check-email / check-username
   routes and the bare `'Failed to test connection'`
   catch of `admin/twenty-crm/test-connection`. The
   unauth branch must NEVER reach the catch, so
   the unauth response body must NOT contain the
   `'Failed to reorder categories'` message.
9. **Method-resolution surface** — the route exports
   ONLY `PUT`. Every other method (`GET` / `POST` /
   `PATCH` / `DELETE`) must round-trip to a 405
   (Method Not Allowed) deterministically.

## Cross-route gate-shape comparison

The gate-shape divergence between this route and the
sibling admin-tree smoke specs is the load-bearing
finding the smoke walk pins:

| Route                                                         | Method  | Gate steps                                                      | 401 message                                          | 401 envelope shape                          |
| ------------------------------------------------------------- | ------- | --------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/categories/reorder` (this spec's route)           | `PUT`   | Single-step `!session?.user?.isAdmin`                           | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/twenty-crm/test-connection`                       | `POST`  | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                                | `GET`   | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                                      | `GET`   | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/items/export`                                     | `GET`   | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`                      | `PATCH` | Two-step `!session?.user?.id` → `!tenantId`                     | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                                | `POST`  | Two-step `!session?.user` → `!session.user.isAdmin`             | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`                             | `POST`  | Same                                                            | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **eight hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/categories/reorder method / body / header surface', …)`:

| Block                                                                                         | Purpose                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ADMIN_CATEGORIES_REORDER_HEADERS) test(…)`                  | Bulk-loop walk of every plausible header shape (~18 headers). Asserts the `< 500` no-server-error invariant for each header set.                                        |
| `for (const { data, label } of ADMIN_CATEGORIES_REORDER_BODIES) test(…)`                      | Bulk-loop walk of every plausible body shape (~15 bodies, including the three valid-shape variants that would call `categoryRepository.reorder(...)` if reachable). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                    | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`. Distinct from the bare `'Unauthorized'` envelope of `admin/notifications/mark-all-read`. |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                     | Negative-property assertion: the unauth response body must NOT contain `'Categories reordered successfully'` or `success: true`.                                       |
| `test('… does NOT echo the body-validation 400 messages on the unauth branch', …)`            | Pins the gate-before-body-validation order: the three 400 messages (`'categoryIds must be an array'`, `'categoryIds array cannot be empty'`, `'All category IDs must be strings'`) must NEVER appear in the unauth response body. |
| `test('… does NOT echo the catch-branch 500 message on the unauth branch', …)`                | Pins the gate-before-catch order: the `'Failed to reorder categories'` message must NEVER appear in the unauth response body.                                           |
| `test('… has a stable status across header / body permutations', …)`                          | Compares seven different parameterised header / body permutations against the no-body baseline status.                                                                  |
| `test('… does NOT branch on side-channel cookies / headers', …)`                              | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                          |
| `test('… cross-method probe does NOT 5xx', …)`                                                | Method-resolution walk: GET / POST / PATCH / DELETE against the route. The route only exports `PUT`, so every other method must round-trip to `< 500`.                  |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                      | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                    |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                     | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires.                                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header / body
   permutation (~33 total) must round-trip to a `< 500`
   status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Success-branch-key non-disclosure** — the
   `'Categories reordered successfully'` message and
   `success: true` key (the success branch's
   `categoryRepository.reorder(...)` payload) must NOT
   appear in the unauth response.
4. **Gate-before-body-validation invariant** — the
   three 400 envelopes for the body-validation steps
   (`'categoryIds must be an array'`,
   `'categoryIds array cannot be empty'`,
   `'All category IDs must be strings'`) must NEVER
   appear in the unauth response body.
5. **Gate-before-catch invariant** — the
   `'Failed to reorder categories'` message must NEVER
   appear in the unauth response body.
6. **Status invariance across header / body
   permutations** — any combination of headers and
   bodies must round-trip to the same status as the
   no-body baseline.
7. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT
   5xx and do NOT bypass the gate.
8. **Cross-method invariance** — `GET` / `POST` /
   `PATCH` / `DELETE` against the route round-trip to
   a `< 500` status (typically 405 Method Not
   Allowed).
9. **Strict envelope-shape preservation** — the
   error response body has exactly two keys
   (`error`, `success`), with the values
   `'Unauthorized. Admin access required.'` and
   `false`.
10. **Gate-before-body-parse invariant** —
    malformed JSON bodies (`'not-json'`,
    `'{ broken: json'`, `'{"categoryIds": ['`)
    must NOT 400 with a JSON-parse error before
    the gate fires; every malformed body must
    round-trip to a `< 500` status.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
  [`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
  [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
  [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
  and
  [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md)
  — sibling per-spec-file references (the **first
  nine** under `tests/api/`; this spec is the
  **tenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the categories-reorder route
  sits inside.
