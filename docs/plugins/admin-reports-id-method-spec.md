---
id: admin-reports-id-method-spec
title: E2E Admin Reports [id] Method Spec (apps/web-e2e/tests/api/admin-reports-id-method.spec.ts)
sidebar_label: E2E Admin Reports [id] Method Spec
sidebar_position: 529
---

# E2E Admin Reports [id] Method Spec — `apps/web-e2e/tests/api/admin-reports-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-report CRUD GET / PUT method / id / body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-reports-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-reports-id-method.spec.ts).

This is the **first 403-on-unauth admin-tree smoke** the
docs tree publishes — every prior admin-tree route returns
401 on the unauth branch (with one of three envelope
shapes: canonical-longer / bare-`Unauthorized` / hybrid-
`success: false`-bare). The `admin/reports/[id]` route
returns **403 `'Forbidden'`** on the unauth branch instead.

## Why this spec is the 403-on-unauth admin-tree smoke

The route under test
([`apps/web/app/api/admin/reports/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/reports/[id]/route.ts))
exports `GET` and `PUT` from a single file. Both handlers
share several unique characteristics:

1. **`checkDatabaseAvailability()` pre-gate** — runs
   BEFORE the auth gate. Returns a response if DB is
   unavailable, otherwise null. Distinct from every
   prior admin-tree smoke where `auth()` is the FIRST
   guard. The smoke harness assumes DB is available, so
   the pre-gate falls through and the auth gate fires.
2. **Single-step `!session?.user?.isAdmin` gate** that
   returns **403 `{ success: false, error:
   'Forbidden' }`** on the unauth branch — distinct from
   every prior admin-tree route which returns 401. The
   403 branch fires for BOTH unauthenticated AND
   authenticated-non-admin sessions.
3. **`success: false` envelope key** on the 403 branch
   with strict envelope-shape
   `Object.keys(body).sort() === ['error', 'success']`.
4. **Dynamic `[id]` segment** resolved AFTER both gates.
5. **Dev-gated `console.error` catch** — the catch only
   logs when `NODE_ENV === 'development'`, otherwise
   returns 500 `{ success: false, error: 'Internal
   Server Error' }` silently.

Each handler also has its own divergent post-gate
surface:

| Handler  | Existence check       | Body parse                              | Validation                                        | Service / side effects                                                                        | Success-payload shape                                                            |
| -------- | --------------------- | --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET`    | `getReportById(id)` → 404 `'Report not found'` | None                                    | None                                              | None                                                                                          | `{ success: true, data: <report> }`                                              |
| `PUT`    | `getReportById(id)` → 404 `'Report not found'` (BEFORE the body parse — distinct from every prior PUT smoke) | `await request.json()` AFTER the existence check | `status` enum + `resolution` enum, both with dynamic 400 messages prefixed `'Invalid status. Must be one of: ...'` / `'Invalid resolution. Must be one of: ...'` | `updateReport(id, ...)` → conditional moderation chain (`removeContent` / `warnUser` / `suspendUser` / `banUser` based on `resolution`) → `getContentOwner(...)` for user-action resolutions → final `getReportById(id)` for the full updated report | `{ success: true, message: moderationResult?.message || 'Report updated successfully', data: <report>, moderationResult }` (FOUR success-branch keys) |

The PUT handler is the **first** admin-tree smoke where
the existence check runs BEFORE the body parse — every
prior PUT smoke parses the body first. It is also the
**first** admin-tree smoke that wires a conditional
moderation-action chain into the success path.

## Cross-route 401-vs-403 comparison

The 403-on-unauth gate posture is the load-bearing
divergence this spec pins:

| Route                                          | Unauth status | Unauth envelope                                                |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------- |
| `/api/admin/reports/{id}` (this spec)          | **403**       | `{ success: false, error: 'Forbidden' }`                       |
| `/api/admin/items/{id}`                        | 401           | `{ success: false, error: 'Unauthorized. Admin access required.' }` |
| `/api/admin/clients/{clientId}`                | 401           | `{ error: 'Unauthorized' }` (no `success` key)                 |
| `/api/admin/users/{id}`                        | 401           | `{ success: false, error: 'Unauthorized' }`                    |
| `/api/admin/roles/{id}/permissions`            | 401           | `{ success: false, error: 'Unauthorized' }`                    |
| `/api/admin/notifications/{id}/read`           | 401           | `{ error: 'Unauthorized' }` (no `success` key)                 |
| `/api/admin/collections/{id}/items`            | 401           | `{ success: false, error: 'Unauthorized. Admin access required.' }` |

A regression that "fixed" the gate to return 401 instead
of 403 would surface in the dedicated invariance test.

## How the spec walks its scenario tree

The spec emits **two method-bulk-loop walks** across id
shapes, **two method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~22 PUT
bodies covering both enum branches plus reviewNote /
combined / bypass shapes), and a suite of **fifteen hand-
written scenarios**.

| Block                                                                                          | Purpose                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of REPORT_IDS) test('GET' / 'PUT' …)`                                           | Bulk-loop walk of every plausible id shape (~6 ids) × two methods.                                                                                                  |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' …)`                       | Bulk-loop walk of every plausible header shape (~17 headers) × two methods.                                                                                         |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                      | Bulk-loop walk of every plausible PUT body shape (~22 bodies, including status / resolution enum probes plus reviewNote / combined / bypass shapes).                |
| `test('GET … returns 403 with the Forbidden envelope (NOT 401)', …)`                           | Pins the 403 envelope for `GET` and the divergence vs the 401 of every prior admin-tree smoke.                                                                        |
| `test('PUT … returns 403 with the Forbidden envelope (NOT 401)', …)`                           | Pins the 403 envelope for `PUT`.                                                                                                                                      |
| `test('GET / PUT … unauth response is NEVER 401', …)`                                          | Pins the divergence: the unauth client lands on 403 (not 401). A regression that "fixed" the gate to return 401 would surface here.                                  |
| `test('GET / PUT … envelope shape has exactly success and error keys', …)`                     | Strict envelope-shape assertion across both methods.                                                                                                                  |
| `test('GET / PUT … share the SAME 403 envelope shape on the unauth branch', …)`                | Cross-method envelope-equality assertion.                                                                                                                              |
| `test('GET / PUT … does NOT echo the success-branch keys on the unauth branch', …)`            | Negative-property assertion: `data`, `moderationResult`, `message`, `success: true` must NOT appear.                                                                  |
| `test('GET / PUT … does NOT echo any of the post-auth messages on the unauth branch', …)`      | Pins the gate-before-post-auth order across five candidate static messages plus a regex prefix check for the dynamic `'Invalid status\|resolution. Must be one of:'` 400 messages. |
| `test('GET / PUT … has a stable status across distinct id shapes', …)`                         | Pins the gate-before-params-resolution order.                                                                                                                         |
| `test('PUT … has a stable status across body permutations', …)`                                | Seven body permutations vs the no-body baseline.                                                                                                                       |
| `test('GET / PUT … does NOT branch on side-channel cookies / headers', …)`                     | Side-channel walk.                                                                                                                                                    |
| `test('… cross-method probe (POST / PATCH / DELETE) does NOT 5xx', …)`                         | Method-resolution walk.                                                                                                                                                |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                  | Pins the gate-before-body-parse order.                                                                                                                                |
| `test('GET / PUT … service call is NOT entered on the unauth branch', …)`                      | Pins the gate-before-service order across all moderation-chain branches.                                                                                              |
| `test('PUT … is invariant to status / resolution enum shapes on the unauth branch', …)`        | Pins the gate-before-enum-validation order across both `status` and `resolution` enums (valid / invalid for each).                                                     |
| `test('PUT … moderation chain is NOT entered on the unauth branch', …)`                        | Pins the gate-before-moderation-chain order: every `resolution` shape (`content_removed` / `user_warned` / `user_suspended` / `user_banned`) must round-trip to the same 403 status with NO `moderationResult` key in the response. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation (~~6×2 + 17×2 + 22 = ~68
   total) must round-trip to a `< 500` status.
2. **403 `Forbidden` envelope on the unauth branch** for
   each of `GET` and `PUT` — exact match
   `{ success: false, error: 'Forbidden' }`.
3. **NEVER-401 invariant** — the unauth client lands on
   403 (not 401).
4. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
5. **Cross-method envelope equality**.
6. **Success-branch-key non-disclosure** — the
   route-specific `data` and `moderationResult` keys
   plus `message` and `success: true` must NOT appear
   in any unauth response.
7. **Gate-before-post-auth invariant** — none of the
   five static post-auth messages (`'Report not
   found'`, `'Failed to update report'`, `'Internal
   Server Error'`, `'Could not identify content owner
   for moderation action'`, `'Report updated
   successfully'`) AND none of the dynamic
   `'Invalid status\|resolution. Must be one of: ...'`
   400 messages (matched via regex prefix) must appear
   in any unauth response.
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation**.
11. **Cross-method invariance** — `POST` / `PATCH` /
    `DELETE` round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant**.
13. **Gate-before-service invariant** across the
    entire moderation chain.
14. **Gate-before-enum-validation invariant** —
    every `status` and `resolution` shape (valid /
    invalid) must round-trip to the same 403 status.
15. **Gate-before-moderation-chain invariant** —
    every `resolution` value that would trigger a
    moderation action on the auth branch
    (`content_removed` / `user_warned` /
    `user_suspended` / `user_banned`) must round-trip
    to the same 403 status with NO `moderationResult`
    key in the response.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- The full set of sibling per-spec-file references under
  `tests/api/`, including the 401-on-unauth dual-method
  [`admin-collections-id-items-method-spec.md`](admin-collections-id-items-method-spec.md)
  and the 401-on-unauth triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  and
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-report CRUD route
  sits inside.
