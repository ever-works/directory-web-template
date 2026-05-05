---
id: admin-tags-create-body-spec
title: E2E Admin Tags Create Body Spec (apps/web-e2e/tests/api/admin-tags-create-body.spec.ts)
sidebar_label: E2E Admin Tags Create Body Spec
sidebar_position: 540
---

# E2E Admin Tags Create Body Spec — `apps/web-e2e/tests/api/admin-tags-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level tag-create POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-tags-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines the **hybrid
bare-`Unauthorized` + `success: false` 401 envelope** with
a **`tag` success-payload key** (NOT `data`) — distinct
from the canonical-longer-envelope `admin/categories` and
`admin/collections` POST smokes. The companion
[`admin-tags-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-query.spec.ts)
covers the GET (paginated list) surface of the same
route.

## Why this spec is the hybrid-envelope-with-`tag`-key collection-level POST smoke

The route under test
([`apps/web/app/api/admin/tags/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/tags/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin`
   gate** → 401
   `{ success: false, error: 'Unauthorized' }`
   (matching the `admin/tags/[id]` GET/PUT/DELETE
   smoke).
2. **Hybrid 401 envelope** with strict envelope-shape
   preservation
   `Object.keys(body).sort() === ['error', 'success']`.
3. **JSON body parse via `await request.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch.
4. **Two-field required check** — `if (!id || !name)`
   → 400 `'Tag ID and name are required'`. Distinct
   from the single-field `admin/categories` POST and
   from the multi-field chains of `admin/items` (5
   fields) and `admin/users` (8-step chain).
5. **`tagRepository.create({ id, name, isActive:
   isActive ?? true })` call** — defaults `isActive`
   to `true` if not provided. Distinct from prior POST
   smokes that don't default a boolean field.
6. **`await invalidateContentCaches()`** side effect on
   the success branch.
7. **Three-branch outer catch chain** matching the
   `admin/tags/[id]` PUT outer catch:
   - (a) `error.message.includes('already exists')` →
     409 echoing raw `error.message`.
   - (b) `error.message.includes('required' | 'must
     be')` → 400 echoing raw `error.message`.
   - (c) Else: 500 `'Failed to create tag'` (NOTE:
     this is a fixed-message fallback NOT
     `safeErrorResponse(...)` — distinct from the
     `admin/categories` POST which uses
     `safeErrorResponse(...)` as the fallback).
8. **Success payload** with **`tag` success-key (NOT
   `data`)** — `{ success: true, tag: <tag> }` with
   status 201. **NO `message` key** — distinct from
   `admin/categories` POST (which includes
   `'Category created successfully'`) and
   `admin/collections` POST (which includes
   `'Collection created successfully'`).
9. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Cross-route POST envelope/success-key matrix

| Route                                          | 401 envelope                                                | Success-key       | Success message              |
| ---------------------------------------------- | ----------------------------------------------------------- | ----------------- | ---------------------------- |
| `POST /api/admin/tags` (this spec)             | Hybrid `{ success: false, error: 'Unauthorized' }`           | `tag`             | NONE                          |
| `POST /api/admin/categories`                   | Canonical longer                                             | `category`        | `'Category created successfully'` |
| `POST /api/admin/collections`                  | Canonical longer                                             | `collection`      | `'Collection created successfully'` |
| `POST /api/admin/items`                        | Canonical longer                                             | `data`            | NONE (data is the item)       |
| `POST /api/admin/users`                        | Hybrid                                                       | `data`            | NONE (data is the user)       |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~13
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_TAGS_CREATE_HEADERS) test(…)`                              | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_TAGS_CREATE_BODIES) test(…)`                                  | Bulk-loop walk of every plausible body shape (~13 bodies covering missing-id / missing-name probes, valid bodies with isActive, plus bypass shapes).                 |
| `test('… returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope.                                                                                                                                        |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `tag`, `data`, `success: true` keys plus the 201 status must NOT appear in any unauth response.                                         |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across two candidate static messages.                                                                                          |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-field check is NOT entered on the unauth branch', …)`                            | Pins the gate-before-required-field-check order.                                                                                                                    |
| `test('… create call + cache invalidation are NOT entered on the unauth branch', …)`               | Pins the gate-before-create-call order: the unauth response status must NOT be 201, must NOT contain a `tag` key.                                                    |
| `test('… three-branch outer catch is NOT entered on the unauth branch', …)`                        | Pins the gate-before-outer-catch order: the unauth response must echo the canonical 401 envelope, not any branch of the outer catch chain (including the fixed-message 500 fallback). |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~30 total) must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** —
   exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — the `tag`,
   `data` keys plus `success: true` and the 201
   status must NOT appear in any unauth response.
5. **Gate-before-post-auth invariant** — none of the
   two static post-auth messages must appear in any
   unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-check invariant**.
11. **Gate-before-create-call invariant**.
12. **Gate-before-outer-catch invariant** — the
    unauth response must echo the canonical 401
    envelope, not any branch of the three-branch
    outer catch chain (including the fixed-message
    500 fallback).

## See also

- The companion query-surface spec
  [`admin-tags-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[id]` triple-method
  [`admin-tags-id-method-spec.md`](admin-tags-id-method-spec.md)
  spec covering the same hybrid envelope and three-
  branch outer catch on PUT updates, the collection-
  level POST companions
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md),
  [`admin-users-create-body-spec.md`](admin-users-create-body-spec.md),
  and
  [`admin-categories-create-body-spec.md`](admin-categories-create-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the tags collection route
  sits inside.
