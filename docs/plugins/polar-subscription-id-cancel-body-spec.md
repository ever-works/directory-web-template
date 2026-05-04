---
id: polar-subscription-id-cancel-body-spec
title: E2E Polar Subscription [subscriptionId] Cancel Body Spec (apps/web-e2e/tests/api/polar-subscription-id-cancel-body.spec.ts)
sidebar_label: E2E Polar Subscription [subscriptionId] Cancel Body Spec
sidebar_position: 577
---

# E2E Polar Subscription [subscriptionId] Cancel Body Spec — `apps/web-e2e/tests/api/polar-subscription-id-cancel-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Polar subscription-cancel POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/polar-subscription-id-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-subscription-id-cancel-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **Content-Length 413
pre-check** — the handler reads
`request.headers.get('content-length')` BEFORE the
body parse and returns 413 `{ error: 'Request body
too large. Maximum size is 1024 bytes.' }` if the
declared length exceeds 1KB. EVERY prior per-source-
file POST smoke uses status codes 4xx / 5xx in
standard ranges; this is the FIRST 413 (Payload Too
Large) contract in the rollout.

It is also the **first per-source-file POST smoke**
that pins an **IDOR-protection chain** — after the
`getCustomerId` lookup (403 if null), the handler
retrieves the subscription via
`getPolarSubscription(...)` and explicitly checks
`subscriptionCustomerId === userPolarCustomerId`,
returning a **merged 404 message** `'Subscription
not found or access denied'` for both not-found AND
ownership-mismatch cases. The FIRST per-source-file
POST smoke pinning a merged 404+403 IDOR-protection
message.

## What's distinct from EVERY prior POST smoke

- **Content-Length 413 pre-check:** FIRST 413
  contract in the rollout.
- **IDOR-protection chain** with merged 404+403
  message.
- **Private property access via `(polarProvider as
  any).polar`** for direct Polar client access
  (matches polar-checkout one_time branch).
- **Helper-function injection** —
  `getPolarSubscription(...)` takes
  `formatErrorMessage` AND `logger` as dependency-
  injected helpers.
- **TWO-string error-message-detection catch:**
  `error.message.includes('not found') || ... '404'`
  → 404 `'Subscription not found'`;
  `'Unauthorized' || '401'` → 401 `'Unauthorized'`;
  default → `safeErrorResponse(...)` 500.
- **Conditional success message** based on
  `cancelAtPeriodEnd` flag.
- **Body-parse fault tolerance with size-error
  detection** — the inner try/catch on
  `request.json()` detects body-size errors
  (`'exceeded'`, `'too large'`, `'75000'`) and
  returns 413; otherwise silently defaults
  `cancelAtPeriodEnd = true`.

## Why this spec is the IDOR-protected + 413-pre-check Polar subscription-cancel smoke

The route under test
([`apps/web/app/api/polar/subscription/[subscriptionId]/cancel/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/polar/subscription/[subscriptionId]/cancel/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 `{ error: 'Unauthorized' }` (bare envelope).
2. **Content-Length 413 pre-check** — `parseInt
   (contentLength, 10) > 1024` → 413.
3. **Body parse with fault-tolerance** — inner
   try/catch with explicit body-size-error detection.
   Default `cancelAtPeriodEnd = true`.
4. **`{ subscriptionId }` param resolution** via
   dynamic-segment route.
5. **IDOR-protection chain:**
   - `polarProvider.getCustomerId(session.user)` →
     403 `'Unable to verify subscription
     ownership'`.
   - `(polarProvider as any).polar` extraction →
     500 if missing.
   - `getPolarSubscription(subscriptionId,
     polarClient, helpers, 'ownership
     verification')` → 404 `'Subscription not found
     or access denied'` if not found OR ownership
     mismatch.
6. **`polarProvider.cancelSubscription
   (subscriptionId, cancelAtPeriodEnd)`** — load-
   bearing call.
7. **Success payload** — `{ success: true, data: {
   id, status, cancelAtPeriodEnd, currentPeriodEnd,
   priceId, customerId }, message: <conditional> }`
   with status 200.
8. **TWO-string error-message-detection catch**
   dispatching to 404 / 401 / 500 via
   `safeErrorResponse(...)`.
9. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~8 headers + ~10
bodies) and **eleven hand-written scenarios**.

| Block                                                                                          | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                          | ~8 headers.                                                                                                                            |
| Body bulk-loop walk                                                                            | ~10 bodies covering valid bodies, type-violation probes, bypass attempts.                                                              |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                 | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key', …)`                                        | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                      | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order across eight candidate messages.                                                                  |
| `test('… 413 pre-check is NOT triggered on the unauth branch', …)`                             | Pins that a 1.5KB body still produces a `< 500` response (either 401 or 413 acceptable).                                               |
| `test('… has a stable status across header / body permutations', …)`                           | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                    | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                      | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… IDOR-protection chain is NOT entered on the unauth branch', …)`                       | Pins the gate-before-IDOR-chain order.                                                                                                 |
| `test('… cancelSubscription call is NOT entered on the unauth branch', …)`                     | Pins the gate-before-cancel order.                                                                                                     |
| `test('… catch-branch error-message-detection is NOT entered on the unauth branch', …)`        | Pins the gate-before-catch order.                                                                                                      |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~18 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no other keys.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **413-pre-check-not-triggered-on-unauth
   invariant** — 1.5KB body still produces `< 500`.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance**.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-IDOR-chain invariant** — none of
    the three IDOR-chain error messages (403 / 500 /
    404) may appear on unauth.
12. **Gate-before-cancelSubscription invariant**.
13. **Gate-before-catch-dispatcher invariant** — no
    `'Subscription not found'` or `'Failed to cancel
    subscription'` may appear on unauth.

## See also

- The Polar webhook signature-verified POST sibling
  [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md).
- The Polar checkout POST sibling
  [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)
  uses the SAME `(polarProvider as any).polar`
  private-property-access pattern.
- The Polar subscription portal POST sibling
  [`polar-subscription-portal-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-subscription-portal-body.spec.ts).
- The LemonSqueezy subscription-cancel POST sibling
  [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md)
  uses email-gated auth, THREE-key 401 envelope, and
  `code` field; this Polar cancel spec uses bare 401
  envelope and IDOR-protection.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
