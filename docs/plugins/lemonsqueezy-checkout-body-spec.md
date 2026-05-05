---
id: lemonsqueezy-checkout-body-spec
title: E2E LemonSqueezy Checkout Body Spec (apps/web-e2e/tests/api/lemonsqueezy-checkout-body.spec.ts)
sidebar_label: E2E LemonSqueezy Checkout Body Spec
sidebar_position: 566
---

# E2E LemonSqueezy Checkout Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-checkout-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**auth-gated LemonSqueezy checkout-session creation
POST body / header smoke spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-checkout-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-checkout-body.spec.ts).

This is the **third per-source-file POST smoke for an
auth-gated payment-provider checkout endpoint** the
docs tree publishes (after
[`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
and
[`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)).

## What's distinct from BOTH solidgate-checkout AND polar-checkout siblings

- **`!session?.user?.id` gate** (NOT `!session?.user`
  like polar-checkout and solidgate-checkout). Pins
  the user-id-required 401 contract.
- **Custom validator returning
  `{ isValid, errors[] }`:** the handler calls
  `validateCheckoutRequestBody(body)` from
  `@/lib/payment/config/validation` (NOT Zod
  `safeParse` like solidgate; NOT simple `if
  (!field)` like polar). Errors are joined with
  `', '`. The FIRST per-source-file POST smoke that
  pins a custom-validator contract.
- **Per-call try/catch around `await request.json()`**
  with explicit `'Invalid JSON in request body'`
  400 envelope (matches solidgate-checkout; distinct
  from polar-checkout which has NO try/catch and
  cascades to outer catch).
- **Dev-only PII-sanitized `console.log`:** in
  `NODE_ENV === 'development'` the handler logs the
  truncated email, redacted custom price, and dark-
  mode flag. The FIRST per-source-file POST smoke
  that pins a PII-sanitized dev-only logging
  contract.
- **FOUR-string-scan catch with THREE different
  status codes:** `'Missing required environment
  variables'` → 500 CONFIGURATION_ERROR; `'Invalid
  email format'` → 400 VALIDATION_ERROR; `'Custom
  price must be'` → 400 VALIDATION_ERROR;
  `'Lemonsqueezy'` → 503 PAYMENT_SERVICE_ERROR. The
  FIRST per-source-file POST smoke that pins a four-
  string error-message-detection chain spanning 400 /
  500 / 503.
- **`ERROR_TYPES` enum-typed `error` field:** uses
  constants from `@/lib/payment/config/types`
  (`VALIDATION_ERROR`, `CONFIGURATION_ERROR`,
  `PAYMENT_SERVICE_ERROR`, `INTERNAL_ERROR`). UNIQUE:
  the FIRST per-source-file POST smoke that pins
  enum-typed error codes.
- **GET export with NO auth gate:** the GET handler
  reads query params and creates checkouts WITHOUT
  auth — a Q-010-style finding. The cross-method
  probe pins this divergence from POST.
- **`success: true` discriminant in success
  payload:** distinct from polar-checkout +
  solidgate-checkout which use literal `status: 200`.

## Why this spec is the custom-validator + four-string-scan checkout POST smoke

