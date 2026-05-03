---
id: admin-items-id-method-spec
title: E2E Admin Items [id] Method Spec (apps/web-e2e/tests/api/admin-items-id-method.spec.ts)
sidebar_label: E2E Admin Items [id] Method Spec
sidebar_position: 524
---

# E2E Admin Items [id] Method Spec — `apps/web-e2e/tests/api/admin-items-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-item CRUD GET / PUT / DELETE method / id /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-items-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-id-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs.

This is the **first triple-method admin-tree smoke** the
docs tree publishes — every prior dynamic-segment admin-id
smoke pins a single-method export, and the
`admin/roles/[id]/permissions` smoke pins a dual-method
export (`GET` + `PUT`). This route ships THREE distinct
HTTP-verb handlers (`GET` + `PUT` + `DELETE`) from a
single file.

## Why this spec is the triple-method admin-tree smoke

The route under test
([`apps/web/app/api/admin/items/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME inline
`!session?.user?.isAdmin` gate, the SAME canonical longer
401 envelope (`'Unauthorized. Admin access required.'`),
and the SAME `{ success: false, error: ... }` envelope
shape — but each has its own divergent post-gate surface:

| Handler  | Body parse                              | Service call                                            | Side effects                          | Success-payload shape                                           |
| -------- | --------------------------------------- | ------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `GET`    | None                                    | `itemRepository.findById(id)` → 404 `'Item not found'` | None                                  | `{ success: true, data: <item> }`                                |
| `PUT`    | `await request.json()` AFTER the gate   | `itemRepository.update(id, updateData, auditUser)`      | Optional CRM-sync (gated by `TWENTY_CRM_ENABLED !== 'false'` and a body `brand` field) + Optional Location-Index (gated by `getLocationEnabled()`) | `{ success: true, data: <item>, message: 'Item updated successfully' }` |
| `DELETE` | None                                    | `itemRepository.delete(id, auditUser)`                  | Optional Location-Index removal       | `{ success: true, message: 'Item deleted successfully' }` (NO `data` key — distinct from GET / PUT) |

All three handlers wrap their happy paths in
`safeErrorResponse(error, '<handler-specific-message>')`
catches with handler-specific 500 messages
(`'Failed to fetch item'` / `'Failed to update item'` /
`'Failed to delete item'`).

## Cross-route triple-method comparison

This is the **first** triple-method admin-tree smoke. The
existing dual-method
[`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md)
covers `GET` + `PUT` only.

| Route                                          | Methods exported       | Gate                                        | 401 envelope                                                |
| ---------------------------------------------- | ---------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `/api/admin/items/{id}` (this spec)            | **`GET` + `PUT` + `DELETE`** | Inline `!session?.user?.isAdmin`            | Canonical `{ success: false, error: 'Unauthorized. Admin access required.' }` |
| `/api/admin/roles/{id}/permissions`            | `GET` + `PUT`          | `checkAdminAuth()` helper                   | Hybrid `{ success: false, error: 'Unauthorized' }`          |
| `/api/admin/items/{id}/review`                 | `POST`                 | Inline `!session?.user?.isAdmin`            | Canonical                                                   |
| `/api/admin/items/{id}/history`                | `GET`                  | Inline `!session?.user?.isAdmin`            | Canonical                                                   |
| `/api/admin/sponsor-ads/{id}/approve`          | `POST`                 | Compound `!isAdmin || !id`                  | Canonical                                                   |
| `/api/admin/sponsor-ads/{id}/reject`           | `POST`                 | Compound `!isAdmin || !id`                  | Canonical                                                   |
| `/api/admin/sponsor-ads/{id}/cancel`           | `POST`                 | Pure `!session?.user?.isAdmin`              | Canonical                                                   |
| `/api/admin/notifications/{id}/read`           | `PATCH`                | Two-step `!session?.user?.id` → `!tenantId` | Bare `{ error: 'Unauthorized' }` (no `success` key)         |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT`, and a
suite of **fifteen hand-written scenarios** — together
asserting both the `< 500` invariant on every permutation
and the per-handler 401-envelope contract on the unauth
branch.

| Block                                                                                                  | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of ITEM_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                          | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                               |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                    | Bulk-loop walk of every plausible header shape (~20 headers) × three methods.                                                                                      |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                              | Bulk-loop walk of every plausible PUT body shape (~17 bodies, including update-shape probes for `name`, `description`, `status`, `featured`, `brand`, `tags`, `category`, plus bypass attempts). |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope for `GET`.                                                                                                                   |
| `test('PUT … returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope for `PUT`.                                                                                                                   |
| `test('DELETE … returns 401 with the canonical longer Unauthorized envelope', …)`                      | Pins the canonical longer 401 envelope for `DELETE`.                                                                                                                |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`               | Cross-method envelope-equality assertion: all three handlers return identical 401 envelopes.                                                                         |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`           | Negative-property assertion across all three methods.                                                                                                                |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`     | Pins the gate-before-post-auth order across six post-auth messages and five candidate request shapes.                                                               |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                        | Pins the gate-before-params-resolution order across all three methods.                                                                                              |
| `test('PUT … has a stable status across body permutations', …)`                                        | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                    | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                          | Method-resolution walk: POST / PATCH against the route. The route exports only `GET`, `PUT`, `DELETE`.                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service call is NOT entered on the unauth branch', …)`                     | Pins the gate-before-service order across all three repository calls.                                                                                                |
| `test('GET / PUT / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)`  | Pins the per-handler catch-message divergence: a regression that swapped any of the three would surface as the wrong message echoing on the auth branch.            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation (~~6×3 + 20×3 + 17 = ~95
   total) must round-trip to a `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** for each of `GET`, `PUT`, and `DELETE` —
   exact match.
3. **Cross-method envelope equality** — all three
   handlers must emit byte-identical 401 envelopes on
   the unauth branch.
4. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
5. **Success-branch-key non-disclosure** across all
   three methods — no `data`, `message`, or
   `success: true` must appear in any unauth response.
6. **Gate-before-post-auth invariant** — none of
   `'Item not found'`, `'Failed to fetch item'`,
   `'Failed to update item'`, `'Failed to delete
   item'`, `'Item updated successfully'`, `'Item
   deleted successfully'` must appear in any unauth
   response.
7. **Status invariance across distinct id shapes** for
   each of the three methods.
8. **Status invariance across PUT body permutations**.
9. **Side-channel isolation** across all three
   methods.
10. **Cross-method invariance** — `POST` and `PATCH`
    against the route round-trip to a `< 500` status.
11. **Gate-before-body-parse invariant** — malformed
    JSON bodies must NOT 400 with a parse error before
    the gate fires (the PUT body parse is NOT wrapped
    in a per-call try/catch, so a malformed body would
    actually 500 via the outer `safeErrorResponse(...)`
    catch on the auth branch).
12. **Gate-before-service invariant** across all three
    repository calls.
13. **Per-handler catch-message divergence** — a
    regression that swapped any of the three
    `safeErrorResponse(...)` messages would surface as
    the wrong message echoing on the auth branch; the
    unauth branch must NOT echo any of the three.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- The full set of sibling per-spec-file references under
  `tests/api/`:
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
  [`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md),
  and
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-item CRUD route
  sits inside.
