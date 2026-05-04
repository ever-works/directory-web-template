---
id: polar-checkout-body-spec
title: E2E Polar Checkout Body Spec (apps/web-e2e/tests/api/polar-checkout-body.spec.ts)
sidebar_label: E2E Polar Checkout Body Spec
sidebar_position: 565
---

# E2E Polar Checkout Body Spec — `apps/web-e2e/tests/api/polar-checkout-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated Polar checkout-session creation POST
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/polar-checkout-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-checkout-body.spec.ts).

This is the **second per-source-file POST smoke for
an auth-gated payment-provider checkout endpoint**
the docs tree publishes (after
[`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)).
The existing multi-provider
[`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
covers all four providers' checkout endpoints with a
single `< 500` assertion each; this spec drills into
the Polar handler specifically.

## What's distinct from the solidgate-checkout sibling

- **Branching mode dispatch:** the handler branches
  on `mode === 'subscription'` (default, calls
  `polarProvider.createSubscription(...)`) vs `mode
  === 'one_time'` (calls private `polar.checkouts.
  create(...)` via `(polarProvider as any).polar`).
  The FIRST per-source-file POST smoke that pins a
  mode-dispatched two-branch POST contract.
- **NO Zod validation:** distinct from solidgate
  which uses `checkoutSchema.safeParse(json)`; polar
  uses simple `if (!productId)` check.
- **NO try/catch around `request.json()`:** malformed
  JSON cascades to the OUTER catch. Distinct from
  solidgate's per-call try/catch.
- **503 error-message detection:** outer catch scans
  `error.message` for three strings (`'Payments are
  currently unavailable'`, `'needs to complete their
  payment setup'`, `'payment setup incomplete'`) and
  downgrades 500 → 503 with a custom payment-setup-
  incomplete message. The FIRST per-source-file POST
  smoke that pins a 503-via-error-message-scan
  contract.
- **Private property access via `as any`:** the
  `'one_time'` branch reaches into `(polarProvider as
  any).polar` and `.organizationId`, calling
  `polar.checkouts.create(...)` directly. The FIRST
  per-source-file POST smoke that pins a private-
  property-bypass contract — a regression that re-
  orders this access before the auth gate would
  surface the private-helper internals.
- **GET export companion:** the route exports `GET`
  for retrieve-checkout-by-id. The unauth GET branch
  returns 401 `{ error: 'Unauthorized' }` (ONE-key,
  NOT TWO-key like POST). Distinct from solidgate-
  checkout which is POST-only.

## Why this spec is the mode-dispatched checkout POST smoke

The route under test
([`apps/web/app/api/polar/checkout/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/polar/checkout/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`auth()` session lookup** — load-bearing first
   gate. Missing → 401 `{ error: 'Unauthorized',
   message: 'Authentication required' }` (TWO-key
   envelope).
2. **`getOrCreatePolarProvider()` singleton
   initialization** — happens AFTER the auth gate, so
   the unauth branch never initializes the provider.
3. **JSON body parse via destructured `await
   request.json()`** AFTER the auth gate — NO per-
   call try/catch.
4. **`productId` required check** — `if (!productId)`
   → 400 `{ error: 'Invalid request', message:
   'Product ID is required' }`.
5. **`polarProvider.getCustomerId(session.user)`
   lookup** — failure → 400 `{ error: 'Failed to
   create customer', message: 'Unable to create
   Polar customer' }`.
6. **Mode dispatch:**
   - `mode === 'subscription'` (default): sanitize
     metadata + call `polarProvider.createSubscription
     (...)` + 500 if no URL.
   - `mode === 'one_time'`: access private `polar` +
     `organizationId` via `(polarProvider as any)`,
     sanitize metadata, call `polar.checkouts.create
     (...)`, fail-fast on missing URL.
7. **Success payload** — both branches return `{ data:
   { id, url }, status: 200, message: 'Checkout
   session created successfully' }` (literal
   `status: 200` field).
8. **Outer catch** — scans `error.message` for
   payment-setup-incomplete strings → 503; otherwise
   `safeErrorResponse(error, 'Failed to create
   checkout session')` → 500.
9. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~10 headers + ~14
bodies) and **thirteen hand-written scenarios**.

| Block                                                                                       | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of POLAR_CHECKOUT_HEADERS) test(…)`                          | Bulk-loop walk of every plausible header shape (~10 headers).                                                                          |
| `for (const { data, label } of POLAR_CHECKOUT_BODIES) test(…)`                              | Bulk-loop walk of every plausible body shape (~14 bodies covering required-field probes, both mode branches, bypass attempts).         |
| `test('… returns 401 with the two-key Unauthorized envelope', …)`                           | Pins the canonical envelope `{ error: 'Unauthorized', message: 'Authentication required' }`.                                           |
| `test('… envelope shape has exactly error and message keys', …)`                            | Strict envelope-shape assertion: TWO keys, no `success` discriminant.                                                                  |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                   | Negative-property assertion: `data` key must NOT appear; literal `status: 200` must NOT appear.                                        |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`             | Pins the gate-before-post-auth order across six candidate static messages.                                                             |
| `test('… every error message comes from the allowed list', …)`                              | Pins the static-string allow-list.                                                                                                     |
| `test('… has a stable status across header / body permutations', …)`                        | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                            | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                       | Method-resolution walk. GET + POST are exported.                                                                                       |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                   | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… productId required-check is NOT entered on the unauth branch', …)`                 | Pins the gate-before-validation order.                                                                                                 |
| `test('… mode-dispatch (subscription / one_time) is NOT entered on the unauth branch', …)`  | Pins the gate-before-dispatch order: the unauth response must NEVER echo a `data.url` or `data.id`.                                    |
| `test('… 503 payment-setup-incomplete branch is NOT triggered on the unauth branch', …)`    | Pins the gate-before-catch order: unauth requests must NEVER produce a 503 with the payment-setup-incomplete message.                  |
| `test('… caller-supplied successUrl / cancelUrl values are NOT echoed on the unauth branch', …)` | Pins XSS-shaped redirect URLs are NEVER echoed back — a regression that re-ordered metadata processing before the auth gate would surface here. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~24 total) must round-trip to a
   `< 500` status.
2. **Two-key envelope** `{ error: 'Unauthorized',
   message: 'Authentication required' }` on the
   unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data` key
   and literal `status: 200` must NOT appear in any
   unauth response.
5. **Gate-before-post-auth invariant**.
6. **Static-string allow-list** for all unauth-branch
   error messages.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — PUT / PATCH /
   DELETE return `< 500` (Next.js 405).
10. **Gate-before-body-parse invariant**.
11. **Gate-before-productId-validation invariant**.
12. **Gate-before-mode-dispatch invariant**.
13. **Gate-before-503-detection invariant** — the
    unauth branch must NEVER produce a 503 with the
    payment-setup-incomplete message.
14. **No-redirect-leak invariant** — caller-supplied
    XSS-shaped `successUrl` / `cancelUrl` values must
    NEVER appear in the unauth response.

## See also

- The first auth-gated checkout POST smoke
  [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
  uses Zod `safeParse` and a 500-default catch.
- The Polar webhook companion
  [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
  covers the signature-verified webhook on the same
  provider (different gate posture).
- The Polar subscription portal POST sibling
  [`polar-subscription-portal-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-subscription-portal-body.spec.ts)
  uses a single-key 401 envelope (NOT two-key like
  this checkout POST).
- The multi-provider sibling
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
  covers all four providers' checkout endpoints with
  a single `< 500` assertion each.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
