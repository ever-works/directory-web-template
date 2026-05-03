---
id: admin-users-check-username-body-spec
title: E2E Admin Users Check-Username Body Spec (apps/web-e2e/tests/api/admin-users-check-username-body.spec.ts)
sidebar_label: E2E Admin Users Check-Username Body Spec
sidebar_position: 510
---

# E2E Admin Users Check-Username Body Spec — `apps/web-e2e/tests/api/admin-users-check-username-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin check-username request-body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-users-check-username-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-users-check-username-body.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body and query smoke specs and the
**immediately-preceding**
[`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md).

This is the **tenth** per-source-file reference the docs
tree publishes for any file under `apps/web-e2e/tests/`,
**continuing** the per-spec-file docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
[`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
and
[`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
and the **eighth** under `tests/api/`.

## Why this spec sits paired with `admin-users-check-email-body-spec.md`

The route under test
([`apps/web/app/api/admin/users/check-username/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/check-username/route.ts))
is the **sibling** of
[`apps/web/app/api/admin/users/check-email/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/check-email/route.ts).
The two routes share an **identical authorization shell**:

- Same two-step `auth()` chain (401 + 403).
- Same bare `'Unauthorized'` / `'Forbidden'` envelopes.
- Same body parse via `await request.json()` AFTER the gate.
- Same body-validation step `if (!field)` AFTER the body parse.
- Same `console.error` + `'Internal server error'` catch.
- Same success-branch payload shape `{ available, exists }`.

The two routes diverge in **exactly four** respects:

| Aspect                              | `/api/admin/users/check-email`                                            | `/api/admin/users/check-username` (this spec)                                                |
| ----------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Documented field                    | `email`                                                                   | `username`                                                                                   |
| Body-validation message             | `'Email is required'`                                                     | `'Username is required'`                                                                     |
| Repository call                     | `userRepository.emailExists(email, excludeId)`                            | `userRepository.usernameExists(username, excludeId)`                                         |
| Catch-log prefix                    | `'Error in POST /api/admin/users/check-email:'`                           | `'Error in POST /api/admin/users/check-username:'`                                           |

The unauth branch is INVARIANT to all four divergences —
both routes return the same bare 401 envelope on the
first gate step. The per-spec separation surfaces three
regression classes a shared spec would mask:

1. **Cross-route field-validation regression** — a
   change that swaps the `if (!username)` validation
   to `if (!email)` (or vice versa) would surface on
   the auth branch only; the unauth branch stays
   green either way, so the cross-route per-spec
   separation is the only place the regression is
   caught (via the auth-branch behavioral test out
   of scope for the unauth smoke walk).
2. **One-route-only auth-gate-removal regression** —
   a change that removes the gate from one route but
   not the other would surface as a per-spec
   divergence (the affected spec's 401 baseline
   turns into a 200 / 4xx; the unaffected spec's
   stays at 401). A shared spec would mask half of
   that change.
3. **Username-shape boundary fuzzing on the unauth
   branch** — the username field accepts shorter /
   narrower inputs than the email field (e.g.
   `johndoe` vs `john.doe@example.com`), so the
   boundary-fuzzing payloads diverge: the username
   spec walks Unicode / RTL / null-byte / SQL
   injection / XSS / homoglyph / zero-width-character
   shapes that target the `usernameExists(...)`
   repository call's collation-sensitivity surface,
   distinct from the email spec's MX-record / CRLF
   email-header / RFC-5322 boundary surface.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **nine hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/users/check-username request-body / header surface', …)`:

| Block                                                                                      | Purpose                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { data, contentType, label } of ADMIN_USERS_CHECK_USERNAME_BODIES) test(…)`    | Bulk-loop walk of every plausible body shape (~50 bodies). Asserts the `< 500` no-server-error invariant for each body / Content-Type pair.                                                      |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                             | Pins the bare 401 envelope: `{ error: 'Unauthorized' }`. Identical to the sibling `admin/users/check-email` route's 401 envelope.                                                                |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                  | Negative-property assertion: the unauth response body must NOT contain `available` / `exists` keys.                                                                                              |
| `test('… has a stable status across body permutations', …)`                                | Compares six different parameterised bodies against the no-body baseline status — the route's invariance to its body on the unauth branch is the load-bearing assertion.                         |
| `test('… sibling-route response parity on the unauth branch', …)`                          | Cross-route parity assertion: the bare-401 envelope of THIS route is byte-identical to the sibling `admin/users/check-email` route's bare-401 envelope. Surfaces any one-route-only divergence. |
| `test('… malformed-body permutations do NOT 5xx on the unauth branch', …)`                 | Pins the `await request.json()`-after-gate order: malformed JSON cannot reach the catch on the unauth branch.                                                                                    |
| `test('… does NOT branch on side-channel cookies / headers', …)`                           | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                              |
| `test('… cross-method probe does NOT 5xx', …)`                                             | Method-resolution walk: GET / PUT / DELETE / PATCH against the route. The route only exports `POST`, so every other method must round-trip to `< 500`.                                          |
| `test('… Unauthorized error envelope does NOT echo the success-branch shape', …)`          | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error']` and no `success` / `available` / `exists` keys.                                                                       |
| `test('… Username-required validation does NOT fire on the unauth branch', …)`             | Pins the gate-before-body-validation order: the `'Username is required'` 400 envelope must NEVER appear in the unauth response body. A regression that moves the validation before the gate would surface here. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every body / Content-
   Type permutation (~50 bodies) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** — the
   body must echo `{ error: 'Unauthorized' }` exactly.
