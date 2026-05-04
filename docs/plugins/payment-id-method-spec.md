---
id: payment-id-method-spec
title: E2E Payment [subscriptionId] Method Spec (apps/web-e2e/tests/api/payment-id-method.spec.ts)
sidebar_label: E2E Payment [subscriptionId] Method Spec
sidebar_position: 599
---

# E2E Payment [subscriptionId] Method Spec — `apps/web-e2e/tests/api/payment-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-subscription auto-renewal GET + PATCH dynamic-
segment / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/payment-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-id-method.spec.ts).

This is the **first per-source-file dual-method
smoke** the docs tree publishes that pins a
**provider-agnostic** auto-renewal toggle — the
handler accepts `provider` (or `paymentProvider`)
values from the `PaymentProvider` enum and routes the
sync via `getOrCreateProvider(provider)` (works with
Stripe, LemonSqueezy, Polar, Solidgate).

## What's distinct from EVERY prior dual-method smoke

- **Provider-agnostic dual-method** — the FIRST per-
  source-file smoke pinning a
  `getOrCreateProvider(provider)` dispatch contract
  on a per-subscription endpoint (vs the per-
  provider Stripe / LemonSqueezy / Polar siblings
  which hardcode their provider).
- **Provider-source split** — GET reads `provider`
  from the QUERY STRING (`?provider=`), PATCH reads
  `paymentProvider` from the BODY. UNIQUE: the FIRST
  per-source-file dual-method smoke pinning a SAME-
  NAMED-FIELD-from-DIFFERENT-SOURCES contract.
- **Dynamic enum-validation 400 message** —
  `'Invalid payment provider. Must be one of:
  stripe, lemonsqueezy, polar, solidgate'` (UNIQUE:
  the FIRST per-source-file smoke pinning a 400
  message that DYNAMICALLY lists the valid enum
  values via `validProviders.join(', ')`).
- **TWO distinct body-validation 400 messages** on
  PATCH — `'Invalid JSON in request body'` (catch
  around `await request.json()`) vs `'Invalid
  request body. Expected a JSON object.'` (post-
  parse non-object check). The FIRST per-source-
  file PATCH smoke pinning a two-tier body-
  validation chain.
