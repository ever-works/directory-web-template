---
id: polar-subscription-id-reactivate-body-spec
title: E2E Polar Subscription [subscriptionId] Reactivate Body Spec (apps/web-e2e/tests/api/polar-subscription-id-reactivate-body.spec.ts)
sidebar_label: E2E Polar Subscription [subscriptionId] Reactivate Body Spec
sidebar_position: 578
---

# E2E Polar Subscription [subscriptionId] Reactivate Body Spec — `apps/web-e2e/tests/api/polar-subscription-id-reactivate-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Polar subscription-reactivate POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/polar-subscription-id-reactivate-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-subscription-id-reactivate-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **THREE-string error-
message-detection catch** — the outer catch
dispatches to:

- 404 `'Subscription not found'` if `error.message.
  includes('not found') || ... '404'`.
- 401 `'Unauthorized'` if `error.message.includes
  ('Unauthorized') || ... '401'`.
- **400** `'Subscription is not scheduled for
  cancellation'` if `error.message.includes('not
  scheduled for cancellation')` — the **FIRST per-
  source-file POST smoke** pinning a **400 from the
  catch dispatcher** (NOT from a schema validation
  step). EVERY prior POST smoke that pins a 400
  does so via Zod `safeParse`; this is the FIRST
  400 minted from the catch's substring-detection
  on a business-rule violation.

It is also the **first per-source-file POST smoke**
that pins a **NO-BODY POST handler** — the handler
does NOT call `request.json()` at all.
`cancelAtPeriodEnd` is irrelevant; the handler
unconditionally calls
`polarProvider.reactivateSubscription(subscriptionId)`.
EVERY prior POST smoke either parses the body
(lemonsqueezy, polar/cancel, stripe/checkout) OR
explicitly extracts a header (sponsor-ads). This is
the FIRST per-source-file POST smoke pinning a
body-less POST contract.

## What's distinct from EVERY prior POST smoke

- **NO body parsing:** `request.json()` is NEVER
  called. The body is COMPLETELY ignored upstream
  of the auth gate.
- **NO Content-Length 413 pre-check** (distinct
  from polar/cancel sibling which DOES pin a 413
  pre-check).
- **THREE-string catch dispatcher** —
  `'not found'`/`'404'` → 404; `'Unauthorized'`/
  `'401'` → 401; **`'not scheduled for
  cancellation'` → 400** (the new 400 contract).
- **400-from-catch contract** — FIRST POST smoke
  pinning a 400 minted from the catch's substring-
  detection on a business-rule violation.
- **Static success message** `'Subscription
  reactivated successfully'` (NOT conditional based
  on a body flag, distinct from polar/cancel and
  lemonsqueezy/cancel siblings).
- **Same IDOR-protection chain** as polar/cancel
  sibling — `getCustomerId` → 403, private
  `(polarProvider as any).polar` extraction → 500,
  `getPolarSubscription` ownership check → merged
  404.
- **Body-completely-ignored invariance walk** —
  every body permutation must produce the EXACT
  same status AND envelope. Distinct from EVERY
  prior POST smoke which has at least one body-
  driven branch.

## Why this spec is the no-body + 400-from-catch + 3-string Polar subscription-reactivate smoke

The route under test
([`apps/web/app/api/polar/subscription/[subscriptionId]/reactivate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/polar/subscription/[subscriptionId]/reactivate/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 `{ error: 'Unauthorized' }` (bare envelope).
2. **`{ subscriptionId }` param resolution** via
   dynamic-segment route.
3. **IDOR-protection chain:**
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
4. **`polarProvider.reactivateSubscription
   (subscriptionId)`** — load-bearing call with NO
   body-driven flags.
5. **Success payload** — `{ success: true, data: {
   id, status, cancelAtPeriodEnd, currentPeriodEnd,
   priceId, customerId }, message: 'Subscription
   reactivated successfully' }` with status 200.
6. **THREE-string error-message-detection catch**
   dispatching to 404 / 401 / 400 / 500 via
   `safeErrorResponse(...)`.
7. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~8 headers + ~9
bodies) and **twelve hand-written scenarios**.

| Block                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                | ~8 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                  | ~9 bodies covering ignored bodies, type-violation probes, bypass attempts.                                                             |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                       | Pins the bare envelope `{ error: 'Unauthorized' }`.                                                                                    |
| `test('… envelope shape has exactly one error key', …)`                                              | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                            | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                     | Pins the gate-before-post-auth order across seven candidate messages.                                                                  |
| `test('… has a stable status across header / body permutations', …)`                                 | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                     | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                          | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                            | Pins the no-body-parse contract.                                                                                                       |
| `test('… IDOR-protection chain is NOT entered on the unauth branch', …)`                             | Pins the gate-before-IDOR-chain order.                                                                                                 |
| `test('… reactivateSubscription call is NOT entered on the unauth branch', …)`                      | Pins the gate-before-reactivate order.                                                                                                 |
| `test('… catch-branch THREE-string dispatcher is NOT entered on the unauth branch', …)`              | Pins the gate-before-catch order across all three substring-detection branches.                                                        |
| `test('… 400 catch-dispatcher contract is NOT entered on the unauth branch', …)`                    | Pins the no-`'Subscription is not scheduled for cancellation'`-leak invariant.                                                         |
| `test('… body is COMPLETELY ignored on the unauth branch', …)`                                      | Pins the body-completely-ignored invariance — every body permutation produces the EXACT same status AND envelope.                      |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~17 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `error` key, no other keys.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **No-body-parse contract** — malformed JSON
   bodies must NOT 5xx (the body is never parsed).
10. **Gate-before-IDOR-chain invariant** — none of
    the three IDOR-chain error messages (403 / 500 /
    404) may appear on unauth.
11. **Gate-before-reactivateSubscription invariant**.
12. **Gate-before-catch-dispatcher invariant** — no
    `'Subscription not found'`, `'Subscription is
    not scheduled for cancellation'`, or `'Failed to
    reactivate subscription'` may appear on unauth.
13. **No-`'Subscription is not scheduled for
    cancellation'`-leak invariant** — pinning the
    400-from-catch contract.
14. **Body-completely-ignored invariant** — every
    body permutation produces the EXACT same status
    AND envelope (the strongest no-body-parse
    contract in the rollout).

## See also

- The Polar subscription-cancel POST sibling
  [`polar-subscription-id-cancel-body-spec.md`](polar-subscription-id-cancel-body-spec.md)
  uses the SAME IDOR-protection chain and private
  `(polarProvider as any).polar` extraction, BUT
  pins a TWO-string catch dispatcher (no 400
  branch), Content-Length 413 pre-check, body
  parsing with fault-tolerance, and conditional
  success message.
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
  `code` field.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
