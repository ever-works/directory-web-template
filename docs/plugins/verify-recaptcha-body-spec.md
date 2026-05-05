---
id: verify-recaptcha-body-spec
title: E2E Verify ReCAPTCHA Body Spec (apps/web-e2e/tests/api/verify-recaptcha-body.spec.ts)
sidebar_label: E2E Verify ReCAPTCHA Body Spec
sidebar_position: 598
---

# E2E Verify ReCAPTCHA Body Spec — `apps/web-e2e/tests/api/verify-recaptcha-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**ReCAPTCHA verification proxy POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/verify-recaptcha-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/verify-recaptcha-body.spec.ts).

This is the **first per-source-file smoke** the docs
tree publishes that pins a **dev-mode bypass envelope**
with status 200 `{ success: true, score: 1.0, action:
'bypass' }` (when `RECAPTCHA_SECRET_KEY` is missing AND
`NODE_ENV === 'development'`). It is also the **first**
smoke the docs tree publishes that pins a route built
on top of the `externalClient.postForm<T>(url, body)`
helper (form-encoded outbound POST to Google's
`https://www.google.com/recaptcha/api/siteverify`
endpoint) AND the **first** smoke that pins the
**`error_codes` underscore-rename invariant** (Google
returns `error-codes` with a hyphen; the handler
renames it to `error_codes` with an underscore in the
response envelope).

## What's distinct from EVERY prior POST smoke

- **Form-encoded outbound POST via
  `externalClient.postForm`** — UNIQUE: every other
  proxy POST in the docs tree uses `fetch` /
  `externalClient.post` (JSON body). This handler
  builds an `application/x-www-form-urlencoded` body
  for Google's siteverify endpoint.
- **`error_codes` underscore-rename invariant** —
  Google's response uses `error-codes` (hyphen); the
  handler renames it to `error_codes` (underscore)
  when surfacing to the client. UNIQUE: no other
  proxy in the docs tree performs this hyphen-to-
  underscore rename.
- **Score / action surface** — `{ score: number
  (0..1), action: string }` are echoed in the 200
  envelope. UNIQUE: no other smoke exercises
  ReCAPTCHA scoring fields.
- **Dev-mode bypass branch** — when
  `RECAPTCHA_SECRET_KEY` is missing AND `NODE_ENV
  === 'development'`, returns 200 `{ success: true,
  score: 1.0, action: 'bypass' }`. UNIQUE: NO other
  smoke pins a 200 dev-bypass envelope with `action:
  'bypass'`.
- **Not-configured 500 branch** — when
  `RECAPTCHA_SECRET_KEY` is missing AND `NODE_ENV
  !== 'development'`, returns 500 `{ success:
  false, error: 'ReCAPTCHA not configured' }`.
  UNIQUE: status 500 with NO stack trace /
  sensitive content.

## Why this spec is the first env-dispatcher POST smoke

