---
id: admin-featured-items-id-method-spec
title: E2E Admin Featured Items [id] Method Spec (apps/web-e2e/tests/api/admin-featured-items-id-method.spec.ts)
sidebar_label: E2E Admin Featured Items [id] Method Spec
sidebar_position: 533
---

# E2E Admin Featured Items [id] Method Spec — `apps/web-e2e/tests/api/admin-featured-items-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-featured-item CRUD GET / PUT / DELETE
method / id / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-featured-items-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-featured-items-id-method.spec.ts).

This is the **first triple-method admin-tree smoke** the
docs tree publishes that combines a **non-admin gate**
(the route gates on `!session?.user?.id` rather than
`!session?.user?.isAdmin`, so any authenticated user with
a tenant can hit it — a Q-010b-style auth-gate-divergence
finding) with a **soft-delete DELETE** (sets `isActive:
false` rather than removing the row), a **validation-less
PUT** (seven body fields shoved straight into
`db.update(...)`), and a **two-step `!session?.user?.id`
→ `!tenantId` gate** envelope.

## Why this spec is the non-admin-gated triple-method smoke

The route under test
([`apps/web/app/api/admin/featured-items/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/featured-items/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share a **two-step gate** that only checks
authentication (`!session?.user?.id`) and tenant
(`!tenantId` via `getTenantId()`) — there is **no `isAdmin`
check anywhere**. Any authenticated user with a tenant can
hit any of the three handlers despite the route living
under the `admin/` namespace. This is a Q-010b-style auth-
gate-divergence finding: the route is effectively non-
admin-restricted today.

All three handlers also share:
1. **Two-step gate** — `!session?.user?.id` → 401
   `{ success: false, error: 'Unauthorized' }`, then
   `!tenantId` → 403
   `{ success: false, error: 'Tenant not found' }`. The
   unauth client lacks any session, so the FIRST step
   always fires.
2. **Hybrid `success: false` + bare-`Unauthorized`
   envelope** — matching `admin/users/[id]` and
   `admin/roles/[id]/permissions`. Distinct from the
   `admin/notifications/[id]/read` PATCH and
   `admin/comments/[id]` GET/PUT envelopes (which use a
   bare `{ error: ... }` envelope WITHOUT the `success`
   key on the 401 / 403 branches).
3. **Inline Drizzle queries** with tenant scoping
   (`and(eq(featuredItems.id, id),
   eq(featuredItems.tenantId, tenantId))`).
4. **`console.error` + 500 catch** with handler-specific
   messages (`'Failed to fetch\|update\|remove featured
   item'`).

Each handler diverges on its post-gate surface:

| Handler  | Body parse                              | Validation                                | Service call                                                                                                          | Success-payload shape                                                                  |
| -------- | --------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET`    | None                                    | None                                      | Inline Drizzle `select()` with tenant scoping; returns 404 `'Featured item not found'` if `result.length === 0`         | `{ success: true, data: <featured-item> }`                                              |
| `PUT`    | `await request.json()` AFTER tenant resolution | **NO body validation** — seven body fields destructured (`itemName`, `itemIconUrl`, `itemCategory`, `itemDescription`, `featuredOrder`, `featuredUntil`, `isActive`) and shoved straight into `db.update(...).set({...}).returning()`. Distinct from every prior validated PUT smoke. | Inline Drizzle `update().set({...})` with tenant scoping; returns 404 if `updatedItem.length === 0`                  | `{ success: true, data: <updatedItem>, message: 'Featured item updated successfully' }` |
| `DELETE` | None                                    | None                                      | **Soft delete** via inline Drizzle `update().set({ isActive: false, updatedAt: new Date() })` with tenant scoping; returns 404 if `updatedItem.length === 0`. Distinct from every prior admin DELETE smoke that actually removes the row. | `{ success: true, message: 'Featured item removed successfully' }` (NO `data` key)      |

## Cross-route triple-method comparison

| Route                                          | Methods                  | Gate                                        | DELETE strategy        |
| ---------------------------------------------- | ------------------------ | ------------------------------------------- | ---------------------- |
| `/api/admin/featured-items/{id}` (this spec)   | `GET` + `PUT` + `DELETE` | Two-step `!session?.user?.id` → `!tenantId` (NO `isAdmin` check) | **Soft delete** (sets `isActive: false`) |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`       | Hard delete (`itemRepository.delete(...)`) |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`       | Hard delete (`deleteClientProfile(...)`)   |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | Two-step `!session?.user` → `!session.user.isAdmin` | Hard delete (`userRepository.delete(...)`) |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`       | DELETE-`?hard=true` query branch toggles between soft (`delete`) and hard (`hardDelete`) |
| `/api/admin/comments/{id}`                     | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin` (returns 403) | Soft delete via `deleteComment(...)` |
| `/api/admin/companies/{id}`                    | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`       | Hard delete (`deleteCompany(...)`)         |

This is the **first** triple-method admin smoke where the
gate omits the `isAdmin` check entirely.

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~16 PUT
bodies covering all seven update fields plus bypass
shapes), and a suite of **fifteen hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of FEATURED_ITEM_IDS) test('GET' / 'PUT' / 'DELETE' …)`                               | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                  | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                            | Bulk-loop walk of every plausible PUT body shape (~16 bodies covering all seven update fields plus null clears, the ironic `isActive: false` PUT-soft-delete probe, and bypass shapes). |
| `test('GET … returns 401 with the bare-message + success: false envelope', …)`                       | Pins the hybrid 401 envelope for `GET`.                                                                                                                              |
| `test('PUT … returns 401 with the bare-message + success: false envelope', …)`                       | Pins the hybrid 401 envelope for `PUT`.                                                                                                                              |
| `test('DELETE … returns 401 with the bare-message + success: false envelope', …)`                    | Pins the hybrid 401 envelope for `DELETE`.                                                                                                                           |
| `test('GET / PUT / DELETE … envelope shape has exactly success and error keys', …)`                  | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`             | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`         | Negative-property assertion across all three methods.                                                                                                                |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`   | Pins the gate-before-post-auth order across seven candidate messages.                                                                                                |
| `test('GET / PUT / DELETE … unauth branch lands on 401 (NOT 403)', …)`                               | Pins the FIRST gate step fires for unauth clients (the response is 401 not 403, and must NEVER echo `'Tenant not found'`).                                          |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                      | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                      | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                  | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                        | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                        | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … Drizzle query is NOT entered on the unauth branch', …)`                  | Pins the gate-before-Drizzle-query order across all three handlers.                                                                                                  |
| `test('DELETE … soft-delete update is NOT entered on the unauth branch', …)`                         | Pins the gate-before-soft-delete order: the unauth response must NEVER echo `'Featured item removed successfully'`.                                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation must round-trip to a
   `< 500` status.
2. **Hybrid bare-message + `success: false` 401
   envelope** for each of `GET`, `PUT`, and `DELETE` —
   exact match `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Cross-method envelope equality**.
5. **Success-branch-key non-disclosure** across all
   three methods.
6. **Gate-before-post-auth invariant** — none of the
   seven post-auth messages must appear in any unauth
   response.
7. **Unauth-lands-on-401-not-403 invariant** — the
   FIRST gate step fires for unauth clients.
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation**.
11. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant**.
13. **Gate-before-Drizzle-query invariant** across all
    three handlers.
14. **Gate-before-soft-delete invariant** — the unauth
    response must NEVER echo `'Featured item removed
    successfully'`.

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the bare-envelope triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  the hybrid-envelope triple-method
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md),
  the categories-CRUD triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md),
  the 403-on-unauth triple-method
  [`admin-comments-id-method-spec.md`](admin-comments-id-method-spec.md),
  and the Zod-`parse()`-with-`details`-envelope triple-
  method
  [`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-featured-item CRUD
  route sits inside.
- [`docs/questions.md`](../questions.md) — the Q-010b
  auth-gate-divergence finding (this route is the
  fourth admin route the smoke layer documents as
  effectively non-admin-restricted today).