- **Explicit `typeof enabled !== 'boolean'`
  type-check** — `'Invalid request body. "enabled"
  must be a boolean.'` (UNIQUE: pre-Zod boolean
  type-validation, vs Zod's opaque error messages).
- **User-scoped IDOR with explicit message** —
  `'Forbidden: You do not own this subscription'`
  (UNIQUE: the FIRST per-source-file smoke pinning
  a user-scoped 403 message that names ownership).
- **Best-effort provider sync** — if the provider
  sync call throws, the local DB update is
  preserved (handler logs and returns success).
  UNIQUE: the FIRST per-source-file PATCH smoke
  pinning a best-effort provider sync after a
  successful local DB write.
- **Dynamic success message** — the response
  `message` field is one of TWO distinct strings
  based on the `enabled` toggle value ('Auto-
  renewal has been enabled...' / 'disabled...').

## Why this spec is the first provider-agnostic dual-method smoke

The route under test
([`apps/web/app/api/payment/[subscriptionId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/payment/[subscriptionId]/route.ts))
exports `GET` AND `PATCH`. The handlers combine:

1. **GET handler** — `auth()` session lookup
   (`!session?.user?.id` → 401 ONE-key); `{
   subscriptionId } = await params`;
   `searchParams.get('provider') || 'stripe'`; enum
   validation; subscription lookup; user-scoped
   IDOR; success payload `{ subscriptionId,
   autoRenewal, cancelAtPeriodEnd, endDate }`.
2. **PATCH handler** — `auth()` session lookup;
   JSON body parse with try/catch (400 on
   malformed); non-object check (400 on array /
   null); typeof-enabled boolean check (400 on
   non-bool); enum validation;
   `subscriptionService.setAutoRenewal(...)`; best-
   effort provider-sync via `getOrCreateProvider`;
   success payload `{ success: true, subscription:
   <updatedSubscription>, message: <dynamic> }`.
3. **Method-resolution surface** — the route
   exports `GET` AND `PATCH`. `POST` / `PUT` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** (~6 headers
× 2 methods + ~13 PATCH bodies) and **eleven hand-
written scenarios**.

| Block                                                                                                   | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / PATCH)                                                                    | ~6 headers per method.                                                                                                                 |
| PATCH body bulk-loop walk                                                                               | ~13 bodies covering valid toggles, type-violation probes, invalid provider, bypass attempts.                                           |
| `test('GET … returns 401 with the canonical bare ONE-key envelope', …)`                                 | Pins the canonical ONE-key envelope.                                                                                                   |
| `test('PATCH … returns 401 with the canonical bare ONE-key envelope', …)`                               | Pins the canonical ONE-key envelope on PATCH.                                                                                          |
| `test('GET and PATCH … have IDENTICAL 401 envelopes', …)`                                               | Pins byte-identical 401 envelopes across the two methods.                                                                              |
| `test('GET … 401 envelope shape has exactly the error key', …)`                                         | Strict envelope-shape assertion.                                                                                                       |
| `test('PATCH … does NOT echo any of the post-auth messages on the unauth branch', …)`                   | Pins the gate-before-post-auth order across nine candidate messages including the dynamic success messages.                            |
| `test('PATCH … setAutoRenewal is NOT entered on the unauth branch', …)`                                 | CRITICAL — pins that the load-bearing DB write NEVER runs on unauth (no XSS-marker leak).                                              |
| `test('GET … provider-from-query is NOT validated on the unauth branch', …)`                            | Pins the gate-before-enum-validation order on GET.                                                                                     |
| `test('GET … cross-method probe (POST / PUT / DELETE) does NOT 5xx', …)`                                | Method-resolution walk. GET and PATCH are exported.                                                                                    |
| `test('PATCH … does NOT branch on side-channel cookies / headers', …)`                                  | Side-channel walk on PATCH.                                                                                                            |
| `test('PATCH … body-validation chain (malformed JSON, non-object, non-boolean) NEVER fires on unauth', …)` | Pins the gate-before-body-validation order across all three body-shape failures.                                                       |
| `test('GET … cross-subscription-ID invariance — different IDs produce IDENTICAL unauth envelope', …)`   | Pins that the auth gate fires BEFORE any per-subscription-id branch.                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across both methods.
2. **Canonical bare ONE-key envelope** `{ error:
   'Unauthorized' }` on both GET and PATCH unauth
   branches.
3. **Cross-method 401 envelope equality** — GET and
   PATCH return BYTE-IDENTICAL 401 envelopes.
4. **Strict ONE-key envelope-shape preservation**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-DB-mutation invariant** (CRITICAL).
7. **Gate-before-enum-validation invariant** on
   GET — `?provider=` is NOT validated on unauth.
8. **Cross-method invariance** — POST / PUT /
   DELETE return `< 500`.
9. **Side-channel isolation** on PATCH.
10. **Gate-before-body-validation invariant** on
    PATCH — malformed JSON, array body, non-bool
    `enabled` all produce 401 (NOT 400).
11. **Cross-subscription-ID invariance** —
    different IDs produce IDENTICAL unauth
    envelopes.

## See also

- The Stripe-specific subscription-update sibling
  [`stripe-subscription-id-update-body-spec.md`](stripe-subscription-id-update-body-spec.md)
  hardcodes the Stripe provider (vs this provider-
  agnostic dispatch).
- The Stripe-specific subscription-cancel /
  reactivate siblings
  [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  and
  [`stripe-subscription-id-reactivate-body-spec.md`](stripe-subscription-id-reactivate-body-spec.md)
  use POST verbs (vs this PATCH).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
