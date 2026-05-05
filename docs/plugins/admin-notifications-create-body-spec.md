---
id: admin-notifications-create-body-spec
title: E2E Admin Notifications Create Body Spec (apps/web-e2e/tests/api/admin-notifications-create-body.spec.ts)
sidebar_label: E2E Admin Notifications Create Body Spec
sidebar_position: 545
---

# E2E Admin Notifications Create Body Spec — `apps/web-e2e/tests/api/admin-notifications-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**non-admin-gated collection-level notification-create
POST body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-notifications-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-create-body.spec.ts).

This spec documents the **sixth Q-010b-style auth-gate-
divergence finding** in the admin-tree smoke layer — the
route's `POST` handler **does NOT call `!isAdmin` at any
point**. It DOES require an authenticated user
(`!session?.user?.id` → 401), so the route is tenant-
scoped to authenticated users but is effectively non-
admin-restricted.

## Why this spec is the tenant-only-gated POST smoke

The route under test
([`apps/web/app/api/admin/notifications/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/notifications/route.ts))
exports `GET` and `POST`. Neither handler checks
`!isAdmin`. The POST handler combines:

1. **Two-step gate** —
   - (a) `!session?.user?.id` → 401
     `{ success: false, error: 'Unauthorized' }`.
   - (b) `!tenantId` (after `getTenantId()` AFTER body
     parse + required-fields check) → 403
     `{ success: false, error: 'Tenant not found' }`.
   NOTE: distinct from prior two-step gates which run
   `getTenantId()` BEFORE body parse — this route's
   tenant resolution is INTERLEAVED with body
   validation.
2. **Hybrid bare-`Unauthorized` + `success: false`
   envelope** — matching `admin/users/[id]`,
   `admin/featured-items/[id]`, `admin/roles/[id]/
   permissions`.
3. **Four-field required check** — `if (!type ||
   !title || !message || !userId)` → 400 `'Missing
   required fields'`. Distinct from prior multi-field
   required checks — this one fires BEFORE tenant
   resolution.
4. **`getTenantId()` AFTER required-fields check** —
   the first collection-level POST smoke that runs the
   tenant-resolution check AFTER body validation.
5. **Inline Drizzle insert** with `notifications`
   schema + JSON-stringified `data` field — distinct
   from prior POST smokes which delegate to a
   repository class.
6. **Success payload** with **`notification` success-
   key** (NOT `data`) — `{ success: true,
   notification: <newNotification[0]> }`. Status 200
   (NOT 201). Distinct from prior collection-level POST
   smokes.
7. **`console.error` + 500 `'Internal server error'`
   catch** — distinct from `admin/items` POST and
   `admin/items/[id]` route which use
   `safeErrorResponse(...)`.
8. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Q-010b auth-gate-divergence findings to date (extended)

| Route                                          | Method      | Q-010b finding                                                                                                |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/roles`                         | `GET`       | No `auth()` call. Covered by `admin-roles-query.spec.ts`.                                                      |
| `POST /api/admin/roles`                        | `POST`      | No `auth()` call. Covered by [`admin-roles-create-body-spec.md`](admin-roles-create-body-spec.md).             |
| `GET /api/admin/roles/active`                  | `GET`       | No `auth()` call. Covered by `admin-roles-active-query.spec.ts`.                                              |
| `admin/featured-items/[id]` all methods        | `GET/PUT/DELETE` | Two-step `!session?.user?.id` → `!tenantId` gate. Covered by [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md). |
| **`POST /api/admin/notifications` (this spec)**| `POST`      | **`!session?.user?.id` only (no admin check). Tenant resolution INTERLEAVED with body validation.**            |
| Various `admin-by-id.spec.ts` routes           | Multiple    | Coverage of similar tenant-only-gated routes.                                                                  |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~16 headers + ~13
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_NOTIFICATIONS_CREATE_HEADERS) test(…)`                     | Bulk-loop walk of every plausible header shape (~16 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_NOTIFICATIONS_CREATE_BODIES) test(…)`                         | Bulk-loop walk of every plausible body shape (~13 bodies covering missing-field probes, valid bodies with optional `data` field, plus bypass shapes).                |
| `test('… returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope.                                                                                                                                        |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… unauth branch lands on 401 (NOT 403)', …)`                                                | Pins the FIRST gate step fires (the response is 401 not 403, and must NEVER echo `'Tenant not found'`).                                                              |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `notification`, `data`, `success: true` must NOT appear.                                                                                |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate static messages.                                                                                          |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-fields check is NOT entered on the unauth branch', …)`                           | Pins the gate-before-required-field-check order.                                                                                                                    |
| `test('… tenant-resolution check is NOT entered on the unauth branch', …)`                         | Pins the gate-before-tenant-resolution order: the unauth response must NEVER echo `'Tenant not found'`.                                                              |
| `test('… Drizzle insert is NOT entered on the unauth branch', …)`                                  | Pins the gate-before-Drizzle-insert order: the unauth response must NEVER echo a `notification` key from the inserted row.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~29 total) must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** —
   exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Unauth-lands-on-401-not-403 invariant**.
5. **Success-branch-key non-disclosure** —
   `notification`, `data`, `success: true` keys must
   NOT appear in any unauth response.
6. **Gate-before-post-auth invariant** — none of the
   three static post-auth messages must appear in any
   unauth response.
7. **Status invariance across header / body
   permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance**.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-required-field-check invariant**.
12. **Gate-before-tenant-resolution invariant** —
    the unauth response must NEVER echo `'Tenant not
    found'`.
13. **Gate-before-Drizzle-insert invariant** — the
    unauth response must NEVER echo a `notification`
    key from the inserted row.

## See also

- The companion query-surface spec
  [`admin-notifications-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[id]` PATCH
  [`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md)
  spec covering the same hybrid envelope on the
  single-notification mark-as-read route, the static-
  path PATCH
  [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md)
  spec, and the other Q-010b findings
  [`admin-roles-create-body-spec.md`](admin-roles-create-body-spec.md)
  (no auth at all) and
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md)
  (also tenant-only-gated, but on a leaf-`[id]` route).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the notifications collection
  route sits inside.
- [`docs/questions.md`](../questions.md) — the Q-010b
  auth-gate-divergence finding (this route is the
  sixth admin route the smoke layer documents as
  effectively non-admin-restricted today).
