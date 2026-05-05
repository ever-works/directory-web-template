---
id: admin-notifications-mark-all-read-method-spec
title: E2E Admin Notifications Mark-All-Read Method Spec (apps/web-e2e/tests/api/admin-notifications-mark-all-read-method.spec.ts)
sidebar_label: E2E Admin Notifications Mark-All-Read Method Spec
sidebar_position: 511
---

# E2E Admin Notifications Mark-All-Read Method Spec — `apps/web-e2e/tests/api/admin-notifications-mark-all-read-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin mark-all-notifications-read method / body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-notifications-mark-all-read-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-mark-all-read-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body and query smoke specs and the
**immediately-preceding**
[`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md).

This is the **eleventh** per-source-file reference the
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
and
[`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
and the **ninth** under `tests/api/`.

## Why this spec is the first PATCH-method admin-tree smoke

The route under test
([`apps/web/app/api/admin/notifications/mark-all-read/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/notifications/mark-all-read/route.ts))
is the **first** admin-tree route the smoke layer covers
that documents the unique combination of:

1. **`PATCH` handler** — the first `PATCH`-only route the
   e2e suite exercises. Distinct from every other admin-
   tree smoke spec which targets `GET` / `POST`.
2. **Bare `PATCH()` handler signature** (no `request`
   parameter) — narrowing the request surface to zero.
   There is no way for a future contributor to read a
   body parameter, header, or query string inside the
   handler without changing the signature. A regression
   that adds `request` parameter and starts reading the
   body would surface as a status divergence from the
   no-body baseline.
3. **Two-step `auth()` chain that splits 401 vs 403 on
   the `tenantId` boundary** — distinct from the sibling
   `admin/users/check-email` and `admin/users/check-username`
   routes' two-step gates that split 401 (no session) vs
   403 (no `isAdmin`). This route's first step checks
   `!session?.user?.id` (returning 401 `'Unauthorized'`)
   and the second step checks `!tenantId` (returning 403
   `'Tenant not found'`).
4. **`'Tenant not found'` 403 envelope** — distinct from
   the sibling routes' bare `'Forbidden'` message. The
   route-specific message is the production-source
   convention for endpoints that require multi-tenancy
   context.
5. **Direct Drizzle DB call without a repository
   abstraction** — the handler imports `db` /
   `notifications` from `@/lib/db/drizzle` and
   `@/lib/db/schema` directly and runs an inline
   `db.update(notifications).set({…}).where(and(…)).returning()`
   Drizzle pipeline. Distinct from the sibling
   `admin/users/check-email` route's
   `userRepository.emailExists(...)` repository
   abstraction.
6. **Per-tenant scope on the success branch** — the
   `where(and(eq(notifications.userId, session.user.id),
   eq(notifications.isRead, false),
   eq(notifications.tenantId, tenantId)))` clause scopes
   the update to (a) the authenticated user's
   notifications only, (b) the unread subset, and (c)
   the user's tenant only.
7. **Method-resolution surface** — the route exports
   ONLY `PATCH`. Every other method (`GET` / `POST` /
   `PUT` / `DELETE`) must round-trip to a 405 (Method
   Not Allowed) deterministically.

## Cross-route gate-shape comparison

The gate-shape divergence between this route and the
sibling check-email / check-username routes is the load-
bearing finding the smoke walk pins:

| Route                                                         | Gate step 1                              | Gate step 2                                       | 401 message    | 403 message                |
| ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- | -------------- | -------------------------- |
| `/api/admin/notifications/mark-all-read` (this spec's route)  | `!session?.user?.id` → 401 'Unauthorized' | `!tenantId` → 403 **'Tenant not found'**         | `'Unauthorized'` (bare) | **'Tenant not found'** (route-specific) |
| `/api/admin/users/check-email`                                | `!session?.user` → 401 'Unauthorized'    | `!session.user.isAdmin` → 403 'Forbidden'        | Same           | `'Forbidden'` (bare)       |
| `/api/admin/users/check-username`                             | Same                                     | Same                                              | Same           | Same                       |
| `/api/admin/twenty-crm/test-connection`                       | Single-step `!session?.user?.isAdmin` → 401 | (collapses into 401)                          | `'Unauthorized. Admin access required.'` (canonical longer message) | (no 403 branch) |
| `/api/admin/items/export`                                     | Same single-step                          | Same                                              | Same           | Same                       |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **eight hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/notifications/mark-all-read method / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ADMIN_NOTIFICATIONS_MARK_ALL_READ_HEADERS) test(…)`              | Bulk-loop walk of every plausible header shape (~18 headers). Asserts the `< 500` no-server-error invariant for each header set.                                        |
| `for (const { data, label } of ADMIN_NOTIFICATIONS_MARK_ALL_READ_BODIES) test(…)`                  | Bulk-loop walk of every plausible body shape (~8 bodies). Asserts the `< 500` no-server-error invariant for each body — proves the bare `PATCH()` signature discards bodies. |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                     | Pins the bare 401 envelope: `{ error: 'Unauthorized' }`. Identical to the sibling check-email / check-username routes' 401 envelope.                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: the unauth response body must NOT contain `success: true` / `updatedCount` keys.                                                          |
| `test('… does NOT echo "Tenant not found" on the unauth branch', …)`                               | Pins the gate-step ordering: the 403 `'Tenant not found'` envelope is reached only when an authenticated session is present but lacks the `tenantId` claim.            |
| `test('… has a stable status across header / body permutations', …)`                               | Compares seven different parameterised header / body permutations against the no-body baseline status.                                                                  |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                          |
| `test('… cross-method probe does NOT 5xx', …)`                                                     | Method-resolution walk: GET / POST / PUT / DELETE against the route. The route only exports `PATCH`, so every other method must round-trip to `< 500`.                  |
| `test('… Unauthorized error envelope does NOT echo the success-branch shape', …)`                  | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error']` and no `success` / `updatedCount` keys.                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header / body
   permutation (~26 total) must round-trip to a `< 500`
   status.
2. **Bare 401 envelope on the unauth branch** — the body
   must echo `{ error: 'Unauthorized' }` exactly.
3. **Success-branch-key non-disclosure** — the
   `success: true` / `updatedCount` keys (the success
   branch's `db.update(...).returning()` payload) must
   NOT appear in the unauth response.
4. **Gate-step-ordering invariant** — the 403
   `'Tenant not found'` envelope must NEVER appear in
   the unauth response body. The first gate step
   (`!session?.user?.id` → 401 'Unauthorized') must
   fire before the second gate step (`!tenantId` →
   403 'Tenant not found').
5. **Status invariance across header / body
   permutations** — any combination of headers and
   bodies must round-trip to the same status as the
   no-body baseline.
6. **Bare-`PATCH()`-signature invariance** — the
   route does not take a `request` parameter, so
   every body permutation is silently discarded by
   the Next.js routing layer before the handler body
   runs. A regression that adds `request` parameter
   and starts reading the body would surface as a
   status divergence from the no-body baseline.
7. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT
   5xx and do NOT bypass the gate.
8. **Cross-method invariance** — `GET` / `POST` /
   `PUT` / `DELETE` against the route round-trip to
   a `< 500` status (typically 405 Method Not
   Allowed).
9. **Strict envelope-shape preservation** — the
   error response body has exactly one key
   (`error`), with the value `'Unauthorized'`.

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
  and
  [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md)
  — sibling per-spec-file references (the **first
  eight** under `tests/api/`; this spec is the
  **ninth**).
- [`admin-notifications-page-object.md`](admin-notifications-page-object.md)
  — the admin notifications page-object driver
  paired with the same admin-notifications area's
  UI shell.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the mark-all-read route
  sits inside.
