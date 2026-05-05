---
id: admin-items-import-body-spec
title: E2E Admin Items Import Body Spec (apps/web-e2e/tests/api/admin-items-import-body.spec.ts)
sidebar_label: E2E Admin Items Import Body Spec
sidebar_position: 517
---

# E2E Admin Items Import Body Spec — `apps/web-e2e/tests/api/admin-items-import-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items-import-execute body / header / method smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-items-import-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-import-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md).

This is the **seventeenth** per-source-file reference the
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
and
[`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
and the **fifteenth** under `tests/api/`.

## Why this spec is the two-step-body-validation admin-tree smoke

The route under test
([`apps/web/app/api/admin/items/import/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/import/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a static-path `POST` handler with a
**two-step body validation chain** AFTER the gate AND AFTER
the body parse — distinct from the **single-step** body
validation of `admin/items/[id]/review`, the **three-step**
body validation of `admin/categories/reorder`, and the
**six-step** body validation of `admin/items/bulk`. It
documents the unique combination of:

1. **`POST` handler with a static path** — distinct from
   the dynamic-segment `[id]` routes covered by
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md)
   and
   [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md).
   Same static-path posture as the sibling
   `admin/items/bulk`, `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`,
   `admin/users/check-email`, and
   `admin/users/check-username` routes.
