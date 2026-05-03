---
id: admin-roles-id-permissions-method-spec
title: E2E Admin Roles [id] Permissions Method Spec (apps/web-e2e/tests/api/admin-roles-id-permissions-method.spec.ts)
sidebar_label: E2E Admin Roles [id] Permissions Method Spec
sidebar_position: 523
---

# E2E Admin Roles [id] Permissions Method Spec — `apps/web-e2e/tests/api/admin-roles-id-permissions-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin role-permissions dual-method (GET + PUT) /
dynamic-id / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-roles-id-permissions-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-id-permissions-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md).

This is the **twenty-third** per-source-file reference the
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
[`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
[`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md),
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
[`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
and
[`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md),
and the **twenty-first** under `tests/api/`.

## Why this spec is the dual-method `checkAdminAuth()`-helper admin-tree smoke

The route under test
([`apps/web/app/api/admin/roles/[id]/permissions/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/[id]/permissions/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines:

- a dynamic-segment `[id]` handler exporting BOTH a
  `GET` and a `PUT` (a true **dual-method** surface,
  distinct from every prior single-method admin-id
  smoke), AND
- an auth gate that delegates to the
  **`checkAdminAuth()` helper** at
  [`apps/web/lib/auth/admin-guard.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/auth/admin-guard.ts)
  (NOT inline `!session?.user?.isAdmin`), AND
- a **shorter `'Unauthorized'` 401 envelope**
  (NOT the canonical longer
  `'Unauthorized. Admin access required.'` envelope
  that every prior admin-id smoke pins), AND
- an **imperative permissions-array validation**
  against `isValidPermission(permission)` from
  [`apps/web/lib/permissions/definitions.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/permissions/definitions.ts)
  (NOT a Zod `safeParse(...)` schema, NOT a manual
  `['approved', 'rejected'].includes(...)` allowlist).

The handler diverges from every prior admin-tree smoke
spec in **three** load-bearing ways the smoke walk pins:

1. **Dual-method surface** — the route exports both
   `GET` (read current permissions) and `PUT` (replace
   the permissions array). Every prior admin-id smoke
   covers a single export. The smoke walk asserts the
   unauth contract against BOTH methods and pins that
   the GET / PUT envelopes are observably the same on
   the unauth branch (because both delegate to the SAME
   `checkAdminAuth()` helper).
2. **`checkAdminAuth()` helper-driven envelope** — the
   gate returns one of three envelopes depending on the
   auth state:
   - (a) no session / no `session.user`: 401 with
     `{ success: false, error: 'Unauthorized' }` — the
     **shorter** `'Unauthorized'` message, distinct from
     the canonical longer
     `'Unauthorized. Admin access required.'` envelope.
   - (b) session but no `session.user.id`: 401 with
     `{ success: false, error: 'User ID not found' }` —
     a SECOND distinct 401 envelope no prior smoke
     pins.
   - (c) session + id but `!isAdmin(id)`: 403 with
     `{ success: false, error: 'Insufficient
     permissions' }` — a 403 (NOT 401) for
     authenticated-but-non-admin, distinct from every
     prior admin-tree route which returns 401 for both
     unauth AND non-admin-auth.

   The unauth branch (no session) the smoke harness hits
   with no cookies must land on (a), with the SHORTER
   `'Unauthorized'` message.
3. **Imperative `isValidPermission` validation** — on
   the auth branch, the PUT handler validates that
   `body.permissions` is an array, then filters every
   entry through `isValidPermission(permission)`,
   returning 400 `'Permissions must be an array'` or
   400 `'Invalid permissions detected'` (with a
   side-channel `invalidPermissions` array echoed in
   the body — a UNIQUE envelope key no prior admin-tree
   smoke pins). The unauth branch must NEVER reach the
   validation step regardless of `body.permissions`
   shape.

## Cross-route gate-shape comparison

The dual-method surface, the `checkAdminAuth()`-helper-
driven envelope, and the imperative permissions-array
validation are the load-bearing divergences this spec
pins:

| Route                                          | Method(s)    | Path shape         | Gate                                                 | 401 envelope message                              | Body validation                                       |
| ---------------------------------------------- | ------------ | ------------------ | ---------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `/api/admin/roles/{id}/permissions` (this)     | `GET` + `PUT` | Dynamic `[id]`     | `checkAdminAuth()` helper (3 branches: 401 / 401 / 403) | **Shorter** `'Unauthorized'` (NOT the canonical longer) | Imperative `isValidPermission(...)`, side-channel `invalidPermissions` key |
| `/api/admin/sponsor-ads/{id}/cancel`           | `POST`       | Dynamic `[id]`     | Inline `!session?.user?.isAdmin`                     | Canonical longer `'Unauthorized. Admin access required.'` | Zod `safeParse(...)`, optional `cancelReason`         |
| `/api/admin/sponsor-ads/{id}/reject`           | `POST`       | Dynamic `[id]`     | Inline compound `!isAdmin || !id`                    | Canonical longer `'Unauthorized. Admin access required.'` | Zod `safeParse(...)`, required `rejectionReason`      |
| `/api/admin/sponsor-ads/{id}/approve`          | `POST`       | Dynamic `[id]`     | Inline compound `!isAdmin || !id`                    | Canonical longer `'Unauthorized. Admin access required.'` | Manual `body.forceApprove === true`                   |
| `/api/admin/items/{id}/review`                 | `POST`       | Dynamic `[id]`     | Inline `!session?.user?.isAdmin`                     | Canonical longer `'Unauthorized. Admin access required.'` | Manual `['approved', 'rejected'].includes(...)`       |
| `/api/admin/notifications/{id}/read`           | `PATCH`      | Dynamic `[id]`     | Inline `!session?.user?.isAdmin`                     | Canonical longer `'Unauthorized. Admin access required.'` | (no body)                                             |

## How the spec walks its scenario tree

The spec emits **four bulk-loop walks** + **fifteen hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/roles/[id]/permissions method / id / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of ROLE_IDS) test('GET …')`                                                         | Bulk-loop walk of every plausible id shape against `GET` (~8 ids).                                                                                                  |
| `for (const id of ROLE_IDS) test('PUT …')`                                                         | Bulk-loop walk of every plausible id shape against `PUT` (~8 ids).                                                                                                  |
| `for (const { headers, label } of ADMIN_ROLES_ID_PERMISSIONS_HEADERS) test('GET …')`               | Bulk-loop walk of every plausible header shape against `GET` (~21 headers).                                                                                         |
| `for (const { headers, label } of ADMIN_ROLES_ID_PERMISSIONS_HEADERS) test('PUT …')`               | Bulk-loop walk of every plausible header shape against `PUT` (~21 headers).                                                                                         |
| `for (const { data, label } of ADMIN_ROLES_ID_PERMISSIONS_BODIES) test('PUT …')`                   | Bulk-loop walk of every plausible body shape against `PUT` (~18 bodies including imperative-validation probes for valid / empty / single-invalid / mixed / non-array / numeric / null / undefined / object / numeric-array `permissions`). |
| `test('GET … returns 401 with the shorter Unauthorized envelope', …)`                              | Pins the SHORTER 401 envelope on `GET` (NOT the canonical longer envelope).                                                                                         |
| `test('PUT … returns 401 with the shorter Unauthorized envelope', …)`                              | Pins the SHORTER 401 envelope on `PUT` (NOT the canonical longer envelope).                                                                                         |
| `test('GET … Unauthorized error envelope echoes the success: false key', …)`                       | Strict envelope-shape assertion on `GET`.                                                                                                                           |
| `test('PUT … Unauthorized error envelope echoes the success: false key', …)`                       | Strict envelope-shape assertion on `PUT`.                                                                                                                           |
| `test('GET / PUT … share the SAME 401 envelope shape on the unauth branch', …)`                    | Pins that GET / PUT delegate to the SAME `checkAdminAuth()` helper.                                                                                                  |
| `test('PUT … does NOT echo any of the post-auth catch / validation / service messages', …)`        | Pins the gate-before-post-auth order across five candidate bodies.                                                                                                  |
| `test('PUT … does NOT echo the success-branch keys on the unauth branch', …)`                      | Negative-property assertion on PUT.                                                                                                                                  |
| `test('PUT … does NOT echo a side-channel invalidPermissions key on the unauth branch', …)`        | Pins that the side-channel `invalidPermissions` array (a UNIQUE envelope key) is NOT echoed on the unauth branch.                                                   |
| `test('GET … has a stable status across header permutations', …)`                                  | Three permutations vs the no-headers baseline on `GET`.                                                                                                              |
| `test('PUT … has a stable status across header / body permutations', …)`                           | Eight permutations vs the no-body baseline on `PUT`.                                                                                                                 |
| `test('GET … has a stable status across distinct id shapes', …)`                                   | Pins the gate-before-params-resolution order on `GET`.                                                                                                              |
| `test('PUT … has a stable status across distinct id shapes', …)`                                   | Pins the gate-before-params-resolution order on `PUT`.                                                                                                              |
| `test('PUT … does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk on `PUT`.                                                                                                                                          |
| `test('GET / PUT … cross-method probe (POST / PATCH / DELETE) does NOT 5xx', …)`                   | Method-resolution walk for the THREE methods NOT exported by this route.                                                                                            |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                      | Pins the gate-before-body-parse order on `PUT`.                                                                                                                      |
| `test('PUT … service call is NOT entered on the unauth branch', …)`                                | Pins the gate-before-service order on `PUT`.                                                                                                                         |
| `test('PUT … is invariant to permissions-array shape on the unauth branch', …)`                    | Pins the gate-before-validation order: every `permissions` shape (missing + valid + empty + single-invalid + non-array string / null / numeric / object / numeric-array) must round-trip to the same 401 status. |
| `test('GET / PUT … unauth branch lands on the 401 Unauthorized envelope (NOT 403 Insufficient permissions)', …)` | Pins that the smoke harness lands on the FIRST `checkAdminAuth()` branch (no session) — NOT the second (no id) and NOT the third (non-admin auth). |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id / header /
   body permutation across both methods (~76 total) must
   round-trip to a `< 500` status.
2. **Shorter `'Unauthorized'` 401 envelope on the
   unauth branch** — exact match on BOTH methods.
3. **Cross-method envelope equality** — GET / PUT must
   return the observably same body on the unauth
   branch (shared `checkAdminAuth()` helper).
4. **Strict envelope-shape preservation** on both
   methods.
5. **Success-branch-key non-disclosure** — `data`,
   `message`, `success: true` must NOT appear on the
   unauth branch of PUT.
6. **Side-channel `invalidPermissions` non-disclosure**
   — the auth-branch validation echoes this side-channel
   key, but it must NEVER appear on the unauth branch.
7. **Gate-before-post-auth invariant** — none of
   `'Role not found'`, `'Role ID is required'`,
   `'Permissions must be an array'`, `'Invalid
   permissions detected'`, `'Invalid JSON in request
   body'`, `'Permissions updated successfully'`,
   `'Insufficient permissions'`, `'User ID not found'`
   must appear in the unauth response body.
8. **Status invariance across header / body
   permutations** on both methods.
9. **Status invariance across distinct id shapes** on
   both methods.
10. **Side-channel isolation** on PUT.
11. **Cross-method invariance** — POST / PATCH /
    DELETE (the THREE methods NOT exported) must NOT
    5xx.
12. **Gate-before-body-parse invariant** on PUT.
13. **Gate-before-service invariant** on PUT.
14. **Gate-before-validation invariant** on PUT —
    every `permissions` shape (missing + valid + empty
    + single-invalid + non-array string / null /
    numeric / object / numeric-array) must round-trip
    to the same 401 status, pinning that the
    imperative `isValidPermission(permission)` filter
    is NOT evaluated on the unauth branch.
15. **First-branch landing invariant** — every probe
    from the cookie-less smoke harness must land on the
    FIRST `checkAdminAuth()` branch (the 401
    `'Unauthorized'` no-session envelope) — NOT the
    SECOND (`'User ID not found'`) and NOT the THIRD
    (`'Insufficient permissions'` 403). A regression
    that starts honoring some side-channel cookie /
    header as a valid session would surface as a 403
    branch landing without the suite going red on the
    bulk-loop `< 500` envelope.

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
  [`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
  [`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md),
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
  and
  [`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md)
  — sibling per-spec-file references (the **first
  twenty** under `tests/api/`; this spec is the
  **twenty-first**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the role-permissions route
  sits inside.
