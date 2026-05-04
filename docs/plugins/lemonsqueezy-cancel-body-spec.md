---
id: lemonsqueezy-cancel-body-spec
title: E2E LemonSqueezy Cancel Body Spec (apps/web-e2e/tests/api/lemonsqueezy-cancel-body.spec.ts)
sidebar_label: E2E LemonSqueezy Cancel Body Spec
sidebar_position: 576
---

# E2E LemonSqueezy Cancel Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-cancel-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**LemonSqueezy subscription-cancel POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-cancel-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins an **email-gated auth
contract** — `!session?.user?.email` (NOT
`!session?.user`, `!session?.user?.id`, or
`!session?.user?.id?.`). The FIRST per-source-file
POST smoke gating on session email.

It is also the **first per-source-file POST smoke**
that pins a **`code` field in the 401 envelope** —
`{ error: 'Unauthorized', message: 'Authentication
required', code: 'AUTH_REQUIRED' }`. EVERY prior 401
envelope is at most TWO keys (error + message for
the polar/solidgate/stripe/lemonsqueezy checkouts;
success + error for the canonical admin envelope).
This is the FIRST THREE-key 401 envelope with an
enum-typed code field.

It is also the **first per-source-file POST smoke**
that pins a **`timestamp` field in the success AND
catch envelopes** — both branches add an ISO
timestamp via `new Date().toISOString()`.

## What's distinct from EVERY prior POST smoke

- **Email-gated auth:** `!session?.user?.email`. The
  FIRST per-source-file POST smoke gating on session
  email.
- **THREE-key 401 envelope** with `code:
  'AUTH_REQUIRED'` field.
- **`code` field in 400 validation envelope** —
  `{ error, details, code: 'VALIDATION_ERROR' }`.
- **FOUR-key catch envelope** with `code:
  'CANCEL_FAILED'` AND `timestamp` fields. The
  FIRST per-source-file POST smoke pinning a 4-key
  catch envelope.
- **Conditional success message** based on
  `cancelAtPeriodEnd` flag — `'Subscription will be
  cancelled at the end of the current period'` vs
  `'Subscription cancelled immediately'`.
- **`timestamp` field in success AND catch
  envelopes** — load-bearing observability
  contract.
- **`safeErrorMessage` extracted into the catch
  envelope's `message` field** (NOT into the `error`
  field as in stripe-checkout-body).

## Why this spec is the email-gated + code-and-timestamp-fielded subscription-cancel smoke

The route under test
([`apps/web/app/api/lemonsqueezy/cancel/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/cancel/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.
   email` → 401 `{ error: 'Unauthorized', message:
   'Authentication required', code: 'AUTH_REQUIRED' }`.
2. **JSON body parse** via `await request.json()`
   AFTER auth gate (NO try/catch).
3. **`cancelSubscriptionSchema.safeParse(body)`** —
   failure → 400 `{ error: 'Invalid request data',
   details: <issues>, code: 'VALIDATION_ERROR' }`.
4. **`getOrCreateLemonsqueezyProvider()` singleton
   initialization**.
5. **`lemonsqueezy.cancelSubscription
   (subscriptionId, cancelAtPeriodEnd)`** — load-
   bearing call.
6. **Success payload** — `{ success: true, data:
   <result>, message: <conditional>, timestamp:
   <ISO> }` with status 200.
7. **Outer catch** — 500 `{ error: 'Failed to
   cancel subscription', message: safeErrorMessage
   (error, ...), code: 'CANCEL_FAILED', timestamp:
   <ISO> }`.
8. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~13
bodies) and **twelve hand-written scenarios**.

| Block                                                                                                      | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                      | ~9 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                        | ~13 bodies covering required-field probes, type-violation probes, bypass attempts.                                                     |
| `test('… returns 401 with the THREE-key Unauthorized envelope', …)`                                        | Pins the THREE-key envelope `{ error: 'Unauthorized', message: 'Authentication required', code: 'AUTH_REQUIRED' }`.                    |
| `test('… envelope shape has exactly error / message / code keys', …)`                                      | Strict envelope-shape assertion: THREE keys.                                                                                           |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                                  | Negative-property assertion: `success` / `data` / `timestamp` keys must NOT appear.                                                    |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                            | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('… does NOT echo VALIDATION_ERROR or CANCEL_FAILED codes on the unauth branch', …)`                  | Pins the static-code allow-list: only `AUTH_REQUIRED` may appear on unauth.                                                            |
| `test('… does NOT include a timestamp field on the unauth branch', …)`                                     | Pins the no-`timestamp`-leak invariant.                                                                                                |
| `test('… has a stable status across header / body permutations', …)`                                       | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                           | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                                  | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… validation chain is NOT entered on the unauth branch', …)`                                        | Pins the gate-before-Zod order.                                                                                                        |
| `test('… cancelSubscription call is NOT entered on the unauth branch', …)`                                 | Pins the gate-before-provider-call order.                                                                                              |
| `test('… catch-branch four-key envelope is NOT echoed on the unauth branch', …)`                           | Pins the no-`CANCEL_FAILED`-and-no-`timestamp` invariant.                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~22 total) must round-trip to a
   `< 500` status.
2. **THREE-key envelope** `{ error: 'Unauthorized',
   message: 'Authentication required', code:
   'AUTH_REQUIRED' }` on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` + `message` + `code` keys, no `success` /
   `data` / `timestamp` leak.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Static-code allow-list** — only `AUTH_REQUIRED`
   may appear on unauth.
7. **No-`timestamp`-leak invariant**.
8. **Status invariance across body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance**.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-validation invariant**.
13. **Gate-before-cancelSubscription invariant**.
14. **No-catch-branch-fields-leak invariant** —
    `CANCEL_FAILED` code and `'Failed to cancel
    subscription'` message must NEVER appear on
    unauth.

## See also

- The LemonSqueezy webhook signature-verified POST
  sibling
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md).
- The LemonSqueezy checkout POST sibling
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md)
  uses ENUM-typed error codes in the catch (not in
  the 401).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
