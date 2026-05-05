---
id: auth-change-password-spec
title: E2E Auth Change-Password Spec (apps/web-e2e/tests/api/auth-change-password.spec.ts)
sidebar_label: E2E Auth Change-Password Spec
sidebar_position: 617
---

# E2E Auth Change-Password Spec — `apps/web-e2e/tests/api/auth-change-password.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**bare two-test no-server-error password-change POST
smoke spec** paired with
[`apps/web-e2e/tests/api/auth-change-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password.spec.ts).

This is the **companion bare-smoke counterpart** to the
already-documented
[`auth-change-password-body-spec.md`](auth-change-password-body-spec.md)
landing page (paired with `auth-change-password-body.spec.ts`).
The body sibling drills into the rich body / header
permutation surface (rate-limit-FIRST gate posture, Zod
validation, multi-stage post-auth chain, OAuth-account
guard, bcrypt-current / bcrypt-duplicate gates); this
sibling is the **two-test minimal `< 500` no-server-error
contract** baseline that pins the basic guarantee that
the route never blows up regardless of whether a session
is attached or the body is well-formed.

UNIQUE within the auth-change-password spec pair: this
is the **bare-baseline** member of the pair. Every prior
per-source-file landing page in the docs tree pairs to a
SINGLE source spec; this is the **first per-source-file
landing page that documents one HALF of a two-spec pair
covering the same route** (the body sibling pairs with
the rich `auth-change-password-body.spec.ts` and this
sibling pairs with the bare `auth-change-password.spec.ts`).

## What's distinct from the body sibling

- **Bare two-test contract (vs ~26-test body sibling)** —
  UNIQUE: this spec emits exactly TWO tests:
  (1) `POST /api/auth/change-password without a session
  does not 5xx` with a fully-shaped
  `{ currentPassword, newPassword }` body, and
  (2) `POST /api/auth/change-password with empty body
  does not 5xx` with `{}`. Both tests assert
  `expect(response.status()).toBeLessThan(500)`. Every
  per-source-file POST smoke in the rollout pins a
  rich body / header permutation walk; this is the
  FIRST per-source-file POST smoke that pins ONLY the
  bare `< 500` contract on two minimal body shapes.
- **No envelope-shape assertions** — UNIQUE: this spec
  does NOT pin the canonical `{ success: false, error:
  'Unauthorized. Please sign in.' }` 401 envelope, the
  `{ success: false, error: 'Invalid input data',
  details: [...] }` 400-validation envelope, OR the
  rate-limit-`{ success: false, error: 'Too many...',
  retryAfter: ... }` 429 envelope. The body sibling
  pins all three; this sibling pins only that the
  route never crashes (status `< 500`).
- **No gate-ordering invariants** — UNIQUE: this spec
  does NOT pin the rate-limit-FIRST gate posture (the
  body sibling does). The route's actual order is
  rate-limit → auth → JSON-parse → Zod → tenant →
  user-DB → OAuth-guard → bcrypt-current → bcrypt-
  duplicate → bcrypt-hash → DB-update → email; the
  body sibling pins this whole chain via gate-before-X
  invariants, but this sibling pins only the outer
  contract.
- **No bulk-loop walks** — UNIQUE: this spec does NOT
  emit any `for (const ... of HEADERS) test(...)` or
  `for (const ... of BODIES) test(...)` loop. The
  body sibling emits both; this sibling emits two
  hand-written tests.
- **Two-body coverage (well-shaped + empty)** —
  UNIQUE: this spec hits two shapes:
  (1) a well-shaped body
  `{ currentPassword: 'old', newPassword: 'new' }` to
  exercise the well-shaped-body path, and
  (2) an empty body `{}` to exercise the missing-
  field path. Both must round-trip `< 500`. The body
  sibling hits ~14 shapes including XSS markers and
  rate-limit-burst probes.
- **No method-resolution surface walk** — UNIQUE: this
  spec does NOT emit a cross-method probe (`GET` /
  `PUT` / `PATCH` / `DELETE`). The body sibling does;
  this sibling pins only `POST`.
- **No side-channel walk** — UNIQUE: this spec does
  NOT emit a side-channel walk (fabricated session
  cookies / Authorization headers). The body sibling
  does; this sibling pins only that the route does
  not 5xx.

## Why this spec is the bare-baseline change-password POST smoke

The route under test
([`apps/web/app/api/auth/change-password/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/auth/change-password/route.ts))
exports only `POST`. The POST handler combines:

