---
id: sponsor-ads-user-id-renew-body-spec
title: E2E Sponsor-Ads User [id] Renew Body Spec (apps/web-e2e/tests/api/sponsor-ads-user-id-renew-body.spec.ts)
sidebar_label: E2E Sponsor-Ads User [id] Renew Body Spec
sidebar_position: 573
---

# E2E Sponsor-Ads User [id] Renew Body Spec — `apps/web-e2e/tests/api/sponsor-ads-user-id-renew-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**user-owned sponsor-ad renew POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/sponsor-ads-user-id-renew-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-id-renew-body.spec.ts).

This is the **seventy-third** per-source-file reference
the docs tree publishes for any file under
`apps/web-e2e/tests/` and the **seventy-first** under
`apps/web-e2e/tests/api/`.

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **swallow-and-continue
body-parse contract**: the handler wraps `await
request.json()` in a try/catch where the catch is empty
(`/* Body is optional */`) — malformed JSON OR missing
body silently leaves `successUrl` and `cancelUrl` as
`undefined`. Distinct from the sibling cancel route's
[`sponsor-ads-user-id-cancel-body-spec.md`](./sponsor-ads-user-id-cancel-body-spec.md)
**silent-coalesce-to-{}** contract (`await request.
json().catch(() => ({})) ?? {}`): the renew route does
NOT coalesce to `{}`; it leaves the destructured values
untouched. EVERY prior POST smoke either uses the
silent-coalesce-to-{} pattern, an explicit 400 on
malformed JSON, or no body parse at all. This is the
FIRST swallow-and-continue body-parse contract.

It is also the **first per-source-file POST smoke**
that pins **TWO open-redirect-validated URLs in the
SAME body** (`successUrl` AND `cancelUrl`), each
passed through the SAME `validateRedirectUrl` helper
that compares `protocol`, `hostname`, AND `port`
against `appUrl`.

It is also the **first per-source-file POST smoke**
that pins a **multi-provider `switch` dispatch with
default-case 400** (Stripe / LemonSqueezy / Polar /
default → 400 `'Payment configuration is incomplete.
Please contact support.'`).

It is also the **first per-source-file POST smoke**
that pins a **state-machine 400 branch with status
interpolation**: `Cannot renew sponsor ad with status:
${sponsorAd.status}. Only active or expired ads can be
renewed.` Whitelist gate (`renewableStatuses.
includes(...)`) on `[ACTIVE, EXPIRED]`.

This spec **completes the user-owned sponsor-ad
action POST pair** — its sibling is the cancel route
covered by
[`sponsor-ads-user-id-cancel-body-spec.md`](./sponsor-ads-user-id-cancel-body-spec.md).

## What's distinct from EVERY prior POST smoke

- **Swallow-and-continue body parse:** `try { const
  body = await request.json(); successUrl = body.
  successUrl; cancelUrl = body.cancelUrl; } catch {
  /* Body is optional */ }`. The FIRST per-source-
  file POST smoke pinning a swallow-and-continue
  body-parse contract. Distinct from the sibling
  cancel route's silent-coalesce-to-{} pattern.
- **TWO open-redirect-validated URLs:**
  `validateRedirectUrl(successUrl)` AND
  `validateRedirectUrl(cancelUrl)`. Both pass through
  the SAME helper that compares `protocol`,
  `hostname`, AND `port` against `appUrl`. Failed
  validation falls back to defaults — the unsafe
  URLs are SILENTLY dropped (a `console.warn` is
  emitted but the request continues with the safe
  defaults).
- **Multi-provider switch dispatch with default-case
  400:** Stripe / LemonSqueezy / Polar / default →
  400 `'Payment configuration is incomplete. Please
  contact support.'`.
- **State-machine 400 branch with status
  interpolation:** `Cannot renew sponsor ad with
  status: ${sponsorAd.status}. Only active or expired
  ads can be renewed.` Whitelist gate
  (`renewableStatuses.includes(...)`) on
  `[ACTIVE, EXPIRED]`.
