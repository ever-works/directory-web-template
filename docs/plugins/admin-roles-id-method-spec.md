---
id: admin-roles-id-method-spec
title: E2E Admin Roles [id] Method Spec (apps/web-e2e/tests/api/admin-roles-id-method.spec.ts)
sidebar_label: E2E Admin Roles [id] Method Spec
sidebar_position: 536
---

# E2E Admin Roles [id] Method Spec — `apps/web-e2e/tests/api/admin-roles-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-role CRUD GET / PUT / DELETE method / id /
body / query / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-roles-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-id-method.spec.ts).

This is the **first triple-method admin-tree smoke** the
docs tree publishes that combines the **two-step
`!session?.user` → `!session.user.isAdmin` gate** with a
**DELETE `?hard=true` query-parameter branch** AND a
**three-step manual PUT body validation** with FIXED error
messages.

## Why this spec is the two-step-gate-with-DELETE-?hard query smoke

The route under test
([`apps/web/app/api/admin/roles/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share a **two-step gate** that returns 401
`{ success: false, error: 'Unauthorized' }` for unauth and
403 `{ success: false, error: 'Forbidden' }` for
authenticated-non-admin sessions. The unauth client lacks
any session, so the FIRST step always fires.

Each handler diverges on its post-gate surface:

| Handler  | Body parse                              | Validation                                                                           | Service call                                                | Success-payload shape                                                            |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET`    | None                                    | None                                                                                 | `roleRepository.findById(id)` → 404 `'Role not found'` if missing | `{ success: true, data: <role> }`                                                |
| `PUT`    | `await request.json()` AFTER both gate steps | **Existence check AFTER body parse** (`roleRepository.findById(id)` → 404), then **three-step manual chain**: (a) `'Role name cannot be empty'` on `!updateData.name.trim()`; (b) `'Role name must be between 3 and 100 characters'` on length out-of-range; (c) `'Role description must be at most 500 characters'` on description > 500 | `roleRepository.update(id, ...)`                            | `{ success: true, data: <role>, message: 'Role updated successfully' }`           |
| `DELETE` | None                                    | `searchParams.get('hard') === 'true'` query parse AFTER both gate steps; existence check via `roleRepository.findById(id)` → 404 | Branches on `hardDelete` boolean: `hardDelete === true` → `roleRepository.hardDelete(id)`; else `roleRepository.delete(id)` | `{ success: true, message: 'Role permanently deleted' }` for `hard === true` else `{ success: true, message: 'Role deleted (marked as inactive)' }` (NO `data` key) |

## Cross-route triple-method comparison

| Route                                          | Methods                  | Gate                                                              | DELETE `?hard=true` branch | PUT validation strategy                                                    |
| ---------------------------------------------- | ------------------------ | ----------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `/api/admin/roles/{id}` (this spec)            | `GET` + `PUT` + `DELETE` | Two-step `!session?.user` → `!session.user.isAdmin`               | YES                        | Three-step manual chain with FIXED messages                                 |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | YES                        | Manual + `error.message.includes(...)` 3-branch outer catch                 |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | Two-step `!session?.user` → `!session.user.isAdmin`               | NO                         | Eight-step manual chain                                                     |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | NO                         | None (body forwarded to repository)                                          |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | NO                         | None (body forwarded to query function)                                      |
| `/api/admin/comments/{id}`                     | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin` (returns 403)               | NO                         | Inline content-trim only                                                     |
| `/api/admin/companies/{id}`                    | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | NO                         | Zod `parse()` (THROWS) with `details: ZodError.issues` 400 envelope          |
| `/api/admin/featured-items/{id}`               | `GET` + `PUT` + `DELETE` | Two-step `!session?.user?.id` → `!tenantId` (NO `isAdmin` check)  | NO (soft-delete by default) | None (validation-less)                                                       |
| `/api/admin/tags/{id}`                         | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | NO                         | `if (!name)` + 3-branch `error.message.includes(...)` outer catch            |
| `/api/admin/collections/{id}`                  | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`                             | NO                         | Zod `safeParse(...).error.flatten()` 400 envelope                            |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~15 PUT
bodies), **one query-bulk-loop walk** for `DELETE` (~8
`?hard=...` query shapes), and a suite of **sixteen hand-
written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of ROLE_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                        | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                  | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                            | Bulk-loop walk of every plausible PUT body shape (~15 bodies covering all three validation steps plus status / isAdmin / bypass shapes).                            |
| `for (const { qs, label } of DELETE_QUERIES) test('DELETE' …)`                                       | Bulk-loop walk of every plausible `?hard=...` query shape (~8 queries covering true / false / TRUE uppercase / 1 numeric / empty / unrelated key / extra key).      |
| `test('GET … returns 401 with the hybrid bare-message + success: false envelope', …)`                | Pins the hybrid 401 envelope for `GET`.                                                                                                                              |
| `test('PUT … returns 401 with the hybrid bare-message + success: false envelope', …)`                | Pins the hybrid 401 envelope for `PUT`.                                                                                                                              |
| `test('DELETE … returns 401 with the hybrid bare-message + success: false envelope', …)`             | Pins the hybrid 401 envelope for `DELETE`.                                                                                                                           |
| `test('GET / PUT / DELETE … envelope shape has exactly success and error keys', …)`                  | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`             | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … unauth branch lands on 401 (NOT 403)', …)`                               | Pins the FIRST gate step fires (the response is 401 not 403, and must NEVER echo `'Forbidden'`).                                                                     |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`         | Negative-property assertion.                                                                                                                                          |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`   | Pins the gate-before-post-auth order across eleven candidate messages.                                                                                              |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                      | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                      | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('DELETE … has a stable status across distinct ?hard query shapes', …)`                         | Pins the gate-before-query-parse order: every `?hard=...` shape must round-trip to the same 401 status.                                                              |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                  | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                        | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                        | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service / repository call is NOT entered on the unauth branch', …)`      | Pins the gate-before-service order across all four repository calls.                                                                                                 |
| `test('PUT … three-step body validation chain is NOT evaluated on the unauth branch', …)`            | Pins the gate-before-three-step-validation order.                                                                                                                    |
| `test('DELETE … hard-delete branch is NOT entered on the unauth branch', …)`                         | Pins the gate-before-hard-delete-branch order: the unauth response must NEVER echo `'Role deleted (marked as inactive)'` or `'Role permanently deleted'`.            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation,
   every PUT body permutation, and every DELETE
   `?hard=...` query permutation must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** for
   each of `GET`, `PUT`, and `DELETE` — exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Cross-method envelope equality**.
5. **Unauth-lands-on-401-not-403 invariant** — the
   response must NEVER be 403 and must NEVER echo
   `'Forbidden'`.
6. **Success-branch-key non-disclosure**.
7. **Gate-before-post-auth invariant** — none of the
   eleven post-auth messages must appear in any
   unauth response (including the three PUT validation
   messages and both DELETE success messages).
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Status invariance across DELETE `?hard=...` query
    shapes**.
11. **Side-channel isolation**.
12. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
13. **Gate-before-body-parse invariant**.
14. **Gate-before-service invariant** across all four
    repository calls (`findById` / `update` / `delete`
    / `hardDelete`).
15. **Gate-before-three-step-validation invariant** —
    every step-(a)/(b)/(c) probe must round-trip to
    the same 401 status.
16. **Gate-before-hard-delete-branch invariant** — the
    unauth response must NEVER echo `'Role deleted
    (marked as inactive)'` or `'Role permanently
    deleted'`.

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the bare-envelope triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  the hybrid-envelope triple-method
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md)
  and
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md)
  and
  [`admin-tags-id-method-spec.md`](admin-tags-id-method-spec.md),
  the categories-CRUD triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md),
  the 403-on-unauth triple-method
  [`admin-comments-id-method-spec.md`](admin-comments-id-method-spec.md),
  the Zod-`parse()`-with-`details`-envelope triple-
  method
  [`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md),
  and the Zod-`safeParse(...)`-with-`flatten()`-envelope
  triple-method
  [`admin-collections-id-method-spec.md`](admin-collections-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-role CRUD route
  sits inside.
