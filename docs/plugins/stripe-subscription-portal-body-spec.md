---
id: stripe-subscription-portal-body-spec
title: E2E Stripe Subscription Portal Body Spec (apps/web-e2e/tests/api/stripe-subscription-portal-body.spec.ts)
sidebar_label: E2E Stripe Subscription Portal Body Spec
sidebar_position: 590
---

# E2E Stripe Subscription Portal Body Spec — `apps/web-e2e/tests/api/stripe-subscription-portal-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe billing-portal session-creation POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-subscription-portal-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-portal-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes for a Stripe billing-portal
session-creation endpoint. The Polar customer-portal
sibling is documented at
[`polar-subscription-portal-body-spec.md`](polar-subscription-portal-body-spec.md);
this Stripe-side handler is structurally distinct in
EVERY post-auth branch.

## What's distinct from EVERY prior Stripe per-source-file smoke AND the polar-subscription-portal-body sibling

- **Zero-arg POST signature** — the handler is declared
  as `export async function POST()` with NO `request` /
  `context` arguments. UNIQUE among all per-source-file
  Stripe POST smokes — every other Stripe POST handler
  reads the request to parse a body or extract a
  header. The billing-portal route is the FIRST per-
  source-file POST smoke pinning a zero-arg POST
  contract.
