---
id: admin-categories-id-method-spec
title: E2E Admin Categories [id] Method Spec (apps/web-e2e/tests/api/admin-categories-id-method.spec.ts)
sidebar_label: E2E Admin Categories [id] Method Spec
sidebar_position: 528
---

# E2E Admin Categories [id] Method Spec — `apps/web-e2e/tests/api/admin-categories-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-category CRUD GET / PUT / DELETE method /
id / body / query / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-categories-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-id-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs.

This is the **second triple-method admin-tree smoke** the
docs tree publishes — the first being
[`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)
for `apps/web/app/api/admin/items/[id]/route.ts`. Every
other dynamic-segment admin-id smoke pins a single-method
export, the `admin/roles/[id]/permissions` smoke pins a
dual-method export (`GET` + `PUT`), and the
`admin/collections/[id]/items` smoke pins a nested dual-
method export (`GET` + `POST`). This route ships THREE
distinct HTTP-verb handlers (`GET` + `PUT` + `DELETE`)
from a single file.

It is also the **first triple-method admin smoke with a
DELETE-only `?hard=true` query-parameter branch** that
flips the service call from `categoryRepository.delete(id)`
(soft delete / deactivation) to
`categoryRepository.hardDelete(id)` (permanent removal),
and the **first DELETE smoke with a query-flag-driven
success-message dichotomy** (`'Category deactivated
successfully'` vs `'Category permanently deleted'`).

## Why this spec is the second triple-method admin-tree smoke

The route under test
([`apps/web/app/api/admin/categories/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME inline
`!session?.user?.isAdmin` gate, the SAME canonical longer
401 envelope (`'Unauthorized. Admin access required.'`),
and the SAME `{ success: false, error: ... }` envelope
shape — but each has its own divergent post-gate surface:

| Handler  | Body parse                              | Query parse                                      | Service call                                                       | Side effects                       | Success-payload shape                                                                                  |
| -------- | --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET`    | None                                    | None                                             | `categoryRepository.findById(id)` → 404 `'Category not found'`     | None                               | `{ success: true, data: <category> }`                                                                   |
| `PUT`    | `await request.json()` AFTER the gate   | None                                             | `categoryRepository.update(updateData)`                            | `await invalidateContentCaches()`  | `{ success: true, data: <category>, message: 'Category updated successfully' }`                          |
| `DELETE` | None                                    | `searchParams.get('hard') === 'true'` after gate | `categoryRepository.hardDelete(id)` if `hard === true` else `categoryRepository.delete(id)` | `await invalidateContentCaches()`  | `{ success: true, message: 'Category permanently deleted' }` if `hard === true` else `{ success: true, message: 'Category deactivated successfully' }` (NO `data` key — distinct from GET / PUT) |

All three handlers wrap their happy paths in
`safeErrorResponse(error, '<handler-specific-message>')`
catches with handler-specific 500 messages
(`'Failed to fetch category'` / `'Failed to update
category'` / `'Failed to delete category'`).

PUT additionally has **three** message-pattern catch
branches BEFORE the outer `safeErrorResponse(...)` catch:

| Pattern in `error.message` | Status            | Envelope                                              |
| -------------------------- | ----------------- | ----------------------------------------------------- |
| `'not found'`              | 404 Not Found     | `{ success: false, error: <error.message> }`          |
| `'already exists'`         | 409 Conflict      | `{ success: false, error: <error.message> }`          |
| `'must be'`                | 400 Bad Request   | `{ success: false, error: <error.message> }`          |

DELETE additionally has **one** message-pattern catch
branch BEFORE the outer catch:

| Pattern in `error.message` | Status            | Envelope                                              |
| -------------------------- | ----------------- | ----------------------------------------------------- |
| `'not found'`              | 404 Not Found     | `{ success: false, error: <error.message> }`          |

## Cross-route triple-method comparison

This is the **second** triple-method admin-tree smoke,
and the **first** with a query-parameter-driven branch.

| Route                                            | Methods exported             | Gate                                        | 401 envelope                                                                | DELETE branch on query? |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| `/api/admin/categories/{id}` (this spec)         | **`GET` + `PUT` + `DELETE`** | Inline `!session?.user?.isAdmin`            | Canonical `{ success: false, error: 'Unauthorized. Admin access required.' }` | **Yes — `?hard=true` flips service call and success message** |
| `/api/admin/items/{id}`                          | `GET` + `PUT` + `DELETE`     | Inline `!session?.user?.isAdmin`            | Canonical                                                                   | No                      |
| `/api/admin/roles/{id}/permissions`              | `GET` + `PUT`                | `checkAdminAuth()` helper                   | Hybrid `{ success: false, error: 'Unauthorized' }`                          | n/a                     |
| `/api/admin/collections/{id}/items`              | `GET` + `POST`               | Inline `!session?.user?.isAdmin`            | Canonical                                                                   | n/a                     |
| `/api/admin/items/{id}/review`                   | `POST`                       | Inline `!session?.user?.isAdmin`            | Canonical                                                                   | n/a                     |
| `/api/admin/items/{id}/history`                  | `GET`                        | Inline `!session?.user?.isAdmin`            | Canonical                                                                   | n/a                     |
| `/api/admin/sponsor-ads/{id}/approve`            | `POST`                       | Compound `!isAdmin || !id`                  | Canonical                                                                   | n/a                     |
| `/api/admin/sponsor-ads/{id}/reject`             | `POST`                       | Compound `!isAdmin || !id`                  | Canonical                                                                   | n/a                     |
| `/api/admin/sponsor-ads/{id}/cancel`             | `POST`                       | Pure `!session?.user?.isAdmin`              | Canonical                                                                   | n/a                     |
| `/api/admin/notifications/{id}/read`             | `PATCH`                      | Two-step `!session?.user?.id` → `!tenantId` | Bare `{ error: 'Unauthorized' }` (no `success` key)                         | n/a                     |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT`, **one
DELETE query-permutation walk** across nine `?hard=…`
shapes, and a suite of **fifteen hand-written scenarios**
— together asserting both the `< 500` invariant on every
permutation and the per-handler 401-envelope contract on
the unauth branch.

| Block                                                                                                       | Purpose                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const id of CATEGORY_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                            | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                                                          |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                          | Bulk-loop walk of every plausible header shape (~20 headers) × three methods.                                                                                                                                  |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                                    | Bulk-loop walk of every plausible PUT body shape (~14 bodies, including `name` update probes for the `'must be'` and `'already exists'` branches, plus bypass attempts and a fabricated-`id`-in-body probe). |
| `for (const { query, label } of DELETE_QUERY_PERMUTATIONS) test('DELETE' …)`                                  | Bulk-loop walk of every plausible `?hard=…` query shape (~9 permutations covering both branches plus edge cases).                                                                                              |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                              | Pins the canonical longer 401 envelope for `GET`.                                                                                                                                                              |
| `test('PUT … returns 401 with the canonical longer Unauthorized envelope', …)`                              | Pins the canonical longer 401 envelope for `PUT`.                                                                                                                                                              |
| `test('DELETE … returns 401 with the canonical longer Unauthorized envelope', …)`                           | Pins the canonical longer 401 envelope for `DELETE`.                                                                                                                                                           |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`                    | Cross-method envelope-equality assertion: all three handlers return identical 401 envelopes.                                                                                                                  |
| `test('DELETE … 401 envelope is invariant to ?hard= permutations', …)`                                       | Pins the gate-before-query-parse order: all `?hard=…` shapes round-trip to the SAME 401 envelope as the no-query baseline.                                                                                     |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`                 | Negative-property assertion across all three methods (and across both DELETE query branches).                                                                                                                  |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`           | Pins the gate-before-post-auth order across seven post-auth messages (including BOTH DELETE success messages) and six candidate request shapes.                                                                |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                              | Pins the gate-before-params-resolution order across all three methods.                                                                                                                                         |
| `test('PUT … has a stable status across body permutations', …)`                                              | Seven body permutations vs the no-body baseline.                                                                                                                                                                |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                          | Side-channel walk across all three methods.                                                                                                                                                                    |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                                | Method-resolution walk: POST / PATCH against the route. The route exports only `GET`, `PUT`, `DELETE`.                                                                                                         |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                                | Pins the gate-before-body-parse order.                                                                                                                                                                         |
| `test('GET / PUT / DELETE … service call is NOT entered on the unauth branch', …)`                           | Pins the gate-before-service order across all four repository calls (`findById` / `update` / `delete` / `hardDelete`).                                                                                         |
| `test('PUT / DELETE … cache-invalidation side-effect is NOT entered on the unauth branch', …)`               | Pins the gate-before-side-effect order: `invalidateContentCaches()` runs on the success branch only, and the unauth branch must NOT echo `success: true` or any `message` field.                              |
| `test('GET / PUT / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)`        | Pins the per-handler catch-message divergence: a regression that swapped any of the three `safeErrorResponse(...)` messages would surface as the wrong message echoing on the auth branch.                     |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, every
   PUT body permutation, and every DELETE query
   permutation (~~6×3 + 20×3 + 14 + 9 = ~101 total)
   must round-trip to a `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** for each of `GET`, `PUT`, and `DELETE` —
   exact match.
3. **Cross-method envelope equality** — all three
   handlers must emit byte-identical 401 envelopes on
   the unauth branch.
4. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
5. **DELETE-query envelope invariance** — every
   `?hard=…` permutation must produce the SAME 401
   envelope as the no-query baseline.
6. **Success-branch-key non-disclosure** across all
   three methods — no `data`, `message`, or
   `success: true` must appear in any unauth response,
   including responses to the `?hard=true` DELETE
   branch.
7. **Gate-before-post-auth invariant** — none of
   `'Category not found'`, `'Failed to fetch category'`,
   `'Failed to update category'`, `'Failed to delete
   category'`, `'Category updated successfully'`,
   `'Category deactivated successfully'`, `'Category
   permanently deleted'` must appear in any unauth
   response.
8. **Status invariance across distinct id shapes** for
   each of the three methods.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation** across all three
    methods.
11. **Cross-method invariance** — `POST` and `PATCH`
    against the route round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant** — malformed
    JSON bodies must NOT 400 with a parse error before
    the gate fires (the PUT body parse is NOT wrapped
    in a per-call try/catch, so a malformed body would
    actually 500 via the outer `safeErrorResponse(...)`
    catch on the auth branch).
13. **Gate-before-service invariant** across all four
    repository calls (`findById` / `update` / `delete`
    / `hardDelete`).
14. **Gate-before-side-effect invariant** — the
    `invalidateContentCaches()` call runs on the
    success branch only; the unauth branch must NOT
    surface a `success: true` envelope or a `message`
    field for either PUT or DELETE (across both DELETE
    query branches).
15. **Per-handler catch-message divergence** — a
    regression that swapped any of the three
    `safeErrorResponse(...)` messages would surface as
    the wrong message echoing on the auth branch; the
    unauth branch must NOT echo any of the three.

## See also

- [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)
  — the **first** triple-method admin-tree smoke (no
  query branch, no cache-invalidation side-effect).
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
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md),
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md),
  and
  [`admin-collections-id-items-method-spec.md`](admin-collections-id-items-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-category CRUD route
  sits inside.