2. **Single-step `auth()` chain** that collapses both
   unauthenticated and authenticated-non-admin branches
   into the SAME 401 envelope — the SAME gate shape as
   the sibling `admin/items/bulk`,
   `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`,
   `admin/items/export`, and `admin/items/[id]/review`
   routes. Distinct from the two-step gates of
   `admin/users/check-email`,
   `admin/users/check-username`, and
   `admin/notifications/mark-all-read`.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` — matching
   the sibling `admin/items/bulk`,
   `admin/categories/reorder`, and
   `admin/items/[id]/review` envelope. Distinct from the
   bare `'Unauthorized'` of the two-step-gated routes.
4. **`success: false` envelope key on the 401 branch** —
   matching the sibling envelope family.
5. **Body parse via `await request.json()`** AFTER the
   gate — the gate-then-parse-then-validate-then-service
   order is the load-bearing invariant of this route.
6. **Two-step body validation chain** AFTER the gate AND
   AFTER the body parse. The two distinct 400 messages
   are:
   - (a) `'Missing or invalid rows array.'`
     on `!body.rows || !Array.isArray(body.rows)`.
   - (b) `'Missing import options.'`
     on `!body.options`.
   Distinct from the **single-step** body validation of
   `admin/items/[id]/review` (one 400 message), the
   **three-step** body validation of
   `admin/categories/reorder` (three 400 messages), and
   the **six-step** body validation of
   `admin/items/bulk` (six 400 messages). The unauth
   branch must NEVER reach EITHER validation step — the
   response body must NOT contain EITHER 400 message.
7. **Service-call surface** AFTER the gate AND AFTER
   both validation steps — the handler instantiates
   `new ItemImportService()` and calls
   `executeImport(rows, options)` with the body's
   `rows` and the body's `options` merged with three
   defaults:
   - `duplicateStrategy` defaults to `'skip'` if
     `body.options.duplicateStrategy` is falsy.
   - `defaultStatus` defaults to `'draft'` if
     `body.options.defaultStatus` is falsy.
   - `submittedBy` defaults to `'admin'` if
     `session.user.email` is falsy.
   The success-branch payload shape is
   `{ success: true, result }` where `result` is the
   `ImportExecutionResult` returned by the service. The
   unauth branch must NEVER reach `executeImport`, so
   the unauth response body must NOT contain a `result`
   key and must NOT contain `success: true`.
8. **`safeErrorResponse(error, 'Failed to execute import')`
   catch** — matching the
   `safeErrorResponse(error, 'Failed to process bulk action')`
   catch of `admin/items/bulk` and the
   `safeErrorResponse(error, 'Failed to fetch item history')`
   catch of `admin/items/[id]/history`. Distinct from
   the `console.error` + `'Internal server error'`
   catch of `admin/users/check-email` /
   `admin/users/check-username`. The unauth branch must
   NEVER reach the catch, so the unauth response body
   must NOT contain the `'Failed to execute import'`
   message.
9. **Method-resolution surface** — the route exports
   ONLY `POST`. Every other method (`GET` / `PUT` /
   `PATCH` / `DELETE`) must round-trip to a `< 500`
   status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The two-step body validation chain is the load-bearing
divergence this spec pins, while the gate / envelope
shape echoes the sibling `admin/items/bulk`,
`admin/categories/reorder`, and `admin/items/[id]/review`
specs:

| Route                                          | Method  | Path shape         | Gate steps                                                      | Body validation steps | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/items/import` (this spec's route)  | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | **Two** 400 messages  | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | Single-step `!session?.user?.isAdmin`                           | Three 400 messages    | Same                                                 | Same                                        |
| `/api/admin/items/bulk`                        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Six 400 messages      | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/test-connection`        | `POST`  | Static             | Single-step `!session?.user?.isAdmin`                           | Body forwarded        | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                 | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                       | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/export`                      | `GET`   | Static             | Single-step `!session?.user?.isAdmin`                           | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/{id}/history`                | `GET`   | Dynamic `[id]`     | Single-step `!session?.user?.isAdmin`                           | n/a (query-param)     | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | Two-step `!session?.user?.id` → `!tenantId`                     | n/a (bare handler)    | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                 | `POST`  | Static             | Two-step `!session?.user` → `!session.user.isAdmin`             | One 400 message       | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`              | `POST`  | Static             | Same                                                            | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/clients/bulk`                      | `POST`  | Static             | Two-step `!session?.user?.id` → `!session.user.isAdmin`         | Body forwarded        | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/items/import method / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_ITEMS_IMPORT_HEADERS) test(…)`                             | Bulk-loop walk of every plausible header shape (~21 headers). Asserts the `< 500` no-server-error invariant for each header set.                                    |
| `for (const { data, label } of ADMIN_ITEMS_IMPORT_BODIES) test(…)`                                 | Bulk-loop walk of every plausible body shape (~25 bodies, including the five valid bodies that would call `executeImport(...)` if reachable, plus six step-(a)–(b) probes that would 400 with one of the two messages if reachable). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                        |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: the unauth response body must NOT contain `result`, and must NOT contain `success: true`.                                              |
| `test('… does NOT echo either of the two body-validation 400 messages on the unauth branch', …)`   | Pins the gate-before-body-validation order: BOTH 400 messages must NEVER appear in the unauth response body.                                                         |
| `test('… does NOT echo the catch-branch 500 message on the unauth branch', …)`                     | Pins the gate-before-catch order: the `'Failed to execute import'` message must NEVER appear in the unauth response body.                                            |
| `test('… has a stable status across header / body permutations', …)`                               | Compares eight different parameterised header / body permutations against the no-body baseline status.                                                              |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` / fabricated tenant-/user-id headers + fabricated `Authorization` / `X-Api-Key` / `X-Admin-Token` headers. |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk: GET / PUT / PATCH / DELETE against the route. The route only exports `POST`, so every other method must round-trip to `< 500`.              |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                           | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires.                                            |
| `test('… service call is NOT entered on the unauth branch', …)`                                    | Pins the gate-before-service order: the unauth response must NOT contain a `result` object.                                                                         |
| `test('… is invariant to duplicate-strategy / default-status enum shapes on the unauth branch', …)` | Pins the gate-before-default-fallback order: every `duplicateStrategy` / `defaultStatus` shape (valid + invalid + falsy) must round-trip to the same 401 status as the no-body baseline. |
| `test('… is invariant to large rows-array shapes on the unauth branch', …)`                        | Pins the gate-before-streaming order: 10-row and 100-row bodies must round-trip to the same 401 status as the empty-rows baseline.                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header / body
   permutation (~46 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Success-branch-key non-disclosure** — the
   `result` key (the service-call payload) and the
   `success: true` key must NOT appear in the unauth
   response.
4. **Gate-before-body-validation invariant** — BOTH
   400 envelopes (`'Missing or invalid rows array.'` and
   `'Missing import options.'`) must NEVER appear in
   the unauth response body.
5. **Gate-before-catch invariant** — the
   `'Failed to execute import'` message must NEVER
   appear in the unauth response body.
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
9. **Strict envelope-shape preservation** — the error
   response body has exactly two keys
   (`error`, `success`), with the values
   `'Unauthorized. Admin access required.'` and
   `false`.
10. **Gate-before-body-parse invariant** — malformed
    JSON bodies (`'not-json'`, `'{ broken: json'`,
    `'{"rows": []'`) must NOT 400 with a JSON-parse
    error before the gate fires.
11. **Gate-before-service invariant** — the
    `executeImport(...)` call is NOT entered on the
    unauth branch, so the `result` key must NEVER
    appear in the unauth response body.
12. **Gate-before-default-fallback invariant** — every
    `duplicateStrategy` / `defaultStatus` shape (valid
    + invalid + falsy) must round-trip to the same
    401 status, pinning that the default-fallback
    (`duplicateStrategy ||= 'skip'`,
    `defaultStatus ||= 'draft'`) is NOT evaluated on
    the unauth branch.
13. **Gate-before-streaming invariant** — 10-row and
    100-row bodies must round-trip to the same 401
    status as the empty-rows baseline, pinning that
    the `rows` array is NOT streamed into the service
    on the unauth branch.

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
  and
  [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md)
  — sibling per-spec-file references (the **first
  fourteen** under `tests/api/`; this spec is the
  **fifteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items-import-execute
  route sits inside.