1. **Client-IP extraction** — `request.headers.get('x-forwarded-for')
   || request.headers.get('x-real-ip') || 'unknown'`
   — load-bearing for the rate-limit key.
2. **`ratelimit('change-password:<clientIP>', 5, 15
   minutes)`** — FIRST gate. Exhausted → 429
   `{ success: false, error: 'Too many password
   change attempts. Please try again later.',
   retryAfter }`.
3. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized.
   Please sign in.' }`.
4. **`await request.json()`** — no per-call try/catch
   (the outer catch covers malformed JSON).
5. **`changePasswordSchema.safeParse(body)`** — Zod
   validation. `currentPassword`: non-empty;
   `newPassword`: passwordSchema (min 8 + upper +
   lower + digit + special); `confirmPassword`: must
   equal `newPassword` via `.refine(...)`. Failure →
   400 `{ success: false, error: 'Invalid input
   data', details: validationResult.error.issues }`.
6. **`getTenantId()`** — null → 403 `{ success:
   false, error: 'Tenant not found' }`.
7. **`db.select().from(users).where(and(eq(users.id,
   session.user.id), eq(users.tenantId, tenantId)))
   .limit(1)`** — null → 404 `{ success: false,
   error: 'User not found' }`.
8. **`!user.passwordHash`** — OAuth-account guard →
   400 `{ success: false, error: 'Password change
   not available for OAuth accounts. Please contact
   support.' }`.
9. **`bcrypt.compare(currentPassword, user.passwordHash)`**
   — `false` → 400 `{ success: false, error:
   'Current password is incorrect' }`.
10. **`bcrypt.compare(newPassword, user.passwordHash)`**
    — `true` → 400 `{ success: false, error: 'New
    password must be different from current password' }`.
11. **`bcrypt.hash(newPassword, 12)`** — load-bearing
    rehash with 12 salt rounds.
12. **`db.update(users).set({ passwordHash,
    updatedAt }).where(...)`** — load-bearing DB
    write.
13. **`sendPasswordChangeConfirmationEmail(...)`** —
    fire-and-forget email; failures inside the inner
    try/catch are swallowed (the password change has
    already succeeded).
14. **Success payload** — 200 `{ success: true,
    message: 'Password changed successfully' }`.
15. **Outer catch** — `console.error` + 500
    `{ success: false, error: 'Internal server
    error' }`.

This bare smoke pins ONLY that the unauth path
through the route returns `< 500` for two body
shapes. The body sibling pins the full envelope /
gate-ordering / cross-method / side-channel /
malformed-JSON / rate-limit-burst contracts.

## How the spec walks its scenario tree

| Block                                                                                          | Purpose                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `test('POST /api/auth/change-password without a session does not 5xx', …)`                     | Pins that a well-shaped POST body (`{ currentPassword: 'old', newPassword: 'new' }`) does not 5xx.     |
| `test('POST /api/auth/change-password with empty body does not 5xx', …)`                       | Pins that an empty POST body (`{}`) does not 5xx — exercises the missing-field branch.                 |

## What the spec asserts

1. **Well-shaped-body `< 500` contract** — a
   `{ currentPassword, newPassword }` POST body with
   `'content-type: application/json'` and no session
   cookie returns `< 500`. The actual response will
   typically be `401` (`'Unauthorized. Please sign
   in.'`) under the rate-limit-not-tripped-yet
   posture, but the spec only pins `< 500`.
2. **Empty-body `< 500` contract** — a `{}` POST body
   with `'content-type: application/json'` and no
   session cookie returns `< 500`. The actual
   response will typically also be `401` under the
   same posture (the auth gate fires before Zod
   validation), but the spec only pins `< 500`.

## See also

- The companion rich-permutation sibling
  [`auth-change-password-body-spec.md`](auth-change-password-body-spec.md)
  pairs with `auth-change-password-body.spec.ts` and
  pins the rate-limit-FIRST gate posture, the
  canonical 401 / 400 / 429 envelopes, the bulk-loop
  header / body walks, and the gate-before-Zod /
  gate-before-tenant / gate-before-user-DB /
  gate-before-OAuth-guard / gate-before-bcrypt-current
  / gate-before-bcrypt-duplicate / gate-before-DB-
  update invariants.
- The companion auth-route smoke pair
  [`auth/forgot-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/auth/forgot-password.spec.ts)
  and
  [`auth/new-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/auth/new-password.spec.ts)
  cover the page-level forgot / reset password flows.
- [Spec 003 — Auth Providers](../spec/003-auth-providers/spec.md)
  governs the auth-related routes at large.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