- **Price configuration check with 400:** `'Payment
  configuration is incomplete. Please contact
  support.'` (the SAME message as the default-case
  400 above — a regression that swaps either branch's
  message would be observable here).
- **Checkout-URL null-check with 500:** `'Failed to
  create checkout URL. Please try again.'` — pin the
  post-checkout null-URL branch.
- **Outer catch with single-message 500:** `'Failed
  to create renewal checkout session'`. Distinct
  from the cancel route's THREE-branch outer catch.

## Why this spec is the swallow-and-continue + TWO-URL open-redirect-prevention sponsor-ad renew smoke

The route under test
([`apps/web/app/api/sponsor-ads/user/[id]/renew/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/user/[id]/renew/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized' }`
   (one-key envelope).
2. **`{ id }` param resolution** via dynamic-segment
   route.
3. **Body parse with swallow-and-continue** — `try {
   const body = await request.json(); successUrl =
   body.successUrl; cancelUrl = body.cancelUrl; }
   catch { /* Body is optional */ }`.
4. **`sponsorAdService.getSponsorAdById(id)`** → 404
   `'Sponsor ad not found'`.
5. **Ownership verification** — `sponsorAd.userId
   !== session.user.id` → 403 `'You do not have
   permission to renew this sponsor ad'`.
6. **State-machine renewable-status check** —
   `renewableStatuses = [ACTIVE, EXPIRED]`; if not
   in whitelist → 400 `Cannot renew sponsor ad with
   status: ${status}. Only active or expired ads can
   be renewed.`.
7. **`getPriceId(interval, ACTIVE_PAYMENT_PROVIDER)`**
   → 400 `'Payment configuration is incomplete.
   Please contact support.'` if `priceId` is null.
8. **`validateRedirectUrl(successUrl)`** AND
   **`validateRedirectUrl(cancelUrl)`** with fallback
   to default URLs.
9. **Multi-provider switch dispatch:** `STRIPE` →
   `createStripeRenewalCheckout`; `LEMONSQUEEZY` →
   `createLemonSqueezyRenewalCheckout`; `POLAR` →
   `createPolarRenewalCheckout`; default → 400
   `'Payment configuration is incomplete. Please
   contact support.'`.
10. **`!checkoutResult.url` null-check** → 500
    `'Failed to create checkout URL. Please try
    again.'`.
11. **Success payload** — `{ success: true, data:
    { checkoutId, checkoutUrl, provider }, message:
    'Renewal checkout session created successfully' }`.
12. **Outer catch** — 500 `{ success: false, error:
    'Failed to create renewal checkout session' }`.
13. **Method-resolution surface** — the route exports
    ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
    must round-trip to a `< 500` status.

## Cross-route sponsor-ad action POST pair matrix

| Route                                            | Body-parse contract                                | Validation chain                                                  | Outer catch                                                       |
| ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `POST /api/sponsor-ads/user/[id]/renew` (this)   | **Swallow-and-continue** (`try { ... } catch {}`)  | State-machine whitelist + `validateRedirectUrl` × 2 + provider switch | **Single-message** 500 `'Failed to create renewal checkout session'` |
| `POST /api/sponsor-ads/user/[id]/cancel`         | Silent-coalesce-to-{} (`...catch(() => ({})) ?? {}`) | Conditional Zod `.omit({ id: true }).safeParse(body)`              | THREE-branch (404 / 400 / 500) outer catch                         |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~20
bodies) and **fourteen hand-written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of SPONSOR_ADS_RENEW_HEADERS) test(…)`                                  | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of SPONSOR_ADS_RENEW_BODIES) test(…)`                                      | Bulk-loop walk of every plausible body shape (~20 bodies covering swallow-and-continue probes, open-redirect probes, bypass, padding). |
| `test('… returns 401 with the canonical one-key Unauthorized envelope', …)`                            | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                               |
| `test('… envelope shape has exactly success and error keys', …)`                                       | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                              | Negative-property assertion: `data` key must NOT appear.                                                                               |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                        | Pins the gate-before-post-auth order across six candidate messages.                                                                    |
| `test('… swallow-and-continue body-parse handles malformed JSON without 400', …)`                      | Pins the swallow-and-continue contract: malformed JSON does NOT produce an 'Invalid JSON' 400.                                         |
| `test('… has a stable status across header / body permutations', …)`                                   | Seven body permutations vs the no-body baseline.                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                       | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… ownership / not-found / state-machine / getPriceId are NOT entered on the unauth branch', …)` | Pins the gate-before-post-auth-chain order.                                                                                            |
| `test('… multi-provider switch dispatch is NOT entered on the unauth branch', …)`                      | Pins the gate-before-provider-switch order.                                                                                            |
| `test('… state-machine status interpolation is NOT entered on the unauth branch', …)`                  | Pins the gate-before-state-machine-interpolation order with XSS-shaped status probes.                                                  |
| `test('… open-redirect successUrl + cancelUrl values are NOT echoed on the unauth branch', …)`         | CRITICAL: caller-supplied attacker URLs must NEVER appear in the unauth response or in any redirect-style header.                      |
| `test('… javascript: / data: / protocol-relative URLs are NOT echoed on the unauth branch', …)`        | Pins that dangerous URL pseudo-protocols are NEVER echoed.                                                                             |
| `test('… outer catch single-message 500 is NOT entered on the unauth branch', …)`                     | Pins the gate-before-outer-catch order.                                                                                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~29 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Swallow-and-continue body-parse invariant** —
   malformed JSON must NEVER produce an 'Invalid
   JSON' 400.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is the only
   exported method.
