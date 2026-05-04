---
id: lemonsqueezy-reactivate-body-spec
title: E2E LemonSqueezy Reactivate Body Spec (apps/web-e2e/tests/api/lemonsqueezy-reactivate-body.spec.ts)
sidebar_label: E2E LemonSqueezy Reactivate Body Spec
sidebar_position: 579
---

# E2E LemonSqueezy Reactivate Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-reactivate-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**LemonSqueezy subscription-reactivate POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-reactivate-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-reactivate-body.spec.ts).

This is the **complement** to the
[`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md)
sibling — both routes share the same email-gated
auth contract, THREE-key 401 envelope with `code:
'AUTH_REQUIRED'`, Zod `safeParse` validation, and
`timestamp` field in the success envelope. The
reactivate route differs in:

- **Reactivation-specific metadata:** the handler
  calls `updateSubscription({..., metadata: { action:
  'reactivate', reactivateAction: true,
  reactivatedAt: <ISO>, reactivatedBy: session.user.
  email }})`. The FIRST per-source-file POST smoke
  pinning a **session.user.email-in-metadata
  contract** (the user's email is written to
  provider-side metadata as `reactivatedBy`).
- **`safeErrorResponse(...)` direct** in catch: the
  outer catch is a single line `return
  safeErrorResponse(error, 'Failed to reactivate
  subscription')`. Distinct from the sibling cancel
  route's manual FOUR-key catch envelope.
- **Static success message** `'Subscription
  reactivated successfully'` (no conditional branch
  like cancel's `cancelAtPeriodEnd`-dependent
  message).

## Why this spec is the email-in-metadata reactivate smoke

The route under test
([`apps/web/app/api/lemonsqueezy/reactivate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/reactivate/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.
   email` → 401 `{ error: 'Unauthorized', message:
   'Authentication required', code: 'AUTH_REQUIRED' }`
   (same THREE-key envelope as cancel sibling).
2. **JSON body parse** via `await request.json()`
   AFTER auth gate.
3. **`reactivateSubscriptionSchema.safeParse(body)`**
   — failure → 400 `{ error: 'Invalid request data',
   details: <issues>, code: 'VALIDATION_ERROR' }`.
4. **`getOrCreateLemonsqueezyProvider()` singleton
   initialization**.
5. **`lemonsqueezy.updateSubscription({
   subscriptionId, cancelAtPeriodEnd: false,
   metadata: { action, reactivateAction,
   reactivatedAt, reactivatedBy } })`** — load-
   bearing call. NOTE: writes `session.user.email`
   to provider-side metadata as `reactivatedBy`.
6. **Success payload** — `{ success: true, data:
   <result>, message: 'Subscription reactivated
   successfully', timestamp: <ISO> }` with status
   200.
7. **Outer catch** — `safeErrorResponse(error,
   'Failed to reactivate subscription')` →
   typically 500 with the safe-error envelope.
8. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~10
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~9 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                | ~10 bodies covering required-field probes, validation probes, bypass attempts.                                                         |
| `test('… returns 401 with the THREE-key Unauthorized envelope', …)`                                | Pins the same THREE-key envelope as cancel sibling.                                                                                    |
| `test('… envelope shape has exactly error / message / code keys', …)`                              | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate messages.                                                                  |
| `test('… does NOT echo VALIDATION_ERROR code on the unauth branch', …)`                            | Pins the static-code allow-list.                                                                                                       |
| `test('… caller-supplied reactivatedBy is NOT echoed on the unauth branch', …)`                    | Pins that the metadata-spread is NEVER reached on unauth.                                                                              |
| `test('… has a stable status across header / body permutations', …)`                               | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… validation chain is NOT entered on the unauth branch', …)`                                | Pins the gate-before-Zod order.                                                                                                        |
| `test('… updateSubscription call (with metadata write) is NOT entered on the unauth branch', …)`   | Pins the gate-before-provider-call order.                                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~19 total) must round-trip to a
   `< 500` status.
2. **THREE-key envelope** `{ error, message, code:
   'AUTH_REQUIRED' }` (same as cancel sibling).
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Static-code allow-list** — only `AUTH_REQUIRED`
   may appear on unauth.
7. **No-`reactivatedBy`-leak invariant** — caller-
   supplied attacker email must NEVER be echoed.
8. **Status invariance across body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance**.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-validation invariant**.
13. **Gate-before-updateSubscription invariant** —
    no metadata write on unauth.

## See also

- The companion cancel sibling
  [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md)
  uses the same email-gated + 3-key-401 + timestamp
  contract; this reactivate spec is its complement.
- The LemonSqueezy webhook signature-verified POST
  sibling
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md).
- The LemonSqueezy checkout POST sibling
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
