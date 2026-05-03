---
id: admin-items-import-validate-body-spec
title: E2E Admin Items Import Validate Body Spec (apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts)
sidebar_label: E2E Admin Items Import Validate Body Spec
sidebar_position: 518
---

# E2E Admin Items Import Validate Body Spec — `apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items-import-validate (dry-run) multipart-body / header
/ method smoke spec** paired with
[`apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-items-import-body-spec.md`](admin-items-import-body-spec.md).

This is the **eighteenth** per-source-file reference the
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
and
[`admin-items-import-body-spec.md`](admin-items-import-body-spec.md),
and the **sixteenth** under `tests/api/`.

## Why this spec is the multipart-form-data admin-tree smoke

The route under test
([`apps/web/app/api/admin/items/import/validate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/import/validate/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a static-path `POST` handler with a
**multipart/form-data body** parsed via
`await request.formData()` — distinct from every prior
admin-tree smoke (which all parse JSON via
`await request.json()`). It documents the unique
combination of:

1. **`POST` handler with a static path** — distinct from
   the dynamic-segment `[id]` routes covered by
   [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md)
   and
   [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md).
   Sibling of the JSON-body
   [`admin-items-import-body-spec.md`](admin-items-import-body-spec.md)
   route, sharing the same `POST`-only export shape but a
   strictly different body parse strategy.
2. **Single-step `auth()` chain** that collapses both
   unauthenticated and authenticated-non-admin branches
   into the SAME 401 envelope — the SAME gate shape as
   the sibling `admin/items/import`,
   `admin/items/bulk`, `admin/categories/reorder`,
   `admin/twenty-crm/test-connection`,
   `admin/items/export`, and
   `admin/items/[id]/review` routes. Distinct from the
   two-step gates of `admin/users/check-email`,
   `admin/users/check-username`,
   `admin/notifications/mark-all-read`, and
   `admin/clients/bulk`.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` — matching
   the sibling `admin/items/import`,
   `admin/items/bulk`, `admin/categories/reorder`, and
   `admin/items/[id]/review` envelope. Distinct from the
   bare `'Unauthorized'` of the two-step-gated routes.
4. **`success: false` envelope key on the 401 branch** —
   matching the sibling envelope family.
5. **Body parse via `await request.formData()`** AFTER
   the gate — the gate-then-formData-parse-then-validate-
   then-parse-file-then-service order is the load-bearing
   invariant of this route. This is the **first**
   admin-tree smoke spec that documents a
   `formData()`-based body parse — a complementary
   surface to the JSON-based body parses of every prior
   admin-tree smoke.
6. **Five-step file / mapping validation chain** AFTER
   the gate AND AFTER the formData parse. The five
   distinct 400 messages are:
   - (a) `'No file provided.'`
     on `!file` (the `file` form field is missing).
   - (b) `'Invalid file type. Only CSV and XLSX files
     are supported.'`
     on a filename that does NOT end in
     `.csv` / `.xlsx` / `.xls`.
   - (c) `'File too large. Maximum size is 10 MB.'`
     on `file.size > 10 * 1024 * 1024`.
   - (d) `'Invalid column mapping JSON.'`
     on a `mapping` field that is non-empty but fails
     `JSON.parse(...)`.
   - (e) `'File contains no data rows.'`
     on a parsed file with `rows.length === 0` AFTER
     the `parseCSV(...)` / `parseXLSX(...)` call.
   Distinct from the **single-step** body validation of
   `admin/items/[id]/review` (one 400 message), the
   **two-step** body validation of
   `admin/items/import` (two 400 messages), the
   **three-step** body validation of
   `admin/categories/reorder` (three 400 messages), and
   the **six-step** body validation of
   `admin/items/bulk` (six 400 messages). The unauth
   branch must NEVER reach ANY validation step — the
   response body must NOT contain ANY of the five 400
   messages.
7. **Service-call surface** AFTER the gate AND AFTER
   every validation step — the handler instantiates
   `new ItemImportService()` and calls
   `parseCSV(...)` / `parseXLSX(...)` followed by
   `validateRows(...)`. The success-branch payload
   shape is
   `{ success: true, headers, suggestedMapping,
   validationResults, summary }` (four success-branch
   keys plus the `success: true` flag). The unauth
   branch must NEVER reach EITHER service call, so the
   unauth response body must NOT contain `success: true`,
   `headers`, `suggestedMapping`, `validationResults`,
   or `summary`.
8. **`safeErrorResponse(error, 'Failed to validate
   import file')` catch** — matching the
   `safeErrorResponse(error, 'Failed to execute import')`
   catch of the sibling `admin/items/import` route, the
   `safeErrorResponse(error, 'Failed to process bulk
   action')` catch of `admin/items/bulk`, and the
   `safeErrorResponse(error, 'Failed to fetch item
   history')` catch of `admin/items/[id]/history`.
   Distinct from the `console.error` +
   `'Internal server error'` catch of
   `admin/users/check-email` /
   `admin/users/check-username`. The unauth branch must
   NEVER reach the catch, so the unauth response body
   must NOT contain the `'Failed to validate import
   file'` message.
9. **Method-resolution surface** — the route exports
   ONLY `POST`. Every other method (`GET` / `PUT` /
   `PATCH` / `DELETE`) must round-trip to a `< 500`
   status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The five-step file / mapping validation chain and the
multipart/form-data body parse are the load-bearing
divergences this spec pins, while the gate / envelope
shape echoes the sibling `admin/items/import`,
`admin/items/bulk`, `admin/categories/reorder`, and
`admin/items/[id]/review` specs:

| Route                                          | Method  | Path shape         | Body shape          | Gate steps                                              | Body validation steps | 401 message                                          | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | ------------------- | ------------------------------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `/api/admin/items/import/validate` (this spec) | `POST`  | Static             | `multipart/form-data` | Single-step `!session?.user?.isAdmin`                   | **Five** 400 messages | `'Unauthorized. Admin access required.'` (canonical) | `{ success: false, error: ... }`            |
| `/api/admin/items/import`                      | `POST`  | Static             | JSON                | Single-step `!session?.user?.isAdmin`                   | Two 400 messages      | Same                                                 | Same                                        |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | JSON                | Single-step `!session?.user?.isAdmin`                   | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | JSON                | Single-step `!session?.user?.isAdmin`                   | Three 400 messages    | Same                                                 | Same                                        |
| `/api/admin/items/bulk`                        | `POST`  | Static             | JSON                | Single-step `!session?.user?.isAdmin`                   | Six 400 messages      | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/test-connection`        | `POST`  | Static             | JSON                | Single-step `!session?.user?.isAdmin`                   | Body forwarded        | Same                                                 | Same                                        |
| `/api/admin/twenty-crm/config`                 | `GET`   | Static             | n/a                 | Single-step `!session?.user?.isAdmin`                   | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/sponsor-ads`                       | `GET`   | Static             | n/a                 | Single-step `!session?.user?.isAdmin`                   | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/export`                      | `GET`   | Static             | n/a                 | Single-step `!session?.user?.isAdmin`                   | n/a (no body)         | Same                                                 | Same                                        |
| `/api/admin/items/{id}/history`                | `GET`   | Dynamic `[id]`     | n/a                 | Single-step `!session?.user?.isAdmin`                   | n/a (query-param)     | Same                                                 | Same                                        |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | n/a                 | Two-step `!session?.user?.id` → `!tenantId`             | n/a (bare handler)    | `'Unauthorized'` (bare) / `'Tenant not found'` (403) | `{ error: ... }` (no `success` key)         |
| `/api/admin/users/check-email`                 | `POST`  | Static             | JSON                | Two-step `!session?.user` → `!session.user.isAdmin`     | One 400 message       | `'Unauthorized'` (bare) / `'Forbidden'` (403)        | Same                                        |
| `/api/admin/users/check-username`              | `POST`  | Static             | JSON                | Same                                                    | One 400 message       | Same                                                 | Same                                        |
| `/api/admin/clients/bulk`                      | `POST`  | Static             | JSON                | Two-step `!session?.user?.id` → `!session.user.isAdmin` | Body forwarded        | Same                                                 | Same                                        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** + **twelve hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/items/import/validate method / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_ITEMS_IMPORT_VALIDATE_HEADERS) test(…)`                    | Bulk-loop walk of every plausible header shape (~22 headers). Asserts the `< 500` no-server-error invariant for each header set.                                    |
| `for (const { multipart, label } of ADMIN_ITEMS_IMPORT_VALIDATE_PAYLOADS) test(…)`                 | Bulk-loop walk of every plausible multipart-form-data body (~24 payloads, including six valid bodies that would call `parseCSV(...)` / `parseXLSX(...)` / `validateRows(...)` if reachable, plus thirteen step-(a)–(e) probes that would 400 with one of the five messages if reachable). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                        |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: the unauth response body must NOT contain `headers`, `suggestedMapping`, `validationResults`, `summary`, and must NOT contain `success: true`. |
| `test('… does NOT echo any of the five file/mapping 400 messages on the unauth branch', …)`        | Pins the gate-before-validation order: ALL FIVE 400 messages must NEVER appear in the unauth response body.                                                          |
| `test('… does NOT echo the catch-branch 500 message on the unauth branch', …)`                     | Pins the gate-before-catch order: the `'Failed to validate import file'` message must NEVER appear in the unauth response body.                                      |
| `test('… has a stable status across header / body permutations', …)`                               | Compares seven different parameterised header / body permutations against the no-body baseline status.                                                              |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk: fabricated session-token cookies + `X-Forwarded-For` / `X-Real-IP` / fabricated tenant-/user-id headers + fabricated `Authorization` / `X-Api-Key` / `X-Admin-Token` headers. |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk: GET / PUT / PATCH / DELETE against the route. The route only exports `POST`, so every other method must round-trip to `< 500`.              |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                           | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']` with `body.success === false` and the canonical longer message.                |
| `test('… is invariant to malformed multipart bodies on the unauth branch', …)`                     | Pins the gate-before-formData-parse order: malformed multipart bodies must NOT 400 with a parse error before the gate fires.                                        |
| `test('… service call is NOT entered on the unauth branch', …)`                                    | Pins the gate-before-service order: the unauth response must NOT contain ANY of the four success-branch keys.                                                       |
| `test('… is invariant to file-extension shapes on the unauth branch', …)`                          | Pins the gate-before-extension-whitelist order: every extension shape (whitelisted + non-whitelisted) must round-trip to the same 401 status as the no-body baseline. |
| `test('… is invariant to mapping JSON shapes on the unauth branch', …)`                            | Pins the gate-before-mapping-parse order: every mapping shape (valid + invalid + missing) must round-trip to the same 401 status as the no-body baseline.            |
| `test('… is invariant to duplicate-strategy / default-status enum shapes on the unauth branch', …)` | Pins the gate-before-default-fallback order: every `duplicateStrategy` / `defaultStatus` shape (valid + invalid + falsy) must round-trip to the same 401 status as the no-body baseline. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   multipart-form-data body permutation (~46 total) must
   round-trip to a `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Success-branch-key non-disclosure** — the four
   service-payload keys (`headers`, `suggestedMapping`,
   `validationResults`, `summary`) and the
   `success: true` key must NOT appear in the unauth
   response.
4. **Gate-before-validation invariant** — ALL FIVE 400
   envelopes (`'No file provided.'`, `'Invalid file
   type. Only CSV and XLSX files are supported.'`,
   `'File too large. Maximum size is 10 MB.'`, `'Invalid
   column mapping JSON.'`, `'File contains no data
   rows.'`) must NEVER appear in the unauth response
   body.
5. **Gate-before-catch invariant** — the `'Failed to
   validate import file'` message must NEVER appear in
   the unauth response body.
6. **Status invariance across header / body
   permutations** — any combination of headers and
   multipart bodies must round-trip to the same status
   as the no-body baseline.
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
10. **Gate-before-formData-parse invariant** — malformed
    multipart bodies must NOT 400 with a parse error
    before the gate fires.
11. **Gate-before-service invariant** — neither
    `parseCSV(...)` / `parseXLSX(...)` nor
    `validateRows(...)` is entered on the unauth
    branch, so none of the four success-branch keys
    must appear in the unauth response body.
12. **Gate-before-extension-whitelist invariant** —
    every extension shape (whitelisted `.csv` /
    `.xlsx` / `.xls` plus non-whitelisted `.txt` /
    `.json` / `.pdf` / extensionless) must round-trip
    to the same 401 status, pinning that the
    extension-whitelist is NOT evaluated on the unauth
    branch.
13. **Gate-before-mapping-parse invariant** — every
    `mapping` shape (valid JSON, invalid JSON, broken
    JSON, empty string, missing) must round-trip to
    the same 401 status, pinning that the
    `JSON.parse(mapping)` is NOT evaluated on the
    unauth branch.
14. **Gate-before-default-fallback invariant** — every
    `duplicateStrategy` / `defaultStatus` shape (valid
    + invalid + falsy) must round-trip to the same
    401 status, pinning that the default-fallback
    (`duplicateStrategy ||= 'skip'`,
    `defaultStatus ||= 'draft'`) is NOT evaluated on
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
  [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
  [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
  [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
  [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
  [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
  and
  [`admin-items-import-body-spec.md`](admin-items-import-body-spec.md)
  — sibling per-spec-file references (the **first
  fifteen** under `tests/api/`; this spec is the
  **sixteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items-import-validate
  route sits inside.
