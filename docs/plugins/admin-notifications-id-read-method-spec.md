---
id: admin-notifications-id-read-method-spec
title: E2E Admin Notifications [id] Read Method Spec (apps/web-e2e/tests/api/admin-notifications-id-read-method.spec.ts)
sidebar_label: E2E Admin Notifications [id] Read Method Spec
sidebar_position: 519
---

# E2E Admin Notifications [id] Read Method Spec — `apps/web-e2e/tests/api/admin-notifications-id-read-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-notification mark-as-read method / id /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-notifications-id-read-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-id-read-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md).

This is the **nineteenth** per-source-file reference the
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
[`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
[`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
[`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
[`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
[`admin-items-import-body-spec.md`](admin-items-import-body-spec.md),
and
[`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
and the **seventeenth** under `tests/api/`.

## Why this spec is the dynamic-segment PATCH admin-tree smoke

The route under test
([`apps/web/app/api/admin/notifications/[id]/read/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/notifications/[id]/read/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a **dynamic-segment `[id]` `PATCH` handler**
with the **two-step `!session?.user?.id` → `!tenantId`
gate** envelope. It is the dynamic-segment sibling of the
static-path `admin/notifications/mark-all-read` PATCH route
covered by
[`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md)
— the two routes share the same gate envelope but are walked
by different specs because their path / id resolution
surface is strictly different.

1. **`PATCH` handler with a dynamic `[id]` path
   parameter** — the **first** dynamic-segment `PATCH`
   handler the admin-tree smoke layer pins. The handler
   signature accepts `request: NextRequest` and a
   `{ params: Promise<{ id: string }> }` second argument;
   the params Promise is resolved AFTER the auth gate AND
   BEFORE the tenant-resolution gate. Distinct from the
   static-path PATCH of `admin/notifications/mark-all-read`
   and from the dynamic-segment `POST` of
   `admin/items/[id]/review` and the dynamic-segment `GET`
   of `admin/items/[id]/history`.
2. **Two-step gate**: first
   `if (!session?.user?.id)` → 401
   `{ error: 'Unauthorized' }`; the route does NOT check
   `session.user.isAdmin` (it only requires an
   authenticated user, the DB write is scoped to that
   user's notifications via the three-clause `where`).
   Then AFTER params AND AFTER the 400 missing-id
   branch: `if (!tenantId)` → 403
   `{ error: 'Tenant not found' }`. This is the SAME
   two-step gate envelope as the sibling
   `admin/notifications/mark-all-read` route, which is
   why this spec sits alongside that one rather than
   beside the canonical-longer-message admin specs.
3. **Bare `'Unauthorized'` 401 message** — matching the
   sibling `admin/notifications/mark-all-read` envelope.
   Distinct from the canonical longer
   `'Unauthorized. Admin access required.'` of the
   single-step-gated routes (`admin/items/import`,
   `admin/items/bulk`, `admin/categories/reorder`,
   `admin/items/[id]/review`, etc.).
4. **Bare `{ error: ... }` envelope** with NO `success`
   key on either the 401 or 403 branch — matching the
   sibling `admin/notifications/mark-all-read` envelope.
   Distinct from the `{ success: false, error: ... }`
   envelope of the canonical-longer-message routes.
5. **Path-id surface** — the handler reads `id` from
   `await params` AFTER the auth gate. A 400
   `{ error: 'Notification ID is required' }` fires on
   `!notificationId`, which is unreachable from the
   client (Next.js routes always provide a non-empty
   segment) but documents an extra validation step. The
   unauth branch must NEVER reach the params resolution,
   so the unauth response body must NOT contain the 400
   message.
6. **Tenant-resolution surface** AFTER params AND AFTER
   the 400 missing-id branch — the 403
   `{ error: 'Tenant not found' }` fires on `!tenantId`.
   The unauth branch must NEVER reach tenant
   resolution, so the unauth response body must NOT
   contain `'Tenant not found'`.
7. **DB-update surface** AFTER both gates — the handler
   issues a Drizzle `db.update(notifications)` with
   `set({ isRead: true, readAt: ..., updatedAt: ... })`
   and a three-clause `where` (id + userId + tenantId),
   then `.returning()`. If the update affects zero
   rows, the route returns 404
   `{ error: 'Notification not found' }`. The unauth
   branch must NEVER reach the DB update, so the unauth
   response body must NOT contain `'Notification not
   found'`.
8. **Success-branch payload** —
   `{ success: true, notification: updatedNotification[0] }`
   with the freshly-written notification row. The
   unauth branch must NEVER reach the success branch,
   so the unauth response body must NOT contain a
   `notification` key and must NOT contain
   `success: true`.
9. **Catch branch**: `console.error('Error marking
   notification as read:', error)` followed by 500
   `{ error: 'Internal server error' }` — matching the
   `console.error` + bare-message catch family of
   `admin/users/check-email` /
   `admin/users/check-username`. Distinct from the
   `safeErrorResponse(...)` catch family of the
   canonical-longer-message admin routes. The unauth
   branch must NEVER reach the catch, so the unauth
   response body must NOT contain the
   `'Internal server error'` message.
10. **Method-resolution surface** — the route exports
    ONLY `PATCH`. Every other method (`GET` / `POST` /
    `PUT` / `DELETE`) must round-trip to a `< 500`
    status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The dynamic-segment `[id]` PATCH posture and the two-step
gate envelope are the load-bearing divergences this spec
pins:

| Route                                          | Method  | Path shape         | Gate steps                                                      | Body validation steps | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/notifications/{id}/read` (this spec) | `PATCH` | Dynamic `[id]`   | Two-step `!session?.user?.id` → `!tenantId`                     | n/a (no body parse)   | `'Unauthorized'` (bare)                              | `{ error: ... }` (no `success` key)         |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | Same                                                            | n/a (no body parse)   | Same                                                 | Same                                        |
| `/api/admin/users/check-email`                 | `POST`  | Static             | Two-step `!session?.user` → `!session.user.isAdmin`             | One 400 message       | Same / `'Forbidden'` (403)                           | Same                                        |
| `/api/admin/users/check-username`              | `POST`  | Static             | Same                                                            | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/clients/bulk`                      | `POST`  | Static             | Same                                                            | Body forwarded        | Same                                                 | Same                                        |
| `/api/admin/items/import/validate`             | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Five 400 messages     | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/import`                      | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Two 400 messages      | Same                                                 | Same                                        |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/items/{id}/history`                | `GET`   | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | n/a (query-param)     | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/notifications/[id]/read method / id / header surface', …)`:

| Block                                                                                  | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of NOTIFICATION_IDS) test(…)`                                           | Bulk-loop walk of every plausible id shape (~6 ids: short slug, dashed slug, uuid, encoded slug, long padded slug). Asserts the `< 500` no-server-error invariant. |
| `for (const { headers, label } of ADMIN_NOTIFICATIONS_ID_READ_HEADERS) test(…)`        | Bulk-loop walk of every plausible header shape (~20 headers). Asserts the `< 500` no-server-error invariant.                                                       |
| `for (const { data, label } of ADMIN_NOTIFICATIONS_ID_READ_BODIES) test(…)`            | Bulk-loop walk of every plausible body shape (~9 bodies). Asserts the `< 500` no-server-error invariant.                                                           |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                         | Pins the bare 401 envelope: `{ error: 'Unauthorized' }`.                                                                                                            |
| `test('… Unauthorized envelope has NO success key', …)`                                | Strict envelope-shape assertion: `Object.keys(body) === ['error']`, with `body.success` undefined.                                                                  |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`              | Negative-property assertion: the unauth response body must NOT contain a `notification` key, and must NOT contain `success: true`.                                  |
| `test('… does NOT echo any of the post-auth error messages on the unauth branch', …)`  | Pins the gate-before-post-auth order: `'Notification ID is required'`, `'Tenant not found'`, `'Notification not found'`, `'Internal server error'` must NEVER appear in the unauth response body. |
| `test('… has a stable status across header / body permutations', …)`                   | Compares six different parameterised header / body permutations against the no-body baseline status.                                                                 |
| `test('… has a stable status across distinct id shapes', …)`                           | Pins the gate-before-params-resolution order: every id shape must round-trip to the same 401 status as the canonical baseline.                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                       | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` / fabricated tenant-/user-id headers + fabricated `Authorization` / `X-Api-Key` / `X-Admin-Token` headers. |
| `test('… cross-method probe (GET / POST / PUT / DELETE) does NOT 5xx', …)`             | Method-resolution walk: GET / POST / PUT / DELETE against the route. The route only exports `PATCH`, so every other method must round-trip to `< 500`.              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`              | Pins the gate-before-body-parse order (defensive, since the route does not parse a body today): malformed JSON bodies must NOT 400 with a JSON-parse error.          |
| `test('… DB update is NOT entered on the unauth branch', …)`                           | Pins the gate-before-DB-update order: the unauth response must NOT contain a `notification` key from the Drizzle `.returning()` payload.                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id / header /
   body permutation (~35 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** — the
   body must echo `{ error: 'Unauthorized' }` exactly.
3. **No-`success`-key envelope shape** —
   `Object.keys(body) === ['error']`, with
   `body.success` undefined.
4. **Success-branch-key non-disclosure** — the
   `notification` key (the DB-row payload) and the
   `success: true` key must NOT appear in the unauth
   response.
5. **Gate-before-post-auth invariant** — none of the
   four post-auth messages (`'Notification ID is
   required'`, `'Tenant not found'`, `'Notification not
   found'`, `'Internal server error'`) must appear in
   the unauth response body.
6. **Status invariance across header / body
   permutations** — any combination of headers and
   bodies must round-trip to the same status as the
   no-body baseline.
7. **Status invariance across distinct id shapes** —
   every id shape (short slug, dashed slug, uuid,
   encoded slug, long padded slug) must round-trip to
   the same status as the canonical id baseline.
8. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT 5xx
   and do NOT bypass the gate.
9. **Cross-method invariance** — `GET` / `POST` /
   `PUT` / `DELETE` against the route round-trip to a
   `< 500` status (typically 405 Method Not Allowed).
10. **Gate-before-body-parse invariant** — malformed
    JSON bodies (`'not-json'`, `'{ broken: json'`,
    `'{"isRead":'`) must NOT 400 with a JSON-parse
    error before the gate fires.
11. **Gate-before-DB-update invariant** — the
    `db.update(notifications)...returning()` call is
    NOT entered on the unauth branch, so the
    `notification` key must NEVER appear in the unauth
    response body.

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
  [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
  [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
  [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
  [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
  [`admin-items-import-body-spec.md`](admin-items-import-body-spec.md),
  and
  [`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md)
  — sibling per-spec-file references (the **first
  sixteen** under `tests/api/`; this spec is the
  **seventeenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-notification
  mark-as-read route sits inside.
