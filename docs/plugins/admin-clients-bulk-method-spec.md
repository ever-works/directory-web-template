---
id: admin-clients-bulk-method-spec
title: E2E Admin Clients Bulk Method Spec (apps/web-e2e/tests/api/admin-clients-bulk-method.spec.ts)
sidebar_label: E2E Admin Clients Bulk Method Spec
sidebar_position: 515
---

# E2E Admin Clients Bulk Method Spec — `apps/web-e2e/tests/api/admin-clients-bulk-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin clients-bulk-action method / body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-clients-bulk-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-bulk-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md).

This is the **fifteenth** per-source-file reference the
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
and
[`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
and the **thirteenth** under `tests/api/`.

## Why this spec is the first dual-method admin-tree smoke

The route under test
([`apps/web/app/api/admin/clients/bulk/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/bulk/route.ts))
is the **first** admin-tree route the smoke layer covers
that exports **two HTTP methods on the same path** —
`PUT` (bulk update) **and** `DELETE` (bulk deletion) —
distinct from every prior admin-tree smoke spec that
covers single-method routes. It documents the unique
combination of:

1. **Dual-method export (`PUT` + `DELETE`)** — the
   **first** admin-tree route the smoke layer covers
   where TWO methods are valid handlers and the
   remaining methods (`GET` / `POST` / `PATCH`) must
   round-trip to a `< 500` status (typically 405
   Method Not Allowed). Every prior admin-tree smoke
   spec covers a single-method route. A regression
   that drops the `PUT` export (or the `DELETE`
   export) would surface as a status divergence
   between the two methods on the unauth branch.
