---
id: admin-items-id-history-query-spec
title: E2E Admin Items [id] History Query Spec (apps/web-e2e/tests/api/admin-items-id-history-query.spec.ts)
sidebar_label: E2E Admin Items [id] History Query Spec
sidebar_position: 516
---

# E2E Admin Items [id] History Query Spec — `apps/web-e2e/tests/api/admin-items-id-history-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin item-audit-history query-param / dynamic-segment
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-items-id-history-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-id-history-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md).

This is the **sixteenth** per-source-file reference the
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
and
[`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
and the **fourteenth** under `tests/api/`.

## Why this spec is the first dynamic-segment-GET-with-404 admin smoke

The route under test
([`apps/web/app/api/admin/items/[id]/history/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/%5Bid%5D/history/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a **dynamic-segment `[id]` `GET` handler**
with **all four** of (a) an `auth()` gate, (b) a 404
item-existence branch, (c) a query-param surface, and
(d) a per-key enum-validation 400 branch. It documents
the unique combination of:

1. **Dynamic-segment `GET` handler** — distinct from
   the **immediately-preceding** dynamic-segment `POST`
   route covered by
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md).
   The handler signature is
   `GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })`,
   resolving `params` AFTER the gate AND AFTER the
   item-existence check via `await params`.
2. **Single-step `auth()` chain** with the canonical
   longer envelope — same gate shape as
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md)
   and the wider canonical-envelope family.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` matching
   the canonical-envelope family.
4. **`success: false` envelope key on the 401 branch**
   — matching the canonical-envelope family. The
   strict envelope-shape assertion pins
   `Object.keys(body).sort() === ['error', 'success']`.
5. **Item-existence check via `itemRepository.findById(itemId, true)`
   AFTER the gate AND AFTER `await params`** — the
   **first** admin-tree route the smoke layer covers
   that has a **404 item-existence branch** between
   the gate and the query-param parse. The 404
   envelope is
   `{ success: false, error: 'Item not found' }`.
   The unauth branch must NEVER reach the existence
   check, so the unauth response body must NOT
   contain the 404 message. The boolean second
   argument `true` to `findById` opts the lookup
   into including soft-deleted items, distinct from
   every other admin-tree route the smoke layer
   covers that does not lift the soft-delete filter.
6. **Query params parsed AFTER the existence check** —
   `searchParams.get('page')` / `searchParams.get('limit')` /
   `searchParams.get('action')` are all read AFTER
   the 404 branch, so the unauth branch must NEVER
   reach the query-param parse.
7. **`page` clamping** via
   `Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage)`
   — defaults to 1, clamps to >= 1. NaN-safe.
8. **`limit` clamping** via
   `Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))`
   — defaults to 20, clamps to 1..100. NaN-safe and
   inclusive of both bounds. **The first** admin-tree
   route the smoke layer covers that documents the
   `Math.min(100, Math.max(1, ...))` two-sided bound
   posture distinct from the wider unilateral
   `validatePaginationParams(searchParams)` posture
   of the sibling admin-roles / admin-sponsor-ads
   routes.
9. **`action` enum-validation 400 branch** with a
   **dynamically-interpolated** message
   `Invalid action filter(s): <bad>. Valid actions are: <list>`.
   Distinct from every prior admin-tree spec's
   static 400 messages — the **first** admin-tree
   route the smoke layer covers that emits a
   dynamic 400 message constructed from
   user-supplied bad-action strings. The unauth
   branch must NEVER reach the enum validation,
   so the unauth response body must NOT match the
   `/^Invalid action filter\(s\):/` regex prefix
   nor contain any of the six valid action names
   (`created`, `updated`, `status_changed`,
   `reviewed`, `deleted`, `restored`).
10. **`itemAuditService.getHistory(...)` call** AFTER
    all four gates — success-branch payload shape is
    `{ success: true, data: { logs, total, page, limit, totalPages } }`.
    The unauth branch must NEVER reach the service
    call, so the unauth response body must NOT
    contain `data.logs` / `data.total` /
    `data.totalPages` keys.
11. **`safeErrorResponse(error, 'Failed to fetch item history')`
    catch** — matching the
    `safeErrorResponse(error, 'Failed to review item')`
    catch of `admin/items/[id]/review` in the
    same dynamic-segment `[id]` family. The
    unauth branch must NEVER reach the catch, so
    the unauth response body must NOT contain the
    `'Failed to fetch item history'` message.
12. **Method-resolution surface** — the route
    exports ONLY `GET`. Every other method
    (`POST` / `PUT` / `PATCH` / `DELETE`) must
    round-trip to a `< 500` status (typically
    405 Method Not Allowed).

Where the immediately-preceding
[`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md)
walks a static-path dual-method route with a
single-step gate and the bare envelope, this spec
walks a dynamic-segment single-method `GET` route
with a single-step gate, the canonical longer
envelope, AND a 404 item-existence branch — a
complementary surface that no prior admin-tree
smoke spec covers.

