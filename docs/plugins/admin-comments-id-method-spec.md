---
id: admin-comments-id-method-spec
title: E2E Admin Comments [id] Method Spec (apps/web-e2e/tests/api/admin-comments-id-method.spec.ts)
sidebar_label: E2E Admin Comments [id] Method Spec
sidebar_position: 531
---

# E2E Admin Comments [id] Method Spec — `apps/web-e2e/tests/api/admin-comments-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-comment CRUD GET / PUT / DELETE method /
id / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-comments-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-comments-id-method.spec.ts).

This is the **first 403-on-unauth triple-method admin-
tree smoke** the docs tree publishes — every prior triple-
method admin smoke returns 401 on the unauth branch; the
sibling `admin/reports/[id]` 403-on-unauth route is dual-
method (GET + PUT). The comments-CRUD route is the **first
triple-method route** with the 403 posture.

## Why this spec is the 403-on-unauth triple-method smoke

The route under test
([`apps/web/app/api/admin/comments/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/comments/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME single-step inline
`!session?.user?.isAdmin` gate that returns **403
`{ success: false, error: 'Forbidden' }`** on the unauth
branch — matching the dual-method
`admin/reports/[id]` posture. They also share the SAME
`{ success: false, error: ... }` envelope shape and the
SAME `console.error('Failed to <verb> comment:', error)` +
500 `'Internal Server Error'` catch posture (with handler-
specific log prefixes).

Each handler also has its own divergent post-gate surface:

| Handler  | Tenant-resolution branch                                          | Existence check                                                | Body parse                              | Validation                          | Service call                                        | Side effects | Success-payload shape                                                            |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- | ----------------------------------- | --------------------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| `GET`    | `getTenantId()` AFTER `await params` → 403 `'Tenant not found'` | Inline Drizzle query with `leftJoin` to `clientProfiles`, returning 404 `'Comment not found'` if `result.length === 0 || result[0].createdAt === null` | None                                    | None                                | Inline Drizzle query (no service-class abstraction) | None         | `{ success: true, data: <comment-with-user> }`                                    |
| `PUT`    | `getTenantId()` BEFORE `await params` → 403 `'Tenant not found'` (NOTE: ordering distinct from GET) | `getCommentById(id)` → 404 if `existingComment.deletedAt` (soft-delete-aware) | `await request.json()` AFTER tenant resolution | `content?.trim()` → 400 `'Content is required'` if falsy | Inline Drizzle re-query (the actual `updateComment` call is **commented out** in the source — the route currently re-fetches the comment without updating it; a regression-sensitive note) | None         | `{ success: true, data: <comment-with-user>, message: 'Comment updated successfully' }` |
| `DELETE` | **NO `getTenantId()` call** (distinct from GET / PUT)             | `getCommentById(id)` → 404 if `comment.deletedAt`              | None                                    | None                                | `deleteComment(id)` (soft delete via setting `deletedAt`) | None         | `{ success: true, message: 'Comment deleted successfully' }` (NO `data` key)      |

## Cross-route 403-on-unauth comparison

This is the **first** 403-on-unauth triple-method admin
smoke. The dual-method `admin/reports/[id]` is the only
prior 403 admin route.

| Route                                          | Methods          | Unauth status | Pre-gate                          | Tenant-resolution branch                                         | Service-layer abstraction        |
| ---------------------------------------------- | ---------------- | ------------- | --------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `/api/admin/comments/{id}` (this spec)         | `GET` + `PUT` + `DELETE` | **403**       | None                              | `getTenantId()` post-gate (GET, PUT only — NOT DELETE)           | Inline Drizzle queries           |
| `/api/admin/reports/{id}`                      | `GET` + `PUT`    | **403**       | `checkDatabaseAvailability()`     | None                                                             | Direct query functions           |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | 401           | None                              | None                                                             | `ItemRepository` class           |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | 401           | None                              | None                                                             | Direct query functions           |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | 401           | None                              | None                                                             | `UserRepository` + `RoleRepository` classes |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | 401           | None                              | None                                                             | `categoryRepository` class       |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT`, and a suite
of **fifteen hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of COMMENT_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                       | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                    | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                              | Bulk-loop walk of every plausible PUT body shape (~12 bodies, including content-trim probes for empty / whitespace / null content).                                  |
| `test('GET … returns 403 with the Forbidden envelope (NOT 401)', …)`                                   | Pins the 403 envelope for `GET` and the divergence vs the 401 of every prior triple-method admin smoke.                                                              |
| `test('PUT … returns 403 with the Forbidden envelope (NOT 401)', …)`                                   | Pins the 403 envelope for `PUT`.                                                                                                                                      |
| `test('DELETE … returns 403 with the Forbidden envelope (NOT 401)', …)`                                | Pins the 403 envelope for `DELETE`.                                                                                                                                   |
| `test('GET / PUT / DELETE … unauth response is NEVER 401', …)`                                         | Pins the divergence: the unauth client lands on 403 across all three methods. A regression that "fixed" any handler to return 401 would surface here.                |
| `test('GET / PUT / DELETE … envelope shape has exactly success and error keys', …)`                    | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 403 envelope shape on the unauth branch', …)`               | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`           | Negative-property assertion across all three methods.                                                                                                                |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`     | Pins the gate-before-post-auth order across six candidate messages.                                                                                                  |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                        | Pins the gate-before-params-resolution order across all three methods.                                                                                              |
| `test('PUT … has a stable status across body permutations', …)`                                        | Five body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                    | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                          | Method-resolution walk: POST / PATCH against the route round-trip to `< 500`.                                                                                        |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service / Drizzle query is NOT entered on the unauth branch', …)`          | Pins the gate-before-service order across the inline Drizzle queries plus `getCommentById(...)` / `deleteComment(...)` / `getTenantId()` calls.                       |
| `test('GET / PUT … tenant-resolution branch is NOT entered on the unauth branch', …)`                  | Pins the gate-before-tenant-resolution order: the unauth response must NEVER echo `'Tenant not found'`. Distinct from DELETE which has no tenant-resolution branch.  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation (~~6×3 + 17×3 + 12 = ~81
   total) must round-trip to a `< 500` status.
2. **403 `Forbidden` envelope on the unauth branch**
   for each of `GET`, `PUT`, and `DELETE` — exact match.
3. **NEVER-401 invariant** across all three methods.
4. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
5. **Cross-method envelope equality**.
6. **Success-branch-key non-disclosure** across all
   three methods.
7. **Gate-before-post-auth invariant** — none of the
   six post-auth messages (`'Tenant not found'`,
   `'Comment not found'`, `'Content is required'`,
   `'Internal Server Error'`, `'Comment updated
   successfully'`, `'Comment deleted successfully'`)
   must appear in any unauth response.
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation**.
11. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant**.
13. **Gate-before-service invariant** across the
    inline Drizzle queries plus
    `getCommentById(...)` / `deleteComment(...)` /
    `getTenantId()` calls.
14. **Gate-before-tenant-resolution invariant** — the
    unauth response must NEVER echo `'Tenant not
    found'` (the tenant-resolution branch is
    unreachable on the unauth branch for both GET and
    PUT; DELETE has no tenant-resolution branch).

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the dual-method 403-on-unauth
  [`admin-reports-id-method-spec.md`](admin-reports-id-method-spec.md),
  the GET + DELETE-only dual-method
  [`admin-sponsor-ads-id-method-spec.md`](admin-sponsor-ads-id-method-spec.md),
  and the canonical-longer-envelope triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-comment CRUD
  route sits inside.