2. **Bare `'Unauthorized'` 401 message** with bare
   `{ error: 'Unauthorized' }` envelope (no
   `success: false` key) — distinct from the canonical
   longer family of
   [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
   [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
   and
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
   and the same bare-message family as
   [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
   [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
   and
   [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md).
3. **Single-step `auth()` chain with bare-message
   envelope** — the gate is
   `if (!session?.user?.isAdmin)` returning 401 with
   the bare envelope. The first admin-tree route the
   smoke layer covers that pairs a **single-step**
   gate with the **bare** envelope: every prior
   bare-envelope route had a **two-step** gate
   (check-email, check-username, mark-all-read).
   Every prior **single-step** gate route had the
   **canonical longer** envelope (items/bulk,
   categories/reorder, items/[id]/review).
4. **Body parse via `await request.json()`** AFTER
   the gate AND inside the per-method `try` block —
   the gate-then-parse-then-validate-then-loop order
   is the load-bearing invariant of both methods.
5. **Single-step body validation** AFTER the gate
   AND AFTER the body parse with one 400 message
   `'Invalid request: clients array is required'`
   that fires on `!Array.isArray(body.clients) || body.clients.length === 0`.
   The unauth branch must NEVER reach the validation
   step — the response body must NOT contain the
   400 message.
6. **Per-client try/catch loop** — both methods
   iterate `for (const [index, clientData] of body.clients.entries())`
   and on each iteration:
   - **Validate `clientData.id`** — if missing, push
     `{ index, error: 'Client ID is required', clientData }`
     into the `errors[]` array (no `safeErrorMessage`
     call) and `continue`.
   - **Call the per-method DB helper** —
     `updateClientProfile(clientData.id, updateData)`
     for `PUT` and `deleteClientProfile(clientData.id)`
     for `DELETE`.
   - **Catch errors** via
     `safeErrorMessage(error, 'Unknown error')`,
     pushing `{ index, error: <msg>, clientData }`
     into the `errors[]` array rather than throwing.
   The per-client failures are collected into a
   **two-array shape** (`results[]` for successes +
   `errors[]` for failures, plus a `summary: { total, successful, failed }`)
   distinct from the **single-array shape** of
   `admin/items/bulk` (one `results: BulkActionResult[]`
   array with per-id `success: <boolean>` flags).
   The unauth branch must NEVER reach the loop, so
   the unauth response body must NOT contain
   `results` / `errors` / `summary` keys.
7. **Direct DB-helper call without a repository
   abstraction** — both methods call
   `updateClientProfile` / `deleteClientProfile`
   directly from `@/lib/db/queries`, distinct from
   the `itemRepository.review(...)` /
   `itemRepository.delete(...)` calls of
   `admin/items/bulk` and the
   `categoryRepository.reorder(...)` call of
   `admin/categories/reorder`. The same
   direct-DB-call posture as
   [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md).
8. **Per-method success-branch payload divergence** —
   the success branch returns a 200 with a payload
   shape that differs **only in two fields** between
   the two methods:
   - `PUT` success branch:
     `{ success: true, message: 'Bulk update completed: <successful> successful, <failed> failed', results: [{ index, success: true, data: <clientProfile> }, …], errors: [{ index, error, clientData }, …], summary: { total, successful, failed } }`.
   - `DELETE` success branch:
     `{ success: true, message: 'Bulk deletion completed: <successful> successful, <failed> failed', results: [{ index, success: true, clientId: <id> }, …], errors: [{ index, error, clientData }, …], summary: { total, successful, failed } }`.
   The two divergences are: (a) the `message` template
   (`'Bulk update completed: ...'` vs `'Bulk deletion completed: ...'`),
   and (b) the per-result inner key (`data: <clientProfile>` for
   `PUT` vs `clientId: <id>` for `DELETE`). The unauth
   branch must NEVER reach either branch, so the
   unauth response body must NOT match either
   message template AND must NOT contain
   `data` / `clientId` keys.
9. **Per-method catch-branch envelope divergence** —
   each method's `try/catch` wraps the entire handler
   body and returns its own
   `safeErrorResponse(error, '<msg>')` envelope:
   - `PUT` catch: `'Failed to process bulk update'`.
   - `DELETE` catch: `'Failed to process bulk deletion'`.
   The **first** admin-tree route the smoke layer
   covers with **two distinct catch envelopes** on
   the same path. The unauth branch must NEVER reach
   either catch, so the unauth response body must
   NOT contain either of the two messages.
10. **`safeErrorMessage` + `safeErrorResponse`
    twin-import surface** — matching the
    [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md)
    twin-import posture. This route is the **second**
    admin-tree route the smoke layer covers that
    imports BOTH helpers (every other admin-tree
    route imports only `safeErrorResponse`). A
    regression that drops the `safeErrorMessage`
    import would surface as a per-client `error`
    value of `undefined` on the success branch —
    but the unauth branch never reaches the loop,
    so the smoke layer pins the import-surface
    invariant via the negative-property assertions
    on `results` / `errors` / `summary`.
11. **Method-resolution surface** — the route exports
    `PUT` AND `DELETE`. Every other method (`GET` /
    `POST` / `PATCH`) must round-trip to a `< 500`
    status (typically 405 Method Not Allowed). A 5xx
    on any other method would indicate the Next.js
    routing layer crashed before the method-resolution
    returned its canonical 405. The first admin-tree
    route the smoke layer covers where TWO methods
    are valid is also the first where the cross-method
    probe walks **three** other methods (`GET` /
    `POST` / `PATCH`) rather than the usual four
    (`GET` / `POST` / `PUT` / `PATCH` /
    `DELETE` minus the one valid method).

Where the immediately-preceding
[`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md)
walks a single-method `POST` route with a six-step
body validation chain and the canonical longer
envelope, this spec walks a dual-method `PUT` +
`DELETE` route with a single-step body validation
and the bare envelope — a complementary surface
that no prior admin-tree smoke spec covers.

## Cross-route gate-shape comparison

The dual-method export is the load-bearing
divergence this spec pins, while the gate / envelope
shape echoes the bare-message family of the
sibling check-email / check-username /
mark-all-read specs but with a single-step gate:

| Route                                          | Method(s)        | Path shape         | Gate steps                                                      | Body validation steps | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ---------------- | ------------------ | --------------------------------------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/clients/bulk` (this spec's route)  | `PUT` + `DELETE` | Static             | Single-step `!session?.user?.isAdmin`                           | One 400 message       | `'Unauthorized'` (bare)                              | `{ error: 'Unauthorized' }` (no `success`)  |
| `/api/admin/items/bulk`                        | `POST`           | Static             | Single-step `!session?.user?.isAdmin`                           | Six 400 messages      | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/{id}/review`                 | `POST`           | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`            | Static             | Single-step `!session?.user?.isAdmin`                           | Three 400 messages    | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/test-connection`        | `POST`           | Static             | Single-step `!session?.user?.isAdmin`                           | Body forwarded        | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                 | `GET`            | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                       | `GET`            | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/export`                      | `GET`            | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`       | `PATCH`          | Static             | Two-step `!session?.user?.id` → `!tenantId`                     | n/a (bare handler)    | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                 | `POST`           | Static             | Two-step `!session?.user` → `!session.user.isAdmin`             | One 400 message       | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`              | `POST`           | Static             | Same                                                            | One 400 message       | Same                                                 | Same                                        |

This route fills the previously-empty quadrant
**"single-step gate × bare envelope"** — every prior
spec was either single-step gate × canonical envelope
or two-step gate × bare envelope. A regression that
re-orders the two condition halves of the gate (e.g.
`if (!session?.user || !session.user.isAdmin)`) would
not change the observable status / envelope on the
unauth branch, but would change the status on a
session-without-`isAdmin` request from the same 401
to a different 401 + 403 split.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks per method**
(four total) + **handful of hand-written scenarios**
under a single top-level
`test.describe('API: /api/admin/clients/bulk method / body / header surface', …)`:

| Block                                                                                          | Purpose                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const method of ['put', 'delete']) for (const { headers, label } of HEADERS) test(…)`    | Bulk-loop walk of every plausible header shape × both methods (~30 combinations). Asserts the `< 500` no-server-error invariant for each header / method set.            |
| `for (const method of ['put', 'delete']) for (const { data, label } of BODIES) test(…)`        | Bulk-loop walk of every plausible body shape × both methods (~50 combinations). Asserts the `< 500` no-server-error invariant.                                          |
| `test('PUT … returns 401 with the bare Unauthorized envelope', …)`                              | Pins the bare 401 envelope: `{ error: 'Unauthorized' }` exactly.                                                                                                        |
| `test('DELETE … returns 401 with the bare Unauthorized envelope', …)`                           | Same envelope assertion for the `DELETE` branch — pins the cross-method response-parity invariant.                                                                       |
| `test('PUT and DELETE return byte-identical 401 envelopes', …)`                                 | Cross-method response-parity assertion: `await PUT.json()` deep-equals `await DELETE.json()`. The load-bearing invariant of the dual-method smoke layer.                |
| `test('PUT … does NOT echo the success-branch keys on the unauth branch', …)`                  | Negative-property assertion: the unauth response body must NOT contain `results` / `errors` / `summary` / `data` keys, and must NOT contain `success: true`.            |
| `test('DELETE … does NOT echo the success-branch keys on the unauth branch', …)`                | Same negative-property assertion for the `DELETE` branch — the per-result `clientId` key must also be absent.                                                            |
| `test('PUT and DELETE do NOT echo the validation 400 message on the unauth branch', …)`         | Pins the gate-before-body-validation order: the `'Invalid request: clients array is required'` 400 message must NEVER appear in the unauth response body for either method. |
| `test('PUT and DELETE do NOT echo their per-method catch envelope on the unauth branch', …)`    | Pins the gate-before-catch order: `'Failed to process bulk update'` and `'Failed to process bulk deletion'` must NEVER appear in the unauth response body.               |
| `test('PUT … has a stable status across header / body permutations', …)`                       | Compares parameterised header / body permutations against the no-body baseline status.                                                                                  |
| `test('DELETE … has a stable status across header / body permutations', …)`                     | Same status-stability assertion for the `DELETE` branch.                                                                                                                 |
| `test('PUT … does NOT branch on side-channel cookies / headers', …)`                            | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` / `X-Tenant-Id` / `X-User-Id` / `Authorization` / `X-Api-Key` / `X-Admin-Token` headers. |
| `test('DELETE … does NOT branch on side-channel cookies / headers', …)`                         | Same side-channel walk for the `DELETE` branch.                                                                                                                          |
| `test('cross-method probe (`GET` / `POST` / `PATCH`) does NOT 5xx', …)`                         | Method-resolution walk: `GET` / `POST` / `PATCH` against the route. The route only exports `PUT` and `DELETE`, so the three remaining methods must round-trip to `< 500`. |
| `test('PUT and DELETE Unauthorized envelopes have exactly one key', …)`                         | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error']` (no `success` / `code` keys) for both methods.                                                |
| `test('PUT and DELETE are invariant to malformed JSON bodies on the unauth branch', …)`         | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires for either method.                              |
| `test('PUT and DELETE per-client loops are NOT entered on the unauth branch', …)`               | Pins the gate-before-loop order: the unauth response must NOT contain `results` / `errors` / `summary` keys, and `body.message` must NOT match either success-branch template. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body / method permutation (~80 total across both
   methods) must round-trip to a `< 500` status.
2. **Bare 401 envelope on the unauth branch** —
   the body must echo `{ error: 'Unauthorized' }`
   exactly for both `PUT` and `DELETE`.
3. **Cross-method response-parity** — the `PUT` and
   `DELETE` 401 envelopes must be byte-identical
   (deep-equal). The load-bearing invariant of the
   dual-method smoke layer; a regression that
   diverges the envelopes (e.g. one method gets a
   custom message) would surface here.
4. **Success-branch-key non-disclosure** — the
   `results` / `errors` / `summary` keys (the
   per-client loop payload), the `success: true`
   key, the per-result `data` key (PUT), and the
   per-result `clientId` key (DELETE) must NOT
   appear in the unauth response.
5. **Gate-before-body-validation invariant** — the
   `'Invalid request: clients array is required'`
   400 message must NEVER appear in the unauth
   response body for either method.
6. **Gate-before-catch invariant** — the
   `'Failed to process bulk update'` and
   `'Failed to process bulk deletion'` messages
   must NEVER appear in the unauth response body.
7. **Status invariance across header / body
   permutations** — any combination of headers and
   bodies must round-trip to the same status as the
   no-body baseline for each method.
8. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers,
   `X-Real-IP` headers, fabricated `X-Tenant-Id` /
   `X-User-Id` headers, and fabricated `Authorization`
   / `X-Api-Key` / `X-Admin-Token` headers do NOT
   5xx and do NOT bypass the gate for either method.
9. **Cross-method invariance** — `GET` / `POST` /
   `PATCH` against the route round-trip to a
   `< 500` status (typically 405 Method Not
   Allowed). The first admin-tree route the smoke
   layer covers where the cross-method probe walks
   exactly THREE methods (the three the route does
   NOT export) rather than four.
10. **Strict envelope-shape preservation** — the
    error response body has exactly one key
    (`error`), with the value `'Unauthorized'`. No
    `success` / `code` / per-method keys.
11. **Gate-before-body-parse invariant** — malformed
    JSON bodies must NOT 400 with a JSON-parse error
    before the gate fires for either method.
12. **Gate-before-loop invariant** — the per-client
    loop is NOT entered on the unauth branch for
    either method, so the `results: { index, success, data | clientId }[]`
    array, the `errors: { index, error, clientData }[]`
    array, and the `summary: { total, successful, failed }`
    object must NEVER appear in the unauth response
    body, and `body.message` must NOT match either
    success-branch message template
    (`'Bulk update completed: ...'` /
    `'Bulk deletion completed: ...'`).

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
  and
  [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md)
  — sibling per-spec-file references (the **first twelve**
  under `tests/api/`; this spec is the **thirteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the clients-bulk-action route
  sits inside.
