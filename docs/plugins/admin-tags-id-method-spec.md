---
id: admin-tags-id-method-spec
title: E2E Admin Tags [id] Method Spec (apps/web-e2e/tests/api/admin-tags-id-method.spec.ts)
sidebar_label: E2E Admin Tags [id] Method Spec
sidebar_position: 535
---

# E2E Admin Tags [id] Method Spec — `apps/web-e2e/tests/api/admin-tags-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-tag CRUD GET / PUT / DELETE method / id /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-tags-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-id-method.spec.ts).

This is the **first triple-method admin-tree smoke** the
docs tree publishes that combines the **hybrid bare-
`Unauthorized` + `success: false` 401 envelope** (matching
`admin/users/[id]`, `admin/featured-items/[id]`,
`admin/roles/[id]/permissions`) with a **single-step
inline `!session?.user?.isAdmin` gate** AND a **PUT
outer-catch three-branch `error.message.includes(...)`
chain** that maps `'not found'` → 404, `'already exists'`
→ 409, `'required' | 'must be'` → 400 (each echoing the
raw `error.message`).

## Why this spec is the hybrid-envelope-with-3-branch-catch smoke

The route under test
([`apps/web/app/api/admin/tags/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/tags/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME single-step inline
`!session?.user?.isAdmin` gate that returns **401
`{ success: false, error: 'Unauthorized' }`** (the bare-
`Unauthorized` message PLUS `success: false` envelope key
— matching `admin/users/[id]` and
`admin/featured-items/[id]`), and the SAME `console.error`
+ 500 catch posture (with handler-specific messages
`'Failed to fetch\|update\|delete tag'`).

Each handler diverges on its post-gate surface:

| Handler  | Body parse                              | Validation                                              | Service call                                | Side effects                          | Catch chain                                                                                                                          | Success-payload shape                                                            |
| -------- | --------------------------------------- | ------------------------------------------------------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `GET`    | None                                    | None                                                    | `tagRepository.findById(id)` → 404 `'Tag not found'` | None                                  | `console.error` + 500 `'Failed to fetch tag'`                                                                                         | `{ success: true, data: <tag> }`                                                  |
| `PUT`    | `await request.json()` AFTER the gate   | `if (!name)` → 400 `'Tag name is required'`             | `tagRepository.update(id, { name, isActive })` | `await invalidateContentCaches()`     | **Three-branch chain**: `error.message.includes('not found')` → 404 echoing `error.message`; `'already exists'` → 409; `'required' \| 'must be'` → 400; else `console.error` + 500 `'Failed to update tag'` | `{ success: true, data: <tag>, message: 'Tag updated successfully' }`             |
| `DELETE` | None                                    | None                                                    | `tagRepository.delete(id)`                  | `await invalidateContentCaches()`     | **Single-branch chain**: `error.message.includes('not found')` → 404 echoing `error.message`; else `console.error` + 500 `'Failed to delete tag'`                                                          | `{ success: true, message: 'Tag deleted successfully' }` (NO `data` key)          |

## Cross-route triple-method comparison

| Route                                          | Methods                  | 401 envelope                                                     | PUT outer-catch chain                                                                                              |
| ---------------------------------------------- | ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/api/admin/tags/{id}` (this spec)             | `GET` + `PUT` + `DELETE` | Hybrid `{ success: false, error: 'Unauthorized' }`               | Three-branch `'not found'` / `'already exists'` / `'required'\|'must be'` chain                                     |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | Canonical longer                                                 | Three-branch `'not found'` / `'already exists'` / `'must be'` chain (same flavor, different envelope)                |
| `/api/admin/companies/{id}`                    | `GET` + `PUT` + `DELETE` | Bare `{ error: 'Unauthorized' }`                                 | Three-branch unique-constraint chain mapping DB messages to fixed 409 envelopes                                      |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Canonical longer                                                 | `safeErrorResponse(...)` only                                                                                        |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Bare                                                             | `console.error` + bare 500 only                                                                                      |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | Hybrid                                                           | `error.message`-pass-through (any `Error` instance → 400 with raw message)                                           |
| `/api/admin/comments/{id}`                     | `GET` + `PUT` + `DELETE` | 403                                                              | `console.error` + 500 only                                                                                           |
| `/api/admin/featured-items/{id}`               | `GET` + `PUT` + `DELETE` | Hybrid                                                           | `console.error` + 500 only                                                                                           |
| `/api/admin/collections/{id}`                  | `GET` + `PUT` + `DELETE` | Canonical longer                                                 | Two-branch `'already exists'` / `'must'` + `safeErrorResponse(...)` fallback                                          |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~14 PUT
bodies covering name validation / isActive flag / bypass
shapes), and a suite of **fifteen hand-written scenarios**.

| Block                                                                                          | Purpose                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of TAG_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                   | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`            | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                      | Bulk-loop walk of every plausible PUT body shape (~14 bodies covering valid name / empty name / null name / 1-char name / 51-char name / isActive=true / isActive=false / bypass shapes). |
| `test('GET … returns 401 with the hybrid bare-message + success: false envelope', …)`         | Pins the hybrid 401 envelope for `GET`.                                                                                                                              |
| `test('PUT … returns 401 with the hybrid bare-message + success: false envelope', …)`         | Pins the hybrid 401 envelope for `PUT`.                                                                                                                              |
| `test('DELETE … returns 401 with the hybrid bare-message + success: false envelope', …)`      | Pins the hybrid 401 envelope for `DELETE`.                                                                                                                           |
| `test('GET / PUT / DELETE … envelope shape has exactly success and error keys', …)`            | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`       | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`   | Negative-property assertion.                                                                                                                                          |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)` | Pins the gate-before-post-auth order across seven candidate messages.                                                                                                |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`            | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                  | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                  | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service / repository call is NOT entered on the unauth branch', …)` | Pins the gate-before-service order.                                                                                                                                  |
| `test('PUT / DELETE … cache-invalidation side-effect is NOT entered on the unauth branch', …)` | Pins the gate-before-cache-invalidation order: the unauth response must NEVER echo `'Tag updated successfully'` or `'Tag deleted successfully'`.                     |
| `test('PUT … three-branch catch chain is NOT entered on the unauth branch', …)`                | Pins the gate-before-three-branch-catch order: the unauth response must echo the canonical hybrid envelope, NOT any branch of the 404 / 409 / 400 catch chain.      |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** for
   each of `GET`, `PUT`, and `DELETE` — exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Cross-method envelope equality**.
5. **Success-branch-key non-disclosure**.
6. **Gate-before-post-auth invariant** — none of
   `'Tag not found'`, `'Tag name is required'`,
   `'Failed to fetch tag'`, `'Failed to update tag'`,
   `'Failed to delete tag'`, `'Tag updated
   successfully'`, `'Tag deleted successfully'` must
   appear in any unauth response.
7. **Status invariance across distinct id shapes**.
8. **Status invariance across PUT body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-service invariant** across the
    `tagRepository.findById` / `tagRepository.update`
    / `tagRepository.delete` calls.
13. **Gate-before-cache-invalidation invariant** — the
    `await invalidateContentCaches()` side effect on
    the PUT and DELETE success branches is unreachable
    on the unauth branch.
14. **Gate-before-three-branch-catch invariant** — the
    PUT outer-catch's `error.message.includes(...)`
    branches are unreachable on the unauth branch.

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
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md),
  the categories-CRUD triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md),
  the 403-on-unauth triple-method
  [`admin-comments-id-method-spec.md`](admin-comments-id-method-spec.md),
  the Zod-`parse()`-with-`details`-envelope triple-method
  [`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md),
  and the Zod-`safeParse(...)`-with-`flatten()`-envelope
  triple-method
  [`admin-collections-id-method-spec.md`](admin-collections-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-tag CRUD route
  sits inside.
