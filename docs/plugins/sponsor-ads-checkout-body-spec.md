---
id: sponsor-ads-checkout-body-spec
title: E2E Sponsor-Ads Checkout Body Spec (apps/web-e2e/tests/api/sponsor-ads-checkout-body.spec.ts)
sidebar_label: E2E Sponsor-Ads Checkout Body Spec
sidebar_position: 568
---

# E2E Sponsor-Ads Checkout Body Spec — `apps/web-e2e/tests/api/sponsor-ads-checkout-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated multi-provider sponsor-ad checkout-session
creation POST body / header smoke spec** paired with
[`apps/web-e2e/tests/api/sponsor-ads-checkout-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-checkout-body.spec.ts).

This is the **first per-source-file POST smoke for an
auth-gated MULTI-PROVIDER dispatching checkout
endpoint** the docs tree publishes — extending the
auth-gated checkout quartet (Solidgate + Polar +
LemonSqueezy + Stripe) into a quintet by adding a
checkout endpoint that is NOT tied to a single provider
but instead `switch`-dispatches to all three providers
based on `process.env.NEXT_PUBLIC_PAYMENT_PROVIDER`. Pairs
with the existing
[`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
for the public read-side counterpart and the four admin
sponsor-ad specs (
[`admin-sponsor-ads-query`](admin-sponsor-ads-query-spec.md),
[`admin-sponsor-ads-id-method`](admin-sponsor-ads-id-method-spec.md),
[`admin-sponsor-ads-id-approve-method`](admin-sponsor-ads-id-approve-method-spec.md),
[`admin-sponsor-ads-id-reject-method`](admin-sponsor-ads-id-reject-method-spec.md),
[`admin-sponsor-ads-id-cancel-method`](admin-sponsor-ads-id-cancel-method-spec.md)
) for the admin-side write surfaces.

## What's distinct from ALL FOUR siblings in the checkout quartet

- **Multi-provider switch dispatch:** the handler
  `switch (ACTIVE_PAYMENT_PROVIDER)` between
  `PaymentProvider.STRIPE`, `LEMONSQUEEZY`, and `POLAR`,
  falling through to a 400 default on unknown providers.
  The FIRST per-source-file POST smoke that pins a
  three-way provider dispatch via env var.
- **`success: false` envelope on every error branch:**
  distinct from the quartet's two-key `{ error, message }`
  envelopes — sponsor-ads/checkout returns
  `{ success: false, error }` on every error branch
  (matching the admin endpoints' shape).
- **Open-redirect validation:** the handler calls
  `validateRedirectUrl(successUrl)` and
  `validateRedirectUrl(cancelUrl)` to reject cross-origin
  URLs at the application boundary. The FIRST per-source-
  file POST smoke that pins an open-redirect-prevention
  contract: any XSS-shaped or cross-origin URL is
  silently replaced with a default `${appUrl}/sponsor/...`
  route, with a `console.warn` (no echo on the wire).
- **Three-stage post-auth gate stack** (404 → 403 →
  400): after `!session?.user?.id` → 401, the handler
  runs `sponsorAdService.getSponsorAdById` → 404, then
  `sponsorAd.userId !== session.user.id` → 403 (UNIQUE
  — no other checkout has a forbidden branch), then
  `sponsorAd.status !== SponsorAdStatus.PENDING_PAYMENT`
  → 400.
- **`getPriceId(interval, provider)` map:** the handler
  maps `(WEEKLY | MONTHLY) × (STRIPE | LEMONSQUEEZY |
  POLAR)` to env-driven price IDs and short-circuits to
  a generic 400 if the price is not configured. The
  FIRST per-source-file POST smoke that pins a 2×3
  price-matrix lookup.
- **`!session?.user?.id` gate** (matches lemonsqueezy;
  distinct from polar + solidgate + stripe's
  `!session?.user`).
- **Generic 500 on outer catch:** distinct from
  stripe's three-key envelope and solidgate's
  `safeErrorMessage` extraction — sponsor-ads/checkout
  returns the generic `{ success: false, error: 'Failed
  to create checkout session' }` on every catch (no
  detail leak).
- **POST-only export:** distinct from the quartet
  (which all export `GET` + `POST`) — sponsor-ads/
  checkout only exports `POST`, so `GET` joins
  `PUT` / `PATCH` / `DELETE` in the cross-method walk.

## Why this spec is the multi-provider-dispatch sponsor-ad checkout POST smoke

The route under test
([`apps/web/app/api/sponsor-ads/checkout/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/checkout/route.ts))
exports only `POST`. The POST handler combines:

1. **`auth()` session lookup** — load-bearing first
   gate. `!session?.user?.id` → 401 `{ success: false,
   error: 'Unauthorized' }` (TWO-key envelope with
   `success: false` discriminant).
2. **JSON body parse via destructured `await
   request.json()`** AFTER the auth gate — NO per-call
   try/catch (the outer catch covers both malformed
   JSON and downstream errors).
3. **`!sponsorAdId`** → 400 `{ success: false, error:
   'Sponsor ad ID is required' }`.
4. **`sponsorAdService.getSponsorAdById(sponsorAdId)`
   lookup** — null → 404 `{ success: false, error:
   'Sponsor ad not found' }`.
5. **`sponsorAd.userId !== session.user.id`** → 403
   `{ success: false, error: 'You do not have
   permission to pay for this sponsor ad' }`.
6. **`sponsorAd.status !==
   SponsorAdStatus.PENDING_PAYMENT`** → 400
   `{ success: false, error: 'Sponsor ad is not
   awaiting payment. Current status: ${status}' }`.
7. **`getPriceId(interval, provider)` lookup** — null →
   400 `{ success: false, error: 'Payment configuration
   is incomplete. Please contact support.' }`.
8. **`validateRedirectUrl(successUrl / cancelUrl)`** —
   invalid URLs are replaced with default
   `${appUrl}/sponsor/{success|cancel}` routes;
   `console.warn` logs the attempt but the wire
   response NEVER echoes the caller-supplied URL.
9. **Switch on `ACTIVE_PAYMENT_PROVIDER`** — `STRIPE`
   → `createStripeCheckout`, `LEMONSQUEEZY` →
   `createLemonSqueezyCheckout`, `POLAR` →
   `createPolarCheckout`, `default` → 400 `{ success:
   false, error: 'Payment configuration is incomplete.
   Please contact support.' }`.
10. **`!checkoutResult.url`** → 500 `{ success: false,
    error: 'Failed to create checkout URL. Please try
    again.' }`.
11. **Success payload** — `{ success: true, data:
    { checkoutId, checkoutUrl, provider }, message:
    'Checkout session created successfully' }`.
12. **Outer catch** — `{ success: false, error:
    'Failed to create checkout session' }` with status
    500 (generic message, no detail leak).
13. **Method-resolution surface** — the route only
    exports `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~10 headers + ~14
bodies) and **fourteen hand-written scenarios**.

| Block                                                                                                       | Purpose                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of SPONSOR_ADS_CHECKOUT_HEADERS) test(…)`                                    | Bulk-loop walk of every plausible header shape (~10 headers).                                                                         |
| `for (const { data, label } of SPONSOR_ADS_CHECKOUT_BODIES) test(…)`                                        | Bulk-loop walk of every plausible body shape (~14 bodies including open-redirect probes for four URL bypass shapes).                  |
| `test('… returns 401 with the success-false Unauthorized envelope', …)`                                     | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                              |
| `test('… envelope shape has exactly success and error keys', …)`                                            | Strict envelope-shape assertion: TWO keys, `success: false` discriminant, no `message`/`data`/`details` leak.                         |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                                   | Negative-property assertion: `data` key must NOT appear; `success` must be `false`.                                                   |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                             | Pins the gate-before-post-auth order across seven candidate static messages.                                                          |
| `test('… has a stable status across header / body permutations', …)`                                        | Six body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                            | Side-channel walk.                                                                                                                    |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                 | Method-resolution walk — note this includes `GET` (the route is POST-only, distinct from the quartet which all export `GET` + `POST`). |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                                   | Pins the gate-before-body-parse order.                                                                                                |
| `test('… sponsorAdId-required validation is NOT entered on the unauth branch', …)`                          | Pins the gate-before-required-field-check order.                                                                                      |
| `test('… ownership / status / not-found checks are NOT entered on the unauth branch', …)`                   | Pins the gate-before-three-stage-post-auth-stack order.                                                                               |
| `test('… provider-switch dispatch is NOT entered on the unauth branch', …)`                                 | Pins the gate-before-provider-switch order: all three provider branches must NEVER produce a `data.checkoutUrl` on the unauth branch. |
| `test('… catch-branch is NOT entered on the unauth branch', …)`                                             | Pins that the outer catch's generic 500 message must NEVER appear on the unauth branch.                                               |
| `test('… caller-supplied successUrl / cancelUrl values are NEVER echoed (open-redirect prevention)', …)`    | Pins XSS-shaped redirect URLs are NEVER echoed back.                                                                                  |
| `test('… provider-name strings are NEVER echoed on the unauth branch', …)`                                  | Pins that `data.provider` and the active provider name (`'stripe'` / `'lemonsqueezy'` / `'polar'`) are NEVER leaked.                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~24 total) must round-trip to a
   `< 500` status.
2. **Two-key envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation** — exactly
   `success` + `error` keys, `success: false`
   discriminant, no `message`/`data`/`details` leak.
4. **Success-branch-key non-disclosure** — `data` key
   must NOT appear in any unauth response.
5. **Gate-before-post-auth invariant** across seven
   candidate post-auth messages.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — GET / PUT / PATCH /
   DELETE return `< 500` (the route is POST-only;
   Next.js 405).
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-check invariant** —
    the unauth response must NEVER echo `'Sponsor ad
    ID is required'`.
11. **Gate-before-three-stage-post-auth-stack
    invariant** — the unauth response must NEVER echo
    any of the three post-auth gate messages
    (`'Sponsor ad not found'`, `'You do not have
    permission to pay for this sponsor ad'`, or the
    `'Sponsor ad is not awaiting payment.'` prefix).
12. **Gate-before-provider-switch invariant** — none
    of the three provider branches may execute on the
    unauth branch.
13. **Catch-branch-not-entered invariant** — the
    generic 500 `'Failed to create checkout session'`
    message must NEVER appear on the unauth branch.
14. **No-redirect-leak invariant** — caller-supplied
    XSS-shaped `successUrl` / `cancelUrl` values must
    NEVER appear in the unauth response (open-redirect
    prevention contract).
15. **Provider-name non-disclosure invariant** —
    `data.provider` and the literal strings `'stripe'`
    / `'lemonsqueezy'` / `'polar'` must NEVER appear in
    the unauth response.

## See also

- The four sibling auth-gated checkout POST smokes —
  [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
  (Zod `safeParse` + 500-default catch),
  [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)
  (mode-dispatched two-way),
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md)
  (custom validator + four-string-scan catch), and
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md)
  (three-way mode + trial-config + helper-pipeline).
- The public read-side counterpart
  [`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
  covers the `GET /api/sponsor-ads` listing.
- The five admin write-side counterparts —
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-sponsor-ads-id-method-spec.md`](admin-sponsor-ads-id-method-spec.md),
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
  and
  [`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md)
  cover the full admin moderation surface.
- The multi-provider sibling
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
  covers all four payment-provider checkout endpoints
  with a single `< 500` assertion each.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
