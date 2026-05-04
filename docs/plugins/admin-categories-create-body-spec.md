---
id: admin-categories-create-body-spec
title: E2E Admin Categories Create Body Spec (apps/web-e2e/tests/api/admin-categories-create-body.spec.ts)
sidebar_label: E2E Admin Categories Create Body Spec
sidebar_position: 539
---

# E2E Admin Categories Create Body Spec — `apps/web-e2e/tests/api/admin-categories-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level category-create POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-categories-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that uses a **`category`
success-payload key (NOT `data`)** plus a **single-field
required validation** plus a **three-branch outer catch
chain**. The companion
[`admin-categories-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-query.spec.ts)
covers the GET (paginated list) surface of the same
route.

## Why this spec is the `category`-key collection-level POST smoke

The route under test
([`apps/web/app/api/admin/categories/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin`
   gate** → 401
   `{ success: false, error: 'Unauthorized. Admin
   access required.' }`.
2. **Canonical longer 401 envelope** with strict
   envelope-shape preservation
   `Object.keys(body).sort() === ['error', 'success']`.
3. **JSON body parse via `await request.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch.
4. **Single-field required check** — `if
   (!createData.name)` → 400 `'Category name is
   required'`. Distinct from the multi-field required-
   validation chains of `admin/items` POST (5 fields),
   `admin/users` POST (5 fields), and
   `admin/collections` POST (2 fields).
5. **`categoryRepository.create(...)` call** AFTER the
   required-field check. The repository may throw
   `'... already exists'` or `'must be'` errors that
   the outer catch translates.
6. **`await invalidateContentCaches()`** side effect on
   the success branch.
7. **Three-branch outer catch chain**:
   - (a) `error.message.includes('already exists')` →
     409 echoing raw `error.message`.
   - (b) `error.message.includes('must be')` → 400
     echoing raw `error.message`.
   - (c) `safeErrorResponse(error, 'Failed to create
     category')` fallback.
   Distinct from the `admin/users` POST
   `error.message`-pass-through catch (which always
   returns 400 for `Error` instances).
8. **Success payload** with **`category` success-key
   (NOT `data`)** — `{ success: true, category:
   <category>, message: 'Category created
   successfully' }` with status 201. Matches the
   sibling `admin/collections` POST which uses
   `collection` (not `data`).
9. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Cross-route POST success-key comparison

| Route                                          | Success-payload top-level key(s)                                                | Status code |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| `POST /api/admin/categories` (this spec)       | `category` (NOT `data`) + `message`                                              | **201**     |
| `POST /api/admin/collections`                  | `collection` (NOT `data`) + `message`                                            | **201**     |
| `POST /api/admin/items`                        | `data` (the new item)                                                            | **201**     |
| `POST /api/admin/users`                        | `data` (the new user)                                                            | **201**     |
| `POST /api/admin/items/{id}/review`            | `data: <item>` + `message`                                                       | 200          |
| `POST /api/admin/items/import`                 | `result: ImportExecutionResult`                                                  | 200          |
| `POST /api/admin/items/import/validate`        | `headers, suggestedMapping, validationResults, summary`                          | 200          |
| `POST /api/admin/items/bulk`                   | (delegates to bulk service)                                                      | 200          |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~13
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_CATEGORIES_CREATE_HEADERS) test(…)`                        | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_CATEGORIES_CREATE_BODIES) test(…)`                            | Bulk-loop walk of every plausible body shape (~13 bodies covering missing-name probes, valid bodies, length-edge probes that would trigger repository errors, plus bypass shapes). |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope.                                                                                                                              |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `category`, `data`, `message`, `success: true` must NOT appear; status must NOT be 201.                                                  |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate static messages.                                                                                         |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-field check is NOT entered on the unauth branch', …)`                            | Pins the gate-before-required-field-check order: the unauth response must NEVER echo `'Category name is required'`.                                                  |
| `test('… create call + cache invalidation are NOT entered on the unauth branch', …)`               | Pins the gate-before-create-call order: the unauth response status must NOT be 201, must NOT contain a `category` key, and must NOT echo `'Category created successfully'`. |
| `test('… three-branch outer catch is NOT entered on the unauth branch', …)`                        | Pins the gate-before-outer-catch order: the unauth response must echo the canonical 401 envelope, not any branch of the outer catch chain.                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~30 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — exact match
   `{ success: false, error: 'Unauthorized. Admin
   access required.' }`.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — the
   `category`, `data`, `message` keys plus
   `success: true` and the 201 status must NOT
   appear in any unauth response.
5. **Gate-before-post-auth invariant** — none of the
   three static post-auth messages must appear in
   any unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — `PUT` / `PATCH` /
   `DELETE` round-trip to a `< 500` status.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-check invariant**.
11. **Gate-before-create-call invariant** — the
    `categoryRepository.create(...)` call and the
    cache invalidation are NOT entered on the unauth
    branch.
12. **Gate-before-outer-catch invariant** — the
    unauth response must echo the canonical 401
    envelope, not any branch of the three-branch
    outer catch chain.

## See also

- The companion query-surface spec
  [`admin-categories-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[id]` triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md)
  spec covering the same three-branch
  `error.message.includes(...)` outer catch on PUT
  updates, the collection-level POST companions
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md)
  and
  [`admin-users-create-body-spec.md`](admin-users-create-body-spec.md),
  and the body-validation single-method
  [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the categories collection
  route sits inside.
