---
id: admin-users-id-method-spec
title: E2E Admin Users [id] Method Spec (apps/web-e2e/tests/api/admin-users-id-method.spec.ts)
sidebar_label: E2E Admin Users [id] Method Spec
sidebar_position: 526
---

# E2E Admin Users [id] Method Spec — `apps/web-e2e/tests/api/admin-users-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-user CRUD GET / PUT / DELETE method / id /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-users-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-id-method.spec.ts).

This is the **third triple-method admin-tree smoke** the
docs tree publishes (after
[`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)
and
[`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md)),
but the **first** that combines a two-step gate, a hybrid
401 envelope, an eight-step PUT body-validation chain, a
DELETE self-deletion guard, and an `error.message`-pass-
through catch posture.

## Why this spec is the hybrid-envelope two-step-gated triple-method smoke

The route under test
([`apps/web/app/api/admin/users/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME two-step gate
(`!session?.user` → 401 `'Unauthorized'`, then
`!session.user.isAdmin` → 403 `'Forbidden'`) and the SAME
hybrid 401 envelope shape
(`{ success: false, error: 'Unauthorized' }` — bare message
PLUS `success: false` key). Each handler diverges on its
post-gate surface:

| Handler  | Body parse                              | Validation                                | Service call                                            | Catch posture                                                      | Success-payload shape                                           |
| -------- | --------------------------------------- | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `GET`    | None                                    | None                                      | `userRepository.findById(id)` → 404 `'User not found'`  | `console.error` + 500 `'Internal server error'`                    | `{ success: true, data: <user> }`                                |
| `PUT`    | `await request.json()` AFTER the gate   | **Eight-step** body validation chain (a-h: object-shape / email / username / name / title / avatar / role-DB-lookup / status-enum) | `userRepository.update(id, userData)`                   | `error instanceof Error` → 400 `error.message`, else 500 `'Internal server error'` | `{ success: true, data: <updatedUser> }`                         |
| `DELETE` | None                                    | **Self-deletion guard** (`session.user.id === id` → 400 `'Cannot delete your own account'`) | `userRepository.delete(id)`                             | Same as PUT (`error.message`-pass-through)                         | `{ success: true, message: 'User deleted successfully' }` (NO `data` key) |

## Cross-route triple-method comparison

This is the **third** triple-method admin-tree smoke. The
hybrid envelope is the load-bearing divergence vs the
sibling triple-method routes.

| Route                                          | Methods                  | Gate steps                                        | 401 envelope                                                | DELETE self-deletion guard | PUT validation chain                  |
| ---------------------------------------------- | ------------------------ | ------------------------------------------------- | ----------------------------------------------------------- | -------------------------- | ------------------------------------- |
| `/api/admin/users/{id}` (this spec)            | `GET` + `PUT` + `DELETE` | Two-step `!session?.user` → `!session.user.isAdmin` | Hybrid `{ success: false, error: 'Unauthorized' }`           | YES (400)                  | **Eight-step** manual chain           |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`             | Canonical longer `{ success: false, error: 'Unauthorized. Admin access required.' }` | NO                         | None (body forwarded to repository)   |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Single-step `!session?.user?.isAdmin`             | Bare `{ error: 'Unauthorized' }` (no `success` key)         | NO                         | None (body forwarded to query func)   |
| `/api/admin/roles/{id}/permissions`            | `GET` + `PUT`            | `checkAdminAuth()` helper (three-step)            | Hybrid `{ success: false, error: 'Unauthorized' }`          | n/a (no DELETE)            | Imperative `isValidPermission` filter |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~28 PUT
bodies covering all eight validation steps), and a suite
of **fifteen hand-written scenarios** — together asserting
the `< 500` invariant on every permutation, the per-handler
hybrid-envelope contract, the cross-method envelope-
equality invariant, the gate-before-post-auth invariant
across twelve candidate post-auth messages, the unauth-
lands-on-401-not-403 invariant, the gate-before-eight-step-
validation invariant, and the gate-before-self-deletion-
guard invariant.

| Block                                                                                                  | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of USER_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                          | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                    | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                              | Bulk-loop walk of every plausible PUT body shape (~28 bodies, including step-(a)–(h) probes for object-shape / email / username / name / title / avatar / role / status validation).                                  |
| `test('GET … returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope for `GET`.                                                                                                                              |
| `test('PUT … returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope for `PUT`.                                                                                                                              |
| `test('DELETE … returns 401 with the hybrid bare-message + success: false envelope', …)`               | Pins the hybrid 401 envelope for `DELETE`.                                                                                                                           |
| `test('GET / PUT / DELETE … envelope shape has exactly success and error keys', …)`                    | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`               | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … unauth branch lands on 401 (NOT 403)', …)`                                 | Pins that the FIRST gate-step fires (the unauth client lacks any session), so the response must NEVER be 403 and must NEVER echo the 'Forbidden' message.            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`           | Negative-property assertion across all three methods.                                                                                                                |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`     | Pins the gate-before-post-auth order across twelve candidate messages (covering all eight PUT validation branches plus DELETE self-deletion + 'Internal server error' + 'User not found' + 'Forbidden' + 'User deleted successfully'). |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                        | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                        | Eight body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                    | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                          | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service call is NOT entered on the unauth branch', …)`                     | Pins the gate-before-service order across all three repository calls.                                                                                                |
| `test('PUT … eight-step body validation chain is NOT evaluated on the unauth branch', …)`              | Pins the gate-before-eight-step-validation order: every step-(a)–(h) probe (~13 probes covering all eight validation branches) must round-trip to the same 401 status. |
| `test('DELETE … self-deletion guard is NOT evaluated on the unauth branch', …)`                        | Pins the gate-before-self-deletion-guard order: every id shape (including session-shaped ids that would trigger the guard on the auth branch) must round-trip to the same 401 status, and the unauth response must NEVER echo 'Cannot delete your own account'. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation (~~6×3 + 17×3 + 28 = ~97
   total) must round-trip to a `< 500` status.
2. **Hybrid 401 envelope on the unauth branch** for
   each of `GET`, `PUT`, and `DELETE` — exact match
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
4. **Cross-method envelope equality**.
5. **Unauth-lands-on-401-not-403 invariant** — the
   response must NEVER be 403 and must NEVER echo
   `'Forbidden'`.
6. **Success-branch-key non-disclosure** across all
   three methods.
7. **Gate-before-post-auth invariant** — none of the
   twelve post-auth messages must appear in any unauth
   response.
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation**.
11. **Cross-method invariance** — `POST` and `PATCH`
    round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant**.
13. **Gate-before-service invariant**.
14. **Gate-before-eight-step-validation invariant** —
    every step-(a)–(h) probe must round-trip to the
    same 401 status.
15. **Gate-before-self-deletion-guard invariant** —
    every id shape must round-trip to the same 401
    status, including session-shaped ids that would
    trigger the guard on the auth branch.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)
  and the bare-envelope-no-`success`-key triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-user CRUD route sits
  inside.