10. **Gate-before-ownership-and-state-machine
    invariant**.
11. **Gate-before-provider-switch invariant**.
12. **Gate-before-state-machine-interpolation
    invariant**.
13. **No-attacker-URL-leak invariant** — CRITICAL:
    open-redirect attacker URLs (`successUrl` /
    `cancelUrl`) must NEVER appear in the unauth
    response or in any redirect-style header.
14. **No-dangerous-URL-pseudo-protocol-leak
    invariant** — `javascript:` / `data:` / `file:` /
    protocol-relative `//host` URLs must NEVER be
    echoed.
15. **Gate-before-outer-catch invariant**.

## What this spec does NOT cover

- The 200 success branch. Authenticated, owning
  callers must use the
  [`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
  driver paired with a sponsor-ad-bearing fixture.
- The 403 ownership-mismatch branch. Requires a
  sponsor ad owned by a different user.
- The 404 `'Sponsor ad not found'` branch. Requires
  a session.
- The 400 state-machine branch (`PENDING` /
  `CANCELLED` status) with the actual status echoed.
  Requires a session and a non-renewable sponsor ad.
- The 400 `'Payment configuration is incomplete'`
  branch. Requires a session, a renewable ad, and
  missing price IDs in env.
- The 500 outer-catch branch (which requires a
  payment-provider failure to fire and is out of
  scope for the smoke layer).

## See also

- The sibling user-owned sponsor-ad cancel POST smoke
  [`sponsor-ads-user-id-cancel-body-spec.md`](./sponsor-ads-user-id-cancel-body-spec.md)
  uses a different body-parse contract (silent-
  coalesce-to-{}) and a different outer catch
  (THREE-branch dispatcher) on the SAME
  `sponsorAdService` and the SAME ownership-
  verification chain.
- The sibling sponsor-ads checkout POST smoke
  [`sponsor-ads-checkout-body-spec.md`](./sponsor-ads-checkout-body-spec.md)
  uses a similar multi-provider dispatch but for ad
  CREATION rather than RENEWAL.
- The public sponsor-ads list smoke
  [`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
  covers the GET surface of `/api/sponsor-ads`.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 004 — Payment Providers](../spec/004-payment-providers/spec.md)
  governs the multi-provider dispatch surface this
  route consumes.
