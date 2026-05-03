---
id: admin-items-id-review-body-spec
title: E2E Admin Items [id] Review Body Spec (apps/web-e2e/tests/api/admin-items-id-review-body.spec.ts)
sidebar_label: E2E Admin Items [id] Review Body Spec
sidebar_position: 513
---

# E2E Admin Items [id] Review Body Spec — `apps/web-e2e/tests/api/admin-items-id-review-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin item-review body / header / method smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-items-id-review-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-id-review-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md).

This is the **thirteenth** per-source-file reference the
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
and
[`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
and the **eleventh** under `tests/api/`.

## Why this spec is the first dynamic-segment admin-tree smoke

The route under test
([`apps/web/app/api/admin/items/[id]/review/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/%5Bid%5D/review/route.ts))
is the **first** admin-tree route the smoke layer covers
that documents the unique combination of:

1. **`POST` handler with a dynamic `[id]` path
   parameter** — the first admin-tree dynamic-segment
   route the smoke layer pins. The handler signature
   accepts `request: NextRequest` and a
   `{ params: Promise<{ id: string }> }` second argument;
   the `params` Promise is resolved AFTER the gate AND
   AFTER the body validation. Distinct from the static
   `admin/categories/reorder`,
   `admin/users/check-email`, and
   `admin/users/check-username` routes which take no
   params, and distinct from the bare `PATCH()` of
   `admin/notifications/mark-all-read` which narrows the
   request surface to zero.
2. **Single-step `auth()` chain** that collapses both
   unauthenticated and authenticated-non-admin branches
   into the SAME 401 envelope — the SAME gate shape as
   the sibling `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`, and
   `admin/items/export` routes. Distinct from the two-
   step gates of `admin/users/check-email`,
   `admin/users/check-username`, and
   `admin/notifications/mark-all-read`.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` — matching
   the sibling `admin/categories/reorder` envelope.
   Distinct from the bare `'Unauthorized'` of the
   two-step-gated routes.
4. **`success: false` envelope key on the 401 branch** —
   matching the sibling `admin/categories/reorder`
   envelope. Distinct from the bare
   `{ error: 'Unauthorized' }` envelope (no `success`
   key) of the two-step-gated routes.
5. **Body parse via `await request.json()`** AFTER the
   gate — the gate-then-parse-then-validate-then-
   resolve-params-then-call order is the load-bearing
   invariant of this route.
6. **Single-step body validation** AFTER the gate AND
   AFTER the body parse:
   `if (!status || !['approved', 'rejected'].includes(status))`
   → 400 `"Review status must be either 'approved' or 'rejected'"`.
   Distinct from the three-step body validation of
   `admin/categories/reorder` and the one-key
   `'Email is required'` requirement of
   `admin/users/check-email`. The unauth branch must
   NEVER reach the validation step — the response body
   must NOT contain the 400 message.
7. **`itemRepository.review(id, { status, review_notes }, auditUser)`
   call** followed by a fire-and-forget
   `EmailNotificationService.sendSubmissionDecisionEmail`
   side-effect. The success-branch payload shape is
   `{ success: true, data: <item>, message: 'Item <status> successfully' }`.
   The unauth branch must NEVER reach the repository
   call, so the unauth response body must NOT contain
   `'Item approved successfully'` /
   `'Item rejected successfully'`.
8. **`safeErrorResponse(error, 'Failed to review item')`
   catch** — matching the
   `safeErrorResponse(error, 'Failed to reorder categories')`
   catch of `admin/categories/reorder`. Distinct from
   the `console.error` + `'Internal server error'`
   catch of `admin/users/check-email` /
   `admin/users/check-username`. The unauth branch
   must NEVER reach the catch, so the unauth response
   body must NOT contain the `'Failed to review item'`
   message.
9. **Method-resolution surface** — the route exports
   ONLY `POST`. Every other method (`GET` / `PUT` /
   `PATCH` / `DELETE`) must round-trip to a `< 500`
   status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The dynamic-segment surface is the load-bearing
divergence this spec pins, while the gate / envelope
shape echoes the sibling `admin/categories/reorder`
spec:

| Route                                                          | Method  | Path shape         | Gate steps                                                      | 401 message                                          | 401 envelope shape                          |
| -------------------------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/items/{id}/review` (this spec's route)             | `POST`  | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/categories/reorder`                                | `PUT`   | Static             | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/test-connection`                        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                                 | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                                       | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/items/export`                                      | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`                       | `PATCH` | Static             | Two-step `!session?.user?.id` → `!tenantId`                     | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                                 | `POST`  | Static             | Two-step `!session?.user` → `!session.user.isAdmin`             | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`                              | `POST`  | Static             | Same                                                            | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **nine hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/items/[id]/review method / body / header surface', …)`:

| Block                                                                                          | Purpose                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ADMIN_ITEMS_REVIEW_HEADERS) test(…)`                         | Bulk-loop walk of every plausible header shape (~18 headers). Asserts the `< 500` no-server-error invariant for each header set.                                        |
| `for (const { data, label } of ADMIN_ITEMS_REVIEW_BODIES) test(…)`                             | Bulk-loop walk of every plausible body shape (~19 bodies, including the four valid-status variants that would call `itemRepository.review(...)` if reachable). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                     | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                            |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                      | Negative-property assertion: the unauth response body must NOT contain `'Item approved successfully'`, `'Item rejected successfully'`, or `success: true`.              |
| `test('… does NOT echo the body-validation 400 message on the unauth branch', …)`              | Pins the gate-before-body-validation order: the 400 message `"Review status must be either 'approved' or 'rejected'"` must NEVER appear in the unauth response body.    |
| `test('… does NOT echo the catch-branch 500 message on the unauth branch', …)`                 | Pins the gate-before-catch order: the `'Failed to review item'` message must NEVER appear in the unauth response body.                                                  |
| `test('… has a stable status across header / body permutations', …)`                           | Compares seven different parameterised header / body permutations against the no-body baseline status.                                                                  |
| `test('… does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                          |
| `test('… cross-method probe does NOT 5xx', …)`                                                 | Method-resolution walk: GET / PUT / PATCH / DELETE against the route. The route only exports `POST`, so every other method must round-trip to `< 500`.                  |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                       | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                    |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                      | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires.                                                |
| `test('… dynamic [id] segment is NOT resolved on the unauth branch', …)`                       | Pins the gate-before-params-resolve order: three different `[id]` shapes (`123`, `0`, a 200-char padded id) must round-trip to the same status as the baseline UUID.    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header / body
   permutation (~37 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Success-branch-key non-disclosure** — the
   `'Item approved successfully'` /
   `'Item rejected successfully'` messages and the
   `success: true` key (the `itemRepository.review(...)`
   payload) must NOT appear in the unauth response.
4. **Gate-before-body-validation invariant** — the
   400 envelope
   `"Review status must be either 'approved' or 'rejected'"`
   must NEVER appear in the unauth response body.
5. **Gate-before-catch invariant** — the
   `'Failed to review item'` message must NEVER appear
   in the unauth response body.
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
    `'{"status": "approved"'`) must NOT 400 with a
    JSON-parse error before the gate fires.
11. **Gate-before-params-resolve invariant** — three
    different `[id]` segment shapes (the baseline
    UUID, `123`, `0`, a 200-char padded id) all
    round-trip to the same 401 status, pinning that
    the dynamic-segment Promise is NOT resolved on
    the unauth branch.

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
  and
  [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md)
  — sibling per-spec-file references (the **first ten**
  under `tests/api/`; this spec is the **eleventh**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the item-review route sits
  inside.