## Cross-route gate-shape comparison

The 404 item-existence branch is the load-bearing
divergence this spec pins, while the gate / envelope
shape echoes the canonical-envelope family of the
sibling items/[id]/review and items/bulk specs:

| Route                                          | Method  | Path shape         | Gate steps                                                      | Post-gate branches                                              | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/items/{id}/history` (this spec)    | `GET`   | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | 404 (item not found) + 400 (action enum) + service call         | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | 400 (status enum) + repo call + email side-effect               | Same                                                 | Same                                        |
| `/api/admin/items/bulk`                        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Six 400 (body validation) + per-id loop                         | Same                                                 | Same                                        |
| `/api/admin/clients/bulk`                      | `PUT` + `DELETE` | Static    | Single-step `!session?.user?.isAdmin`                           | One 400 (body validation) + per-client loop                     | `'Unauthorized'` (bare)                              | `{ error: 'Unauthorized' }` (no `success`)  |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | Single-step `!session?.user?.isAdmin`                           | Three 400 (body validation) + repo call                         | Canonical                                            | `{ success: false, error: ... }`            |
| `/api/admin/twenty-crm/test-connection`        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Body forwarded to service                                       | Canonical                                            | Same                                        |
| `/api/admin/twenty-crm/config`                 | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Service call                                                    | Canonical                                            | Same                                        |
| `/api/admin/sponsor-ads`                       | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Query parse + repo call                                         | Canonical                                            | Same                                        |
| `/api/admin/items/export`                      | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | Service call                                                    | Canonical                                            | Same                                        |

This route fills the previously-empty quadrant
**"dynamic-segment GET × 404 existence branch"** —
every prior dynamic-segment route was POST and had
no existence branch; every prior 404-branch route
sat outside the admin tree.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **handful of
hand-written scenarios** under a single top-level
`test.describe('API: /api/admin/items/[id]/history method / query / header surface', …)`:

| Block                                                                                          | Purpose                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of HEADERS) test(…)`                                            | Bulk-loop walk of every plausible header shape (~18). Asserts the `< 500` no-server-error invariant for each header set.                                                |
| `for (const { qs, label } of QUERY_STRINGS) test(…)`                                            | Bulk-loop walk of every plausible query string (~30). Asserts the `< 500` no-server-error invariant.                                                                    |
| `for (const id of DYNAMIC_IDS) test(…)`                                                          | Bulk-loop walk of every plausible `[id]` shape (~10). Asserts the `< 500` no-server-error invariant.                                                                    |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                  | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                            |
| `test('GET … does NOT echo the 404 Item-not-found envelope on the unauth branch', …)`           | Pins the gate-before-existence-check order: the `'Item not found'` 404 message must NEVER appear in the unauth response body.                                            |
| `test('GET … does NOT echo the action-enum 400 message on the unauth branch', …)`               | Pins the gate-before-query-parse order: the dynamic `'Invalid action filter(s): <bad>. Valid actions are: <list>'` 400 message must NEVER appear in the unauth response body. |
| `test('GET … does NOT echo any of the six valid action names on the unauth branch', …)`        | Pins the gate-before-enum-list order: the six valid action names (`created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored`) must NEVER appear in the unauth response body. |
| `test('GET … does NOT echo the success-branch keys on the unauth branch', …)`                  | Negative-property assertion: the unauth response body must NOT contain `data.logs` / `data.total` / `data.totalPages` keys, and must NOT contain `success: true`.        |
| `test('GET … does NOT echo the catch-branch 500 message on the unauth branch', …)`              | Pins the gate-before-catch order: the `'Failed to fetch item history'` message must NEVER appear in the unauth response body.                                            |
| `test('GET … has a stable status across header / query / id permutations', …)`                  | Compares parameterised header / query / id permutations against the no-arg baseline status.                                                                              |
| `test('GET … does NOT branch on side-channel cookies / headers', …)`                            | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` / `X-Tenant-Id` / `X-User-Id` / `Authorization` / `X-Api-Key` / `X-Admin-Token` headers. |
| `test('GET … cross-method probe does NOT 5xx', …)`                                              | Method-resolution walk: POST / PUT / PATCH / DELETE against the route. The route only exports `GET`, so every other method must round-trip to `< 500`.                  |
| `test('GET … Unauthorized error envelope echoes the success: false key', …)`                    | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                    |
| `test('GET … is invariant to dynamic [id] segment shape on the unauth branch', …)`              | Pins the gate-before-params-resolve order: numeric / zero / 200-char-padded / Unicode / URL-encoded / soft-deleted-shape ids all round-trip to the same status as the baseline UUID. |
| `test('GET … is invariant to limit / page / action repeats on the unauth branch', …)`          | Pins the gate-before-query-parse order: `?limit=1&limit=999` / `?page=1&page=2` / `?action=created&action=invalid` all round-trip to the same status.                    |
| `test('GET … is invariant to action-enum boundary fuzzing on the unauth branch', …)`            | Pins the gate-before-enum-validation order: `?action=` / `?action=,,,` / `?action=created,invalid` / `?action=' OR 1=1`-shape SQL-injection / `?action=<script>` XSS-shape probes all round-trip to the same status. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   query / id permutation (~60 total) must
   round-trip to a `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Gate-before-existence-check invariant** — the
   `'Item not found'` 404 message must NEVER appear
   in the unauth response body.
4. **Gate-before-query-parse invariant** — the
   dynamic `'Invalid action filter(s): <bad>. Valid actions are: <list>'`
   400 message must NEVER appear in the unauth
   response body.
5. **Action-enum disclosure non-disclosure** — the
   six valid action names (`created`, `updated`,
   `status_changed`, `reviewed`, `deleted`,
   `restored`) must NEVER appear in the unauth
   response body. A regression that runs the
   enum-list interpolation before the gate would
   surface here.
6. **Success-branch-key non-disclosure** — the
   `data.logs` / `data.total` / `data.page` /
   `data.limit` / `data.totalPages` keys (the
   service-call payload) and the `success: true`
   key must NOT appear in the unauth response.
7. **Gate-before-catch invariant** — the
   `'Failed to fetch item history'` message must
   NEVER appear in the unauth response body.
8. **Status invariance across header / query / id
   permutations** — any combination of headers,
   query strings, and `[id]` shapes must round-trip
   to the same status as the no-arg baseline.
9. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT
   5xx and do NOT bypass the gate.
10. **Cross-method invariance** — `POST` / `PUT` /
    `PATCH` / `DELETE` against the route round-trip
    to a `< 500` status (typically 405 Method Not
    Allowed).
11. **Strict envelope-shape preservation** — the
    error response body has exactly two keys
    (`error`, `success`), with the values
    `'Unauthorized. Admin access required.'` and
    `false`.
12. **Dynamic-`[id]`-segment invariance** — numeric
    / zero / 200-char-padded / Unicode / URL-encoded
    / soft-deleted-shape ids all round-trip to the
    same 401 status as the baseline UUID, pinning
    that the gate fires BEFORE `await params` and
    BEFORE the existence check.
13. **Repeated-key invariance** — `?limit=1&limit=999`
    / `?page=1&page=2` / `?action=created&action=invalid`
    all round-trip to the same 401 status.
14. **Action-enum boundary-fuzzing invariance** —
    `?action=` / `?action=,,,` /
    `?action=created,invalid` / SQL-injection-shape
    / XSS-shape probes all round-trip to the same
    401 status, pinning the gate-before-enum-validation
    order.

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
  and
  [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md)
  — sibling per-spec-file references (the **first thirteen**
  under `tests/api/`; this spec is the **fourteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items-history route sits inside.
