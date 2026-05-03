---
id: admin-users-check-email-body-spec
title: E2E Admin Users Check-Email Body Spec (apps/web-e2e/tests/api/admin-users-check-email-body.spec.ts)
sidebar_label: E2E Admin Users Check-Email Body Spec
sidebar_position: 509
---

# E2E Admin Users Check-Email Body Spec — `apps/web-e2e/tests/api/admin-users-check-email-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin check-email request-body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-users-check-email-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-check-email-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body and query smoke specs and the
**immediately-preceding**
[`admin-items-export-query-spec.md`](admin-items-export-query-spec.md).

This is the **ninth** per-source-file reference the docs
tree publishes for any file under `apps/web-e2e/tests/`,
**continuing** the per-spec-file docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
and
[`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
and the **seventh** under `tests/api/`.

## Why this spec is the natural next step in the body-surface rollout

The route under test
([`apps/web/app/api/admin/users/check-email/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/check-email/route.ts))
is the **first** admin-tree route the docs tree publishes
a per-source-file body-surface reference for that
documents the full **two-step `auth()` chain** posture —
splitting 401 (no session) from 403 (session without
`isAdmin`). The sibling
[`admin-twenty-crm-test-connection-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-twenty-crm-test-connection-body.spec.ts)
walks the body surface of a `POST` route with a single-
step gate that collapses both branches into 401 with the
canonical longer message
(`'Unauthorized. Admin access required.'`); this spec is
its complement.

Cross-route comparison of the three `POST` admin-tree
routes the smoke layer covers at the body level:

| Route                                                   | Gate shape                          | 401 envelope                                                   | 403 envelope                          | Body-parse posture                          | Body-validation posture                     |
| ------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `/api/admin/twenty-crm/test-connection`                 | Single-step `isAdmin`               | `{ success: false, error: 'Unauthorized. Admin access required.' }` | (no 403 branch — collapses into 401) | Bare `POST()` — no body read at all         | (no validation step)                        |
| `/api/admin/items/export`                               | Single-step `isAdmin` (GET)         | Same canonical longer message                                  | (no 403 branch — collapses into 401) | (GET — query-string surface, not body)      | Zod `exportQuerySchema` after gate          |
| `/api/admin/users/check-email` (this spec's route)      | **Two-step**: `!session?.user` → 401 + `!session.user.isAdmin` → 403 | `{ error: 'Unauthorized' }` (BARE — no `success: false` key)   | `{ error: 'Forbidden' }` (BARE)       | `await request.json()` after gate           | `if (!email)` → 400 after body parse        |

The cross-route divergence is the whole reason a per-
source-file reference is worth maintaining: a regression
that copies one route's gate shape into the other would
surface immediately on the per-route body-surface spec
because each spec's `expect(body).toEqual(...)` /
`expect(body).not.toHaveProperty(...)` assertions pin
the exact envelope shape, and the cross-method probe
pins the route's exported method set.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **seven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/users/check-email request-body / header surface', …)`:

| Block                                                                                   | Purpose                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { data, contentType, label } of ADMIN_USERS_CHECK_EMAIL_BODIES) test(…)`    | Bulk-loop walk of every plausible body shape (~45 bodies). Asserts the `< 500` no-server-error invariant for each body / Content-Type pair.                         |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                          | Pins the bare 401 envelope: `{ error: 'Unauthorized' }`. The bare-message posture is distinct from the sibling routes' canonical longer message.                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`               | Negative-property assertion: the unauth response body must NOT contain `available` / `exists` keys (the success-branch payload shape).                              |
| `test('… has a stable status across body permutations', …)`                             | Compares six different parameterised bodies against the no-body baseline status — the route's invariance to its body on the unauth branch is the load-bearing assertion. |
| `test('… malformed-body permutations do NOT 5xx on the unauth branch', …)`              | Pins the `await request.json()`-after-gate order: malformed JSON cannot reach the catch on the unauth branch.                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                        | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                  |
| `test('… cross-method probe does NOT 5xx', …)`                                          | Method-resolution walk: GET / PUT / DELETE / PATCH against the route. The route only exports `POST`, so every other method must round-trip to a 405 deterministically. |
| `test('… Unauthorized error envelope does NOT echo the success-branch shape', …)`       | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error']` and no `success` / `available` / `exists` keys.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every body / Content-
   Type permutation (~45 bodies) must round-trip to a
   `< 500` status. The route's two-step gate fires
   before any body parse or repository call, so the
   unauthenticated POST surface returns a 4xx
   (specifically 401) deterministically. There is no
   5xx branch reachable on the unauthenticated POST
   surface because the catch can only fire after the
   gate has already let the call through.