- **`!session?.user` gate** with a **ONE-key
  `{ error: 'Unauthorized' }` envelope** (NO `success`
  key, NO `message` key — distinct from stripe-
  checkout's TWO-key `{ error: 'Unauthorized', message:
  'Authentication required' }` envelope and stripe-
  setup-intent-id's TWO-key `{ success: false, error:
  'Unauthorized' }` envelope).
- **`getCustomerId(...)` returns null → 404 ONE-key
  `{ error: 'Stripe customer ID not found' }`**
  envelope.
- **`buildUrl('/settings/billing')` + `new URL(...)`
  URL-validation contract** — if `new URL(returnUrl)`
  throws, the handler emits a TWO-key 500 envelope
  `{ error: 'Invalid return URL configuration',
  message: 'The application URL is not properly
  configured' }`. UNIQUE — no prior per-source-file
  smoke pins a `new URL()` validation contract on a
  constructed return URL.
- **FOUR-key Stripe-error catch envelope** —
  `stripeInstance.billingPortal.sessions.create(...)`
  wrapped in an INNER try/catch that emits 400
  `{ error: 'Invalid request to Stripe', message,
  code, type }`. UNIQUE — the FIRST per-source-file
  POST smoke pinning a FOUR-key envelope with both
  `code` AND `type` fields surfaced from the Stripe
  error object (vs payment-methods-create's THREE-key
  `{ error, message, code }` and other handlers' TWO-
  key shapes).
- **Structured `Logger.create('StripePortal')` call**
  in the inner catch — vs the bare `console.error`
  used by every other Stripe POST handler. The FIRST
  per-source-file POST smoke pinning a structured-
  logger contract on the inner Stripe-error branch.
- **`safeErrorMessage(...)` helper** in BOTH the
  inner-stripe-error catch AND the outer catch —
  used to extract a safe message from the Stripe
  error / generic Error. Matches stripe-checkout's
  pattern but distinct in the inner-vs-outer dispatch
  contract.
- **TWO-key outer-catch 500 envelope** — `{ error:
  'Failed to create billing portal session',
  message }` (matches the inner-URL-validation
  catch's TWO-key shape but DISTINCT from the
  inner-stripe-error catch's FOUR-key shape).

## Why this spec is the first Stripe billing-portal POST smoke

The route under test
([`apps/web/app/api/stripe/subscription/portal/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscription/portal/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user` →
   401 ONE-key `{ error: 'Unauthorized' }`.
2. **`initializeStripeProvider()` +
   `getStripeInstance()`** — happens AFTER the auth
   gate.
3. **`stripe.getCustomerId(session.user as any)`** —
   load-bearing customer-id lookup; null → 404
   ONE-key `{ error: 'Stripe customer ID not
   found' }`.
4. **`buildUrl('/settings/billing')` + `new URL(...)`
   URL-validation** — invalid URL → 500 TWO-key
   `{ error: 'Invalid return URL configuration',
   message: 'The application URL is not properly
   configured' }`.
5. **`stripeInstance.billingPortal.sessions.create
   ({ customer, return_url })`** — load-bearing
   Stripe SDK call wrapped in INNER try/catch.
6. **Inner-stripe-error catch** — 400 FOUR-key
   `{ error: 'Invalid request to Stripe', message,
   code, type }`.
7. **Success payload** — 200 `{ success: true,
   data: response, message: 'Billing portal session
   created' }`.
8. **Outer catch** — 500 TWO-key `{ error: 'Failed
   to create billing portal session', message }`.
9. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers
and ~9 bodies) and **twelve hand-written scenarios**.

| Block                                                                                                                                                | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                                                                | ~9 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                                                                  | ~9 bodies (the handler is zero-arg POST and never reads the body — the bodies pin that NO body shape can influence the unauth branch). |
| `test('… returns 401 with the canonical one-key Unauthorized envelope', …)`                                                                          | Pins the canonical envelope.                                                                                                           |
| `test('… envelope shape has exactly the error key', …)`                                                                                              | Strict ONE-key envelope-shape assertion (no `success` / `message` / `data` / `code` / `type` leak).                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                                                                            | CRITICAL — the portal `url` / `id` / `customer` must NEVER leak on unauth.                                                             |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                                                                      | Pins the gate-before-post-auth order across six candidate messages.                                                                    |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                                                                     | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                                                          | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… initializeStripeProvider / getCustomerId / billingPortal.sessions.create are NOT entered on the unauth branch', …)`                         | CRITICAL — pins that the load-bearing Stripe SDK calls NEVER run on unauth.                                                            |
| `test('… URL-validation catch is NOT entered on the unauth branch', …)`                                                                              | Pins the gate-before-URL-validation order (no `'Invalid return URL configuration'` or `'The application URL is not properly configured'` leak). |
| `test('… inner-stripe-error catch (FOUR-key envelope) is NOT entered on the unauth branch', …)`                                                      | CRITICAL — pins that the FOUR-key `{ error, message, code, type }` envelope NEVER surfaces on unauth.                                  |
| `test('… outer catch (TWO-key 500 envelope) is NOT entered on the unauth branch', …)`                                                                | Pins the gate-before-outer-catch order.                                                                                                |
| `test('… no-stripe-error-message-leak invariant on the unauth branch', …)`                                                                           | Pins that no stripe-error substring (`'No such customer'`, `'resource_missing'`, `'billing_portal'`) leaks on unauth.                  |
| `test('… body-shape invariance — bare / empty / payloaded all produce IDENTICAL unauth envelope', …)`                                                | Pins the unauth 401 envelope is IDENTICAL across body shapes (the handler is zero-arg POST and never reads the body).                  |
| `test('… has a stable status across header / body permutations', …)`                                                                                 | Cross-permutation status invariance.                                                                                                   |
| `test('… no-XSS / open-redirect leak invariant on the unauth branch', …)`                                                                            | Pins that hostile body content (XSS payloads, open-redirect URLs) NEVER appears in the response.                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header and
   body permutation must round-trip to a `< 500`
   status.
2. **Canonical envelope** `{ error: 'Unauthorized' }`
   on the unauth branch.
3. **Strict ONE-key envelope-shape preservation** —
   no `success` / `message` / `data` / `code` / `type`
   leak.
4. **No-portal-url-leak invariant** (CRITICAL).
5. **Gate-before-post-auth invariant**.
6. **Side-channel isolation**.
7. **Cross-method invariance** — POST is the only
   exported method.
8. **Gate-before-Stripe-SDK-calls invariant**
   (CRITICAL).
9. **Gate-before-URL-validation invariant**.
10. **Gate-before-inner-stripe-error-catch invariant**
    (CRITICAL).
11. **Gate-before-outer-catch invariant**.
12. **No-stripe-error-message-leak invariant**.
13. **Body-shape invariance** — IDENTICAL 401
    envelope across body shapes.
14. **Cross-permutation status invariance**.
15. **No-XSS / open-redirect leak invariant**.

## See also

- The Polar customer-portal sibling
  [`polar-subscription-portal-body-spec.md`](polar-subscription-portal-body-spec.md)
  uses a different provider's portal pattern.
- The Stripe checkout root POST sibling
  [`stripe-checkout-body-spec.md`](stripe-checkout-body-spec.md)
  uses a TWO-key Unauthorized envelope vs the
  ONE-key envelope here.
- The Stripe setup-intent [id] GET sibling
  [`stripe-setup-intent-id-query-spec.md`](stripe-setup-intent-id-query-spec.md)
  uses a different `{ success: false, error }`
  TWO-key Unauthorized envelope.
- The Stripe payment-methods create POST sibling
  [`stripe-payment-methods-create-body-spec.md`](stripe-payment-methods-create-body-spec.md)
  uses a different envelope shape on Stripe-error
  catch.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
