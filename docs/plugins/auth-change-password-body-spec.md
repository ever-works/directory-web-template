---
id: auth-change-password-body-spec
title: E2E Auth Change-Password Body Spec (apps/web-e2e/tests/api/auth-change-password-body.spec.ts)
sidebar_label: E2E Auth Change-Password Body Spec
sidebar_position: 570
---

# E2E Auth Change-Password Body Spec — `apps/web-e2e/tests/api/auth-change-password-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**rate-limit-FIRST password-change POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/auth-change-password-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **rate-limit-FIRST
gate posture** — the rate-limit check fires BEFORE
the auth gate. The handler calls
`ratelimit('change-password:<clientIP>', 5, 15
minutes)` as the FIRST gate, then runs `auth()`,
then Zod validation, then a multi-stage post-auth
chain (tenant / user / OAuth / bcrypt-current /
bcrypt-duplicate). EVERY prior per-source-file POST
smoke pins auth as the first gate; this is the FIRST
rate-limit-before-auth contract in the rollout.

The companion minimal spec
[`auth-change-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password.spec.ts)
pins only the `< 500` no-server-error contract; this
spec drills into the body / header surface with
detailed invariants.

## What's distinct from EVERY prior per-source-file POST smoke

- **Rate-limit-FIRST gate posture:** the rate-limit
  check fires BEFORE the auth gate. Returns 429
  `{ success: false, error: 'Too many password
  change attempts. Please try again later.',
  retryAfter: <seconds> }`. The FIRST per-source-
  file POST smoke that pins a `retryAfter` field in
  the response body.
- **`'Unauthorized. Please sign in.'` 401 message:**
  UNIQUE — the imperative-phrased 401 envelope
  distinct from all prior 401 messages
  (`'Unauthorized'`, `'Authentication required'`,
  `'Authentication required'` two-key, etc.).
- **OAuth-account check:** `!user.passwordHash` →
  400 `'Password change not available for OAuth
  accounts. Please contact support.'`. The FIRST
  per-source-file POST smoke that pins an OAuth-
  account-restriction contract.
- **Dual bcrypt.compare gates:** current-password
  verification (400 `'Current password is
  incorrect'`) AND duplicate-password prevention
  (400 `'New password must be different from current
  password'`). The FIRST per-source-file POST smoke
  that pins a dual bcrypt.compare contract.
- **Cross-field Zod validation via `.refine`:** the
  `changePasswordSchema` uses `.refine` to check
  `newPassword === confirmPassword`. The FIRST per-
  source-file POST smoke that pins a cross-field
  validation contract.
- **Email-send fault tolerance:** the
  `sendPasswordChangeConfirmationEmail(...)` call is
  wrapped in a try/catch that does NOT fail the
  password change. The success response is returned
  regardless of email delivery.

## Why this spec is the rate-limit-FIRST password-change smoke

The route under test
([`apps/web/app/api/auth/change-password/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/auth/change-password/route.ts))
exports only `POST`. The handler combines:

1. **Rate-limit gate FIRST** — `ratelimit('change-
   password:<ip>', 5, 15 minutes)` → 429 `{ success:
   false, error: 'Too many ...', retryAfter:
   <seconds> }` if exceeded.
2. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized.
   Please sign in.' }`.
3. **Zod `safeParse(body)` with cross-field
   `.refine`** — failure → 400 `{ success: false,
   error: 'Invalid input data', details: <zod
   issues> }`.
4. **`getTenantId()` resolution** — null → 403
   `'Tenant not found'`.
5. **User lookup by `id` AND `tenantId`** — not
   found → 404 `'User not found'`.
6. **OAuth-account check** — `!user.passwordHash` →
   400 `'Password change not available for OAuth
   accounts. Please contact support.'`.
7. **`bcrypt.compare(currentPassword, hash)`** —
   false → 400 `'Current password is incorrect'`.
8. **`bcrypt.compare(newPassword, hash)` for
   duplicate detection** — true → 400 `'New
   password must be different from current
   password'`.
9. **`bcrypt.hash(newPassword, 12)` +
   `db.update(users)`** — load-bearing password-
   write call.
10. **`sendPasswordChangeConfirmationEmail(...)`
    side-effect** wrapped in try/catch (fault-
    tolerant; failure does NOT fail the password
    change).
11. **Success payload** — `{ success: true,
    message: 'Password changed successfully' }`
    with status 200.
12. **Outer catch** — 500 `{ success: false, error:
    'Internal server error. Please try again
    later.' }`.
13. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~10 headers + ~13
bodies) and **twelve hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of AUTH_CHANGE_PASSWORD_HEADERS) test(…)`                               | Bulk-loop walk of every plausible header shape (~10 headers, including `X-Forwarded-For` / `X-Real-Ip` for rate-limit).                |
| `for (const { data, label } of AUTH_CHANGE_PASSWORD_BODIES) test(…)`                                   | Bulk-loop walk of every plausible body shape (~13 bodies covering required-field probes, weak-password probes, bypass attempts).       |
| `test('… returns 401 with the imperative-phrased Unauthorized envelope', …)`                           | Pins the unique imperative-phrased envelope `{ success: false, error: 'Unauthorized. Please sign in.' }`.                              |
| `test('… 401 envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                              | Negative-property assertion: `'Password changed successfully'` must NOT appear; `success` must be `false`.                             |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                        | Pins the gate-before-post-auth order across eight candidate messages.                                                                  |
| `test('… 429 envelope (if reached) includes retryAfter field', …)`                                     | Pins the 429 envelope shape and `retryAfter: number` field.                                                                            |
| `test('… has a stable status across header / body permutations', …)`                                   | Three body permutations vs the no-body baseline (with stable IP).                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                              | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… Zod validation chain is NOT entered on the unauth branch', …)`                                | Pins the gate-before-validation order.                                                                                                 |
| `test('… bcrypt-compare gates are NOT entered on the unauth branch', …)`                               | Pins that neither current-password verification NOR duplicate-detection runs on the unauth branch.                                     |
| `test('… OAuth-account-check + db.update + email-send are NOT entered on the unauth branch', …)`      | Pins that the OAuth-restriction message, password-write, and email-send side-effect are unreachable on the unauth branch.              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~23 total) must round-trip to a
   `< 500` status.
2. **401 envelope** `{ success: false, error:
   'Unauthorized. Please sign in.' }` on the unauth
   branch (when not rate-limited).
3. **Strict envelope-shape preservation** — exactly
   `success` + `error` keys, no `details` leak on
   401.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant** with eight-
   message non-disclosure set.
6. **429 envelope shape** — `retryAfter: number`
   field present when rate-limit fires.
7. **Status invariance across body permutations**
   (with stable IP).
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is the only
   exported method.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-Zod-validation invariant**.
12. **Gate-before-bcrypt-compare invariant** —
    current-password and duplicate gates NEVER run on
    unauth.
13. **Gate-before-OAuth-check + password-write +
    email-send invariant**.

## See also

- The companion minimal smoke
  [`auth-change-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password.spec.ts)
  pins only the `< 500` no-server-error contract;
  this spec drills into the body / header surface
  with detailed invariants.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