3. **Success-branch-key non-disclosure** — the
   `available` / `exists` keys must NOT appear in the
   unauth response.
4. **Status invariance across body permutations** —
   any combination of documented and undocumented
   body keys must round-trip to the same status as
   the no-body baseline.
5. **Sibling-route response parity** — the unauth-
   branch response of `/api/admin/users/check-username`
   must be byte-identical to the unauth-branch response
   of `/api/admin/users/check-email`. A regression
   that diverges either route's gate would surface
   here.
6. **Body-parse-after-gate order** — malformed JSON
   bodies must round-trip to the same status as the
   no-body baseline.
7. **`isAdmin` / `admin` / `bypass` / `override` /
   `force` / `userId` / nested `user.isAdmin` /
   nested `session.user.isAdmin` body keys do NOT
   bypass the gate**.
8. **`token` / `secret` / `authorization` /
   `adminToken` / `apiKey` body keys do NOT bypass
   the gate**.
9. **Username-shape boundary fuzzing on the unauth
   branch** — null-byte injection
   (`admin\x00malicious`), CRLF injection, XSS-shape,
   SQL-shape, SQL-DROP-shape, RTL-override Unicode
   (`‮‭‭dmin`), zero-width-character (`​‌‍admin`),
   Cyrillic-homoglyph (`аdmin`), uppercase
   (`ADMIN`, collation-sensitivity), trailing/leading-
   space usernames must round-trip to the same
   status as the no-body baseline.
10. **Side-channel isolation** — fabricated session-
    token cookies, `X-Forwarded-For` headers, and
    `X-Real-IP` headers do NOT 5xx.
11. **Cross-method invariance** — `GET` / `PUT` /
    `DELETE` / `PATCH` against the route round-trip
    to a `< 500` status.
12. **Strict envelope-shape preservation** — the
    error response body has exactly one key
    (`error`), with the value `'Unauthorized'`.
13. **Username-required validation does NOT fire on
    the unauth branch** — the `'Username is
    required'` 400 envelope must NEVER appear in the
    unauth response body.

## Cross-route comparison table

The sibling-route parity assertion (`'… sibling-route
response parity on the unauth branch'`) is the load-
bearing invariant of the cross-route smoke layer. The
following table summarises every aspect the parity
assertion implicitly pins:

| Aspect                              | `/api/admin/users/check-email`           | `/api/admin/users/check-username` (this spec) |
| ----------------------------------- | ---------------------------------------- | --------------------------------------------- |
| HTTP method                         | `POST`                                   | Same                                          |
| Gate shape                          | Two-step (401 + 403)                     | Same                                          |
| 401 message                         | `'Unauthorized'` (bare)                  | Same                                          |
| 403 message                         | `'Forbidden'` (bare)                     | Same                                          |
| `success: false` envelope key       | Absent                                   | Same                                          |
| Body-parse posture                  | `await request.json()` after gate        | Same                                          |
| Body-validation posture             | `if (!email)` → 400 after body parse     | `if (!username)` → 400 after body parse       |
| Catch fallback shape                | `{ error: 'Internal server error' }`     | Same                                          |
| Catch logging                       | `console.error('Error in POST … :', error)` | Same prefix-with-route shape               |
| Repository / service call           | `userRepository.emailExists(email, excludeId)` | `userRepository.usernameExists(username, excludeId)` |
| Success-branch payload shape        | `{ available, exists }`                  | Same                                          |
| Unauth-branch envelope (load-bearing) | `{ error: 'Unauthorized' }`            | **Identical** (parity assertion)              |

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
  [`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
  and
  [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md)
  — sibling per-spec-file references (the **first
  seven** under `tests/api/`; this spec is the
  **eighth**).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the admin clients page-object driver paired with
  the same admin-users area's UI shell.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the check-username route
  sits inside.