2. **Bare 401 envelope on the unauth branch** — the
   body must echo `{ error: 'Unauthorized' }` exactly.
   No `success: false` key; no `available` / `exists`
   keys; no `errorCode` / `errorMessage` / `details`
   keys. The bare-message posture is distinct from
   the sibling routes' canonical longer message.
3. **Success-branch-key non-disclosure** — the
   `available` / `exists` keys (the success branch's
   `userRepository.emailExists(email, excludeId)`
   payload) must NOT appear in the unauth response.
4. **Status invariance across body permutations** —
   any combination of documented and undocumented
   body keys must round-trip to the same status as
   the no-body baseline.
5. **Body-parse-after-gate order** — malformed JSON
   bodies (`{not json` / `{"unterminated":`) must
   round-trip to the same status as the no-body
   baseline. A regression that runs `request.json()`
   before the gate would surface here as a 400 / 500
   on the malformed cases distinct from the baseline.
6. **`isAdmin` / `admin` / `bypass` / `override` /
   `force` / `userId` / `nested user.isAdmin` /
   `nested session.user.isAdmin` body keys do NOT
   bypass the gate** — the route reads the user
   identity from `session.user.isAdmin` exclusively
   today.
7. **`token` / `secret` / `authorization` /
   `adminToken` / `apiKey` body keys do NOT bypass
   the gate** — the route does not read any magic-
   token bypass key today.
8. **Email-shape boundary fuzzing on the unauth
   branch** — null-byte injection, CRLF injection,
   XSS-shape strings, and SQL-shape strings as
   `email` field values must round-trip to the same
   status as the no-body baseline. A regression that
   runs the email validation before the gate would
   surface here.
9. **Side-channel isolation** — fabricated session-
   token cookies, `X-Forwarded-For` headers, and
   `X-Real-IP` headers do NOT 5xx.
10. **Cross-method invariance** — `GET` / `PUT` /
    `DELETE` / `PATCH` against the route round-trip
    to a `< 500` status (typically 405 Method Not
    Allowed).
11. **Strict envelope-shape preservation** — the
    error response body has exactly one key
    (`error`), with the value `'Unauthorized'`.

## Cross-route comparison table

| Aspect                              | `/api/admin/users/check-email` (this spec) | `/api/admin/twenty-crm/test-connection` (sibling) |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| HTTP method                         | `POST`                                     | Same                                              |
| Gate shape                          | Two-step (401 + 403)                       | Single-step (401 collapses both)                  |
| 401 message                         | `'Unauthorized'` (bare)                    | `'Unauthorized. Admin access required.'`          |
| 403 message                         | `'Forbidden'` (bare)                       | (no 403 branch)                                   |
| `success: false` envelope key       | Absent                                     | Present                                           |
| Body-parse posture                  | `await request.json()` after gate          | Bare `POST()` — no body read at all               |
| Body-validation posture             | `if (!email)` → 400 after body parse       | (no validation — body never read)                 |
| Catch fallback shape                | `{ error: 'Internal server error' }`       | `{ success: false, error: 'Failed to test connection' }` |
| Catch logging                       | `console.error` before return              | (no log)                                          |
| Repository / service call           | `userRepository.emailExists(email, excludeId)` | `apiService.testConnection(baseUrl, apiKey)`  |
| Success-branch payload shape        | `{ available, exists }`                    | `{ success: boolean, ... }`                       |

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
  and
  [`admin-items-export-query-spec.md`](admin-items-export-query-spec.md)
  — sibling per-spec-file references (the **first
  six** under `tests/api/`; this spec is the
  **seventh**).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the admin clients page-object driver paired with
  the same admin-users area's UI shell.
- [`admin-clients-stats-query-spec.md`](admin-roles-query-spec.md)
  — sibling smoke targeting an adjacent admin-tree
  route under the same admin shell.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the check-email route sits
  inside.
