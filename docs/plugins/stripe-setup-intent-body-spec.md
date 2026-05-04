---
id: stripe-setup-intent-body-spec
title: E2E Stripe Setup-Intent Body Spec (apps/web-e2e/tests/api/stripe-setup-intent-body.spec.ts)
sidebar_label: E2E Stripe Setup-Intent Body Spec
sidebar_position: 572
---

# E2E Stripe Setup-Intent Body Spec — `apps/web-e2e/tests/api/stripe-setup-intent-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe setup-intent creation POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-setup-intent-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-setup-intent-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **zero-argument
`POST()` handler signature** — no `request`
parameter at all. EVERY prior per-source-file POST
smoke takes either a `NextRequest` or `Request`
parameter. This is the FIRST zero-arg POST contract
in the rollout.

It is also the **first per-source-file POST smoke**
that pins a **raw payment-provider object as the
success payload** (`return NextResponse.json
(setupIntent)` returns the Stripe SetupIntent object
verbatim, NO `{ success, data, message }` wrapper
envelope). This makes the spec's no-`client_secret`-
leak assertion a CRITICAL security invariant: a
regression that ran `createSetupIntent(...)` before
the auth gate would expose the SetupIntent's
`client_secret` field, giving any caller the ability
to attach a payment method to the fabricated
customer.

## What's distinct from EVERY prior POST smoke

- **Zero-argument `POST()` signature:** no `request`
  parameter. NO body parse, NO header read, NO
  query-param read.
- **Bare 401 envelope** `{ error: 'Unauthorized' }` —
  UNIQUE: distinct from the stripe-checkout sibling's
  TWO-key envelope `{ error, message }` and the
  canonical `{ success: false, error }` envelope.
- **`!session?.user` gate** (matches stripe-checkout;
  distinct from auth-change-password's
  `!session?.user?.id`).
- **Raw provider-object success payload:** no wrapper
  envelope. The response IS the Stripe SetupIntent
  object directly.
- **Single-line catch:** `{ error: 'Failed to create
  setup intent' }` 500. The simplest catch in any
  per-source-file POST smoke.
- **`stripeProvider.createSetupIntent(session.user)`**
  is the only load-bearing call — no pre-validation,
  no helper pipeline.

## Why this spec is the zero-arg + raw-provider-object setup-intent smoke

The route under test
([`apps/web/app/api/stripe/setup-intent/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/setup-intent/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 `{ error: 'Unauthorized' }` (bare envelope).
2. **`getOrCreateStripeProvider()` singleton
   initialization** — happens AFTER the auth gate.
3. **`stripeProvider.createSetupIntent(session.user)`**
   — load-bearing call with NO body parse, NO body
   validation.
4. **Success payload** — raw SetupIntent object (NO
   wrapper envelope) with status 200.
5. **Outer catch** — 500 `{ error: 'Failed to create
   setup intent' }`.
6. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~10 headers + ~10
bodies) and **ten hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of STRIPE_SETUP_INTENT_HEADERS) test(…)`                                | Bulk-loop walk of every plausible header shape (~10 headers).                                                                          |
| `for (const { data, label } of STRIPE_SETUP_INTENT_BODIES) test(…)`                                    | Bulk-loop walk of body shapes (all IGNORED by zero-arg handler).                                                                       |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                         | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key (NO success key)', …)`                               | Strict envelope-shape assertion: ONE key, no `success`/`message`/`data`.                                                               |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                       | Pins the gate-before-post-auth order across one candidate message.                                                                     |
| `test('… does NOT echo a SetupIntent client_secret on the unauth branch', …)`                          | CRITICAL security invariant — the SetupIntent's `client_secret` must NEVER leak.                                                       |
| `test('… does NOT echo any Stripe SetupIntent fields on the unauth branch', …)`                        | Pins the full set of SetupIntent fields (`id` / `client_secret` / `status` / `usage` / `customer` / `created`) as forbidden on unauth. |
| `test('… body content is IGNORED (zero-arg handler signature)', …)`                                    | Pins that the zero-arg handler ignores body content — arbitrary bodies must produce the same response as the no-body baseline.        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… createSetupIntent + provider initialization are NOT entered on the unauth branch', …)`        | Pins the gate-before-provider-call order — CRITICAL: the `client_secret` must NEVER appear on the unauth branch.                       |
| `test('… catch-branch message is NOT echoed on the unauth branch', …)`                                 | Pins the gate-before-catch order: `'Failed to create setup intent'` must NEVER fire on unauth.                                         |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~20 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no `success`/`message`/`data` leak.
4. **No-SetupIntent-`client_secret`-leak invariant**
   (CRITICAL).
5. **No-SetupIntent-fields-leak invariant** for the
   full set of fields.
6. **Body-IGNORED invariant** — zero-arg handler
   does not parse body.
7. **Side-channel isolation**.
8. **Cross-method invariance** — POST is the only
   exported method.
9. **Gate-before-provider-call invariant**.
10. **Gate-before-catch invariant**.

## See also

- The Stripe checkout POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md)
  uses a TWO-key 401 envelope (NOT bare like this
  setup-intent spec).
- The Stripe webhook signature-verified POST sibling
  [`stripe-webhook-body-spec.md`](stripe-webhook-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