The route under test
([`apps/web/app/api/lemonsqueezy/checkout/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/checkout/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`auth()` session lookup** — load-bearing first
   gate. `!session?.user?.id` → 401 `{ error:
   'Unauthorized', message: 'Authentication
   required' }` (TWO-key envelope, NOT enum-typed —
   only the catch branch uses ERROR_TYPES).
2. **JSON body parse via `await request.json()`
   INSIDE per-call try/catch** — failure → 400
   `{ error: 'VALIDATION_ERROR', message: 'Invalid
   JSON in request body' }`.
3. **`getOrCreateLemonsqueezyProvider()` singleton
   initialization**.
4. **`validateCheckoutRequestBody(body)`** — custom
   validator returning `{ isValid, errors[] }`.
   Failure → 400 `{ error: 'VALIDATION_ERROR',
   message: <errors.join(', ')> }`.
5. **Dev-only PII-sanitized `console.log`**.
6. **`lemonsqueezyProvider.createCustomCheckout
   ({ email, customPrice, variantId, metadata,
   dark })`** — load-bearing checkout-creation call.
7. **Success payload** — `{ success: true, data:
   { checkoutUrl, email, customPrice, variantId,
   metadata }, message: 'Checkout session created
   successfully' }` with status 200.
8. **Outer catch with FOUR error-message-scan
   branches** (described above).
9. **Method-resolution surface** — the route exports
   `GET` AND `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~17
bodies) and **twelve hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of LEMONSQUEEZY_CHECKOUT_HEADERS) test(…)`                          | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of LEMONSQUEEZY_CHECKOUT_BODIES) test(…)`                              | Bulk-loop walk of every plausible body shape (~17 bodies covering required-field probes, validation probes, bypass attempts).          |
| `test('… returns 401 with the two-key Unauthorized envelope', …)`                                  | Pins the canonical envelope `{ error: 'Unauthorized', message: 'Authentication required' }`.                                           |
| `test('… envelope shape has exactly error and message keys', …)`                                   | Strict envelope-shape assertion: TWO keys, no `success` discriminant.                                                                  |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `success` and `data` keys must NOT appear.                                                                |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across five candidate static messages.                                                            |
| `test('… every error code comes from the allowed list', …)`                                        | Pins the static-string allow-list across `Unauthorized` and the four `ERROR_TYPES` codes.                                              |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk. GET + POST are exported.                                                                                       |
| `test('… JSON-parse-failure surfaces Invalid JSON in request body AFTER auth gate', …)`            | Pins the gate-before-JSON-parse order: malformed bodies on unauth still produce 401, NOT the auth-branch's 400 'Invalid JSON' message. |
| `test('… validation chain is NOT entered on the unauth branch', …)`                                | Pins the gate-before-validation order.                                                                                                 |
| `test('… createCustomCheckout call is NOT entered on the unauth branch', …)`                       | Pins the gate-before-checkout-creation order.                                                                                          |
| `test('… four-string-scan catch (CONFIGURATION_ERROR / PAYMENT_SERVICE_ERROR / INTERNAL_ERROR) is NOT entered on unauth', …)` | Pins the gate-before-catch-dispatcher order: unauth requests must NEVER produce enum-typed error codes from the catch.                 |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **Two-key envelope** `{ error: 'Unauthorized',
   message: 'Authentication required' }` on the
   unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Static-string allow-list** for all unauth-branch
   error codes.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — PUT / PATCH /
   DELETE return `< 500`.
10. **Gate-before-JSON-parse invariant** — the
    `'Invalid JSON in request body'` 400 envelope
    must NEVER fire on the unauth branch.
11. **Gate-before-validation invariant** — the
    custom validator must NEVER run on the unauth
    branch.
12. **Gate-before-checkout-creation invariant**.
13. **Gate-before-catch-dispatcher invariant** — none
    of the three enum-typed error codes
    (`CONFIGURATION_ERROR`, `PAYMENT_SERVICE_ERROR`,
    `INTERNAL_ERROR`) may appear on the unauth
    branch.

## See also

- The first auth-gated checkout POST smoke
  [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
  uses Zod `safeParse` and a 500-default catch.
- The second auth-gated checkout POST smoke
  [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)
  uses simple `if (!productId)` and a mode-dispatched
  branching contract.
- The LemonSqueezy webhook companion
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md)
  covers the signature-verified webhook on the same
  provider (different gate posture).
- The LemonSqueezy list sibling
  [`lemonsqueezy-list-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-list-query.spec.ts)
  covers the GET surface of `/api/lemonsqueezy/list`.
- The multi-provider sibling
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
  covers all four providers' checkout endpoints with
  a single `< 500` assertion each.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