The route under test
([`apps/web/app/api/verify-recaptcha/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/verify-recaptcha/route.ts))
exports `POST` only. The handler combines:

1. **JSON body parse via `await request.json()`** —
   wrapped in outer `try / catch` so malformed JSON
   falls through to the 500 catch.
2. **`if (!token)` token-required gate** — 400
   `{ success: false, error: 'ReCAPTCHA token is
   required' }`.
3. **`!secretKey` dev-bypass / not-configured branch**
   — bifurcates on `coreConfig.NODE_ENV ===
   'development'`.
4. **`externalClient.postForm` Google siteverify
   proxy** — `secret: secretKey, response: token`
   form-encoded body.
5. **`apiUtils.isSuccess(response)` check** — on
   failure, returns 500 `{ success: false, error:
   'Failed to verify ReCAPTCHA' }`.
6. **Renamed-envelope success pass-through** —
   `{ success: data.success, score: data.score,
   action: data.action, hostname: data.hostname,
   challenge_ts: data.challenge_ts, error_codes:
   data['error-codes'] }` (HYPHEN → UNDERSCORE
   rename of `error-codes`).
7. **Outer catch** — 500 `{ success: false, error:
   'Verification failed' }`.
8. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two body / header bulk-loop walks**
(~12 headers + ~16 bodies) and **fourteen hand-written
scenarios**.

| Block                                                                                               | Purpose                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                               | ~12 header permutations.                                                                                                                             |
| Body bulk-loop walk                                                                                 | ~16 body permutations (no body, empty object, falsy tokens, truthy tokens, type-violations, bypass attempts).                                        |
| `test('POST … returns 400 with the token-required envelope when no token is supplied', …)`          | Pins the load-bearing 400 token-required envelope `{ success: false, error: 'ReCAPTCHA token is required' }`.                                        |
| `test('POST … 400 envelope shape (token-required) has exactly success / error keys', …)`            | Strict envelope-shape assertion. NO `featureDisabled` key (DIFFERENT from extract-body sibling).                                                     |
| `test('POST … treats falsy token values uniformly via the token-required gate', …)`                 | Pins that empty-string / null / numeric-zero / boolean-false token values ALL emit the SAME 400 envelope.                                            |
| `test('POST … does NOT echo the caller-supplied token marker on the token-required branch', …)`    | Pins that the caller-supplied token is NEVER echoed.                                                                                                 |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                              | Side-channel walk.                                                                                                                                   |
| `test('POST … cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                   | Method-resolution walk. POST is the only exported method.                                                                                            |
| `test('POST … bypass-attempt body keys (RECAPTCHA_SECRET_KEY / secret / NODE_ENV) do NOT alter the envelope', …)` | Pins that user-supplied env-shadowing fields in the body are IGNORED.                                                                                |
| `test('POST … env-driven dispatch lands on exactly ONE of the three known envelopes for a truthy token', …)` | Pins the env-driven dispatch invariant — the response MUST match exactly ONE of dev-bypass / not-configured / Google-proxy envelopes.                |
| `test('POST … envelope NEVER includes the hyphenated error-codes key on the success branch', …)`   | Pins the HYPHEN → UNDERSCORE rename invariant.                                                                                                       |
| `test('POST … 500 envelope (when reached) NEVER leaks stack-trace fragments', …)`                  | CRITICAL — pins that the 500 envelope NEVER leaks `stack` / `cause` / `RECAPTCHA_SECRET_KEY` / `secretKey` / `siteverify` / `google.com` fragments. |
| `test('POST … is invariant to malformed JSON bodies (outer catch fallback)', …)`                   | Pins the outer-catch fallback contract.                                                                                                              |
| `test('POST … non-string token types (numeric / array / object) bypass the !token gate as truthy', …)` | Pins the `!token` truthy-check semantics.                                                                                                            |
| `test('POST … does NOT echo the post-validation messages on the token-required branch', …)`        | Pins the gate-before-post-validation order.                                                                                                          |

## What the spec asserts

1. **Bulk-loop `< 600` contract** — every body /
   header permutation must round-trip to a non-
   crashing status.
2. **Token-required 400 envelope** — `{ success:
   false, error: 'ReCAPTCHA token is required' }`.
3. **Strict envelope-shape preservation**.
4. **Falsy-token uniformity** — empty-string / null
   / numeric-zero / boolean-false ALL hit the same
   envelope.
5. **No-token-echo invariant**.
6. **Side-channel isolation**.
7. **Cross-method invariance** — POST is the only
   exported method.
8. **Bypass-attempt invariance** — user-supplied
   env-shadowing fields are IGNORED.
9. **Three-envelope env-driven dispatch invariant**
   — dev-bypass / not-configured / Google-proxy.
10. **HYPHEN → UNDERSCORE rename invariant**.
11. **500-envelope no-leak invariant** (CRITICAL).
12. **Outer-catch malformed-JSON fallback contract**.
13. **Truthy non-string token gate semantics**.
14. **Gate-before-post-validation invariant**.

## See also

- The cross-cutting
  [`method-guards.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/method-guards.spec.ts)
  ALSO probes `POST /api/verify-recaptcha` BUT
  only checks that an empty-object body produces
  a non-5xx response. This per-source-file spec
  drills into the four-branch dispatcher (token-
  required-400 / dev-bypass-200 / not-configured-
  500 / Google-proxy-pass-through).
- The neighbouring
  [`extract-body-spec.md`](extract-body-spec.md)
  also covers a POST-only proxy endpoint BUT
  uses Zod validation AND a `featureDisabled`
  envelope (200 status, `featureDisabled: true`
  key). This verify-recaptcha sibling uses
  hand-rolled `if (!token)` validation AND a
  `error: 'ReCAPTCHA token is required'` envelope
  (400 status, NO `featureDisabled` key).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 008 — Analytics Providers](../spec/008-analytics-providers/spec.md)
  covers the analytics layer that may consume
  ReCAPTCHA scores when they are surfaced.
