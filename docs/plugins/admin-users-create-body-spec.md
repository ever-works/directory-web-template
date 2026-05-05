---
id: admin-users-create-body-spec
title: E2E Admin Users Create Body Spec (apps/web-e2e/tests/api/admin-users-create-body.spec.ts)
sidebar_label: E2E Admin Users Create Body Spec
sidebar_position: 538
---

# E2E Admin Users Create Body Spec — `apps/web-e2e/tests/api/admin-users-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level user-create POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-users-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines the **two-
step gate** envelope with an **eight-step body validation
chain** including username regex, password-Zod-`safeParse`,
and a role-DB-lookup. The companion
[`admin-users-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-query.spec.ts)
covers the GET (paginated list) surface of the same route.

## Why this spec is the eight-step-validation collection-level POST smoke

The route under test
([`apps/web/app/api/admin/users/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Two-step gate** — `!session?.user` → 401
   `{ success: false, error: 'Unauthorized' }`, then
   `!session.user.isAdmin` → 403
   `{ success: false, error: 'Forbidden' }`.
2. **Hybrid 401 envelope** with strict envelope-shape
   preservation
   `Object.keys(body).sort() === ['error', 'success']`.
3. **JSON body parse via `await request.json()`** AFTER
   both gate steps. NOT wrapped in a per-call try/catch.
4. **Eight-step body validation chain**:
   - (a) **Object-shape**: `if (!body || typeof body
     !== 'object')` → 400 `'Invalid request body'`.
   - (b) **Five-field required-fields**: `if
     (!body.username || !body.email || !body.name ||
     !body.password || !body.role)` → 400 `'Missing
     required fields: username, email, name, password,
     and role are required'`.
   - (c) **Email format**: `isValidEmail(body.email)` →
     400 `'Invalid email format'`.
   - (d) **Username regex**:
     `/^[a-zA-Z0-9_-]{3,30}$/.test(body.username)` →
     400 `'Username must be 3-30 characters and
     contain only letters, numbers, dashes, and
     underscores'`. The **first** regex-based username
     validation in admin smoke.
   - (e) **Name length**: `body.name.trim().length < 2
     || > 100` → 400 `'Name must be between 2 and 100
     characters'`.
   - (f) **Password Zod schema**:
     `passwordSchema.safeParse(body.password)` → 400
     with **dynamically-interpolated**
     `passwordResult.error.issues[0]?.message ??
     'Invalid password'`. Distinct from prior smokes
     that use Zod for the body-as-a-whole.
   - (g) **Title length**: type + length cap (100).
   - (h) **Avatar length**: type + length cap (500).
   - (i) **Role DB lookup**: `roleRepository.findById(
     body.role)` → 400 `'Invalid role'` if not found.
5. **`userRepository.create(...)` call** AFTER all
   validation steps pass. Trims/lowercases inputs.
6. **`error.message`-pass-through outer catch** —
   `error instanceof Error` → 400 `{ success: false,
   error: error.message }`, else 500 `'Internal server
   error'`. Matches the `admin/users/[id]` PUT/DELETE
   catch posture.
7. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Cross-route POST validation comparison

| Route                                          | Validation steps                                                                 | Validation strategy                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/admin/users` (this spec)            | **Eight steps** (object / 5-required / email / username-regex / name / pwd-Zod / title / avatar / role-DB-lookup) | Manual + Zod `safeParse` on password only + DB lookup on role             |
| `POST /api/admin/items`                        | Two steps (5-required-in-single-guard + 2 dynamic 409 dup checks)                | Manual + DB checks                                                         |
| `POST /api/admin/collections`                  | One step (2-required-in-single-guard)                                            | Manual + repository throws on duplicates                                   |
| `POST /api/admin/items/{id}/review`            | One step (status enum allowlist)                                                 | Manual                                                                     |
| `POST /api/admin/items/import`                 | Two steps (rows array + options object)                                          | Manual                                                                     |
| `POST /api/admin/items/import/validate`        | Five steps (file / type / size / mapping JSON / data rows)                       | Manual on multipart                                                        |
| `POST /api/admin/items/bulk`                   | Six steps                                                                        | Manual                                                                     |
| `POST /api/admin/sponsor-ads/{id}/approve`     | One soft-step (forceApprove flag default-false)                                  | Manual                                                                     |
| `POST /api/admin/sponsor-ads/{id}/reject`      | Zod `safeParse` on whole body (rejectionReason required)                         | Zod                                                                       |
| `POST /api/admin/sponsor-ads/{id}/cancel`      | Zod `safeParse` on whole body (cancelReason optional)                            | Zod                                                                       |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~32
bodies covering all eight validation steps + bypass
shapes) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_USERS_CREATE_HEADERS) test(…)`                             | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_USERS_CREATE_BODIES) test(…)`                                 | Bulk-loop walk of every plausible body shape (~32 bodies covering all eight validation steps plus bypass shapes).                                                    |
| `test('… returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope.                                                                                                                                        |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… unauth branch lands on 401 (NOT 403)', …)`                                                | Pins the FIRST gate step fires (the response is 401 not 403, and must NEVER echo `'Forbidden'`).                                                                     |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `user`, `id`, `success: true` must NOT appear; status must NOT be 201.                                                          |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across thirteen post-auth messages.                                                                                              |
| `test('… has a stable status across header / body permutations', …)`                               | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… eight-step body validation chain is NOT entered on the unauth branch', …)`                | Pins the gate-before-eight-step-validation order: every step-(a)-(i) probe round-trips to the same 401 status.                                                       |
| `test('… role DB-lookup is NOT entered on the unauth branch', …)`                                  | Pins the gate-before-role-DB-lookup order: the unauth response must NEVER echo `'Invalid role'`.                                                                     |
| `test('… create call is NOT entered on the unauth branch', …)`                                     | Pins the gate-before-create-call order: the unauth response status must NOT be 201 and must NOT echo a `data` key.                                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~50 total) must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** —
   exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Unauth-lands-on-401-not-403 invariant**.
5. **Success-branch-key non-disclosure** — `data`,
   `user`, `id`, `success: true` keys plus the 201
   status must NOT appear in any unauth response.
6. **Gate-before-post-auth invariant** — none of the
   thirteen post-auth messages must appear in any
   unauth response.
7. **Status invariance across header / body
   permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — `PUT` / `PATCH` /
   `DELETE` round-trip to a `< 500` status.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-eight-step-validation invariant** —
    every step-(a)-(i) probe must round-trip to the
    same 401 status.
12. **Gate-before-role-DB-lookup invariant** — the
    unauth response must NEVER echo `'Invalid role'`.
13. **Gate-before-create-call invariant** — the
    `userRepository.create(...)` call is NOT entered
    on the unauth branch.

## See also

- The companion query-surface spec
  [`admin-users-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[id]`
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md)
  triple-method spec covering the same eight-step
  validation pattern on PUT updates, the collection-
  level POST companion
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md),
  and the body-validation single-method
  [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md)
  /
  [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the users collection route
  sits inside.
