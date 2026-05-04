---
id: solidgate-checkout-body-spec
title: E2E Solidgate Checkout Body Spec (apps/web-e2e/tests/api/solidgate-checkout-body.spec.ts)
sidebar_label: E2E Solidgate Checkout Body Spec
sidebar_position: 563
---

# E2E Solidgate Checkout Body Spec — `apps/web-e2e/tests/api/solidgate-checkout-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated Solidgate checkout-session creation POST
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/solidgate-checkout-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/solidgate-checkout-body.spec.ts).

This is the **first per-source-file POST smoke for an
auth-gated payment-provider checkout endpoint** the docs
tree publishes. The existing multi-provider
[`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
covers all four providers' checkout endpoints (Stripe,
LemonSqueezy, Polar, Solidgate) with a single `< 500`
assertion each; this spec drills into the Solidgate
checkout handler specifically and pins its load-bearing
401-before-everything gate posture.

## What's distinct from the polar-portal sibling

[`polar-subscription-portal-body-spec.md`](polar-subscription-portal-body-spec.md) is the closest
analogue — both are auth-gated POSTs whose unauth branch
returns 401 deterministically. Solidgate's checkout
diverges in five ways:

- **TWO-key 401 envelope** — Solidgate returns
  `{ error: 'Unauthorized', message: 'Authentication
  required' }` (TWO keys). Polar-portal returns
  `{ error: 'Unauthorized' }` (ONE key). UNIQUE: the
  FIRST per-source-file POST body smoke that pins a
  two-key 401 envelope on a payment-provider route.
- **Zod `safeParse` AFTER the auth gate** — the
  `checkoutSchema.safeParse(json)` and the surrounding
  `try/catch` around `request.json()` fire only AFTER
  `auth()`, so the unauth branch never reaches them.
  Polar-portal does NOT call `request.json()` at all on
  the unauth branch.
- **FIVE-key success envelope** — solidgate's success
  branch returns `{ data: { id, url }, status, message }`
  (THREE top-level keys, including a literal `status: 200`
  field embedded in the body, separate from the HTTP
  status). Polar-portal returns
  `{ success: true, data, message }`. UNIQUE: the FIRST
  per-source-file POST smoke that pins a literal-`status`-
  key success envelope.
- **500 catch (NOT 400)** — solidgate's outer catch
  returns 500 with `{ error, message, details }` (dev-only
  stack). Polar-webhook uses `safeErrorResponse(..., 400)`.
  UNIQUE: the FIRST per-source-file POST smoke that pins a
  500-default catch on a payment-provider route — but ONLY
  reachable AFTER the auth gate.
- **POST-only export** — GET / PUT / PATCH / DELETE are
  NOT exported. Method-resolution returns 405.

## Why this spec is the auth-gated checkout POST smoke

The route under test
([`apps/web/app/api/solidgate/checkout/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/solidgate/checkout/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `if (!session?.user)` →
   401 `{ error: 'Unauthorized', message: 'Authentication
   required' }`. Load-bearing first gate.
2. **`getOrCreateSolidgateProvider()` singleton** —
   provider initialisation. Reachable only after the gate.
3. **Zod `checkoutSchema`** — `amount.positive()`,
   `currency.default('USD')`, `mode.enum(['one_time',
   'subscription']).default('one_time')`,
   `successUrl.url()`, `cancelUrl.url()`,
   `metadata.optional()`. Reachable only after the gate.
4. **Per-call `request.json()` try/catch** — failure → 400
   `{ error: 'Invalid JSON', message: 'Request body must
   be valid JSON' }`. Failure to validate → 400
   `{ error: 'Invalid request body', message: <zod-issues-
   joined> }` with issues mapped via
   `issues.map(issue => '${path.join('.')}: ${message}')
   .join(', ')`.
5. **`solidgateProvider.getCustomerId(session.user)`** —
   not found → 400 `{ error: 'Failed to create customer',
   message: 'Unable to create Solidgate customer' }`.
6. **`solidgateProvider.createPaymentIntent(...)`** — the
   load-bearing payment-provider call.
7. **Success payload** — `{ data: { id, url }, status:
   200, message: 'Checkout session created successfully' }`
   — UNIQUE: includes both a literal `status: 200` body
   field AND a `message` field alongside `data`.
8. **Outer catch** — `safeErrorMessage(error, 'Failed to
   create checkout session')` + dev-only `details: error.
   stack` → 500. UNIQUE among per-source-file POST smokes:
   500-default catch.
9. **Method-resolution surface** — POST is the ONLY
   exported method. GET / PUT / PATCH / DELETE → 405.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~25 bodies + ~12
headers) and **eleven hand-written scenarios**.

| Block                                                                                                            | Purpose                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `for (const { name, body } of SOLIDGATE_CHECKOUT_BODIES) test(…)`                                                | Bulk-loop walk of every plausible body shape (~25 bodies covering Zod-valid, schema-violation, bypass-key, and open-redirect probes). |
| `for (const { name, headers } of SOLIDGATE_CHECKOUT_HEADERS) test(…)`                                            | Bulk-loop walk of every plausible header shape (~12 headers including fabricated cookies, Bearer tokens, and admin-shaped probes). |
| `test('… returns 401 with the canonical two-key envelope on the unauth branch', …)`                              | Pins the load-bearing two-key 401 envelope shape exactly: `{ error: 'Unauthorized', message: 'Authentication required' }`. |
| `test('… keeps the 401 envelope shape stable across body permutations', …)`                                      | Strict envelope-shape invariance: `Object.keys(body).sort() === ['error', 'message']` across every body permutation. |
| `test('… 401 envelope does NOT echo Zod issue paths', …)`                                                        | Pins that `safeParse(...)` runs only AFTER the auth gate — `amount` / `successUrl` / `cancelUrl` / `mode` / `Invalid request body` / `Invalid JSON` must NEVER appear in the unauth response. |
| `test('… 401 envelope does NOT echo success-branch keys', …)`                                                    | Pins that `createPaymentIntent(...)` runs only AFTER the auth gate — `data` / `id` / `url` / literal `status: 200` must NEVER appear. |
| `test('… 401 does NOT leak the caller-supplied successUrl / cancelUrl', …)`                                      | Open-redirect leak invariant — the unauth branch must NEVER echo the attacker URL.                                 |
| `test('… 401 does NOT downgrade to 400 / 500 on malformed JSON before the gate', …)`                             | Pins that the inner `request.json()` try/catch runs only AFTER the auth gate.                                      |
| `test('… catch branch is NOT entered on the unauth branch', …)`                                                  | Pins that the outer 500 catch is unreachable on the unauth branch (status `< 500` and the catch's `message` value must NEVER appear). |
| `test('… every error message comes from the allowed list', …)`                                                   | Pins the static-string set: 1-message set (only `'Unauthorized'` is reachable on the unauth surface).              |
| `test('… side-channel cookies / headers do NOT satisfy the gate', …)`                                            | Side-channel walk: fabricated cookies, Bearer tokens, admin-shaped headers must NEVER satisfy `auth()`.            |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                      | Method-resolution walk. POST is the only exported method.                                                          |
| `test('… 401 status invariant under any plausible bypass body', …)`                                              | Status-stability walk: every documented bypass-key shape must round-trip to the same 401 as the empty-body baseline. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every body / header
   permutation (~37 total) must round-trip to a `< 500`
   status.
2. **First-gate 401 invariant** — the unauth branch
   returns 401 deterministically.
3. **TWO-key 401 envelope shape** —
   `{ error: 'Unauthorized', message: 'Authentication
   required' }` exactly.
4. **No-body-key-bypass invariant** — the 401 is
   invariant under any combination of plausible body keys.
5. **No-Zod-issue-leak invariant** — schema details must
   NEVER leak to anonymous callers.
6. **No-success-key-leak invariant** — `data` / `id` /
   `url` / literal `status: 200` must NEVER appear on the
   unauth branch.
7. **No-redirect-leak invariant** — caller-supplied
   `successUrl` / `cancelUrl` values must NEVER be echoed
   in the unauth response body.
8. **Catch-branch non-entry** — the unauth branch must
   NEVER reach the 500 outer catch.
9. **Static-string allow-list** — only `'Unauthorized'`
   is reachable on the unauth surface.
10. **Side-channel isolation** — fabricated cookies /
    headers do NOT satisfy `auth()`.
11. **Cross-method invariance** — GET / PUT / PATCH /
    DELETE must round-trip to `< 500`.

## See also

- [`solidgate-webhook-body-spec.md`](solidgate-webhook-body-spec.md) — the sibling Solidgate route's
  webhook POST smoke. Same provider singleton, completely
  different gate posture (signature verification vs
  session auth).
- [`polar-subscription-portal-body-spec.md`](polar-subscription-portal-body-spec.md) — the
  closest analogue (auth-gated POST, 401-before-
  everything posture). Diverges in envelope-key count
  (one vs two), success-envelope shape, and catch-status
  default (400 vs 500).
- The multi-provider sibling
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
  covers Stripe / LemonSqueezy / Polar / Solidgate with a
  single `< 500` assertion each. This spec drills into the
  Solidgate POST surface specifically.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 002 — Plugin Architecture](../spec/002-plugin-architecture/spec.md)
  governs the payment-provider abstraction layer (the
  `solidgateProvider`, `polarProvider`, etc. singletons
  the routes call).
