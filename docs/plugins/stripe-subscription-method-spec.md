---
id: stripe-subscription-method-spec
title: E2E Stripe Subscription Method Spec (apps/web-e2e/tests/api/stripe-subscription-method.spec.ts)
sidebar_label: E2E Stripe Subscription Method Spec
sidebar_position: 603
---

# E2E Stripe Subscription Method Spec — `apps/web-e2e/tests/api/stripe-subscription-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe collection-level subscription POST + PUT +
DELETE body / header smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-subscription-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-method.spec.ts).

This is the **first per-source-file triple-method
smoke** the docs tree publishes for a Stripe
subscription-management endpoint that documents a
**Q-010-style NO-IDOR finding on PUT AND DELETE** —
the handlers authenticate the session but DO NOT
verify that the `subscriptionId` from the body
actually belongs to the calling user. ANY
authenticated user can update or cancel ANY Stripe
subscription by ID, bypassing the IDOR checks of
the per-id siblings.

## What's distinct from EVERY prior triple-method smoke

- **NO IDOR check on PUT or DELETE** — UNIQUE: the
  FIRST per-source-file triple-method smoke pinning
  a Q-010-style NO-IDOR finding on mutating
  subscriptionId-keyed methods. PUT updates and
  DELETE cancels accept ANY `subscriptionId` from
  any authenticated user — bypassing the IDOR
  checks of the per-id siblings.
- **Different body-required field on POST vs
  PUT/DELETE** — POST requires `priceId` +
  `paymentMethodId`; PUT requires `subscriptionId`;
  DELETE requires `subscriptionId`. UNIQUE: the
  FIRST per-source-file triple-method smoke pinning
  three DIFFERENT required-field shapes on the
  three methods.
- **POST 400 `'Failed to create customer'` branch**
  — UNIQUE: only POST has the `!customerId` check
  (PUT and DELETE skip the customer-id resolution).
- **Returns RAW Stripe subscription object
  verbatim** — UNIQUE: no wrapper envelope on
  success; the FIRST per-source-file triple-method
  smoke pinning a raw-Stripe-object success
  contract on ALL THREE methods.
- **`metadata: { userId: session.user.id }`
  OVERWRITE on PUT** — UNIQUE: PUT writes the
  CALLER'S userId into the subscription's metadata
  regardless of who actually owns the subscription
  (compounds the Q-010 finding; can be used to
  launder ownership records).
- **Bare ONE-key 401 envelope** `{ error:
  'Unauthorized' }` consistent across all three
  methods.

## Why this spec is the first triple-method Stripe-subscription Q-010 smoke

The route under test
([`apps/web/app/api/stripe/subscription/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/subscription/route.ts))
exports `POST`, `PUT`, AND `DELETE`. The handlers
combine:

1. **POST handler** — `!session?.user` → 401; JSON
   body parse; `getOrCreateStripeProvider`;
   `getCustomerId(session.user)`; `!customerId` →
   400 `'Failed to create customer'`;
   `createSubscription(...)` load-bearing call;
   success returns raw Stripe subscription object.
2. **PUT handler** — `!session?.user` → 401; JSON
   body parse; `getOrCreateStripeProvider`;
   `updateSubscription({ subscriptionId, priceId,
   cancelAtPeriodEnd, metadata })` -- **NO IDOR
   CHECK**; success returns raw Stripe subscription
   object.
3. **DELETE handler** — `!session?.user` → 401;
   JSON body parse; `getOrCreateStripeProvider`;
   `cancelSubscription(subscriptionId,
   cancelAtPeriodEnd)` -- **NO IDOR CHECK**;
   success returns raw Stripe subscription object.
4. **Method-resolution surface** — the route
   exports `POST`, `PUT`, AND `DELETE`. `GET` /
   `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **three header bulk-loop walks** (~6
headers × 3 methods) and **eight hand-written
scenarios**.

| Block                                                                                        | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (POST / PUT / DELETE)                                                 | ~6 headers per method.                                                                                                                 |
| `test('POST … returns 401 with the canonical bare ONE-key envelope', …)`                     | Pins the canonical envelope on POST.                                                                                                   |
| `test('PUT … returns 401 with the canonical bare ONE-key envelope', …)`                      | Pins the canonical envelope on PUT.                                                                                                    |
| `test('DELETE … returns 401 with the canonical bare ONE-key envelope', …)`                   | Pins the canonical envelope on DELETE.                                                                                                 |
| `test('POST + PUT + DELETE … have IDENTICAL 401 envelopes', …)`                              | Pins byte-identical 401 envelopes across all three methods.                                                                            |
| `test('POST … 401 envelope shape has exactly the error key', …)`                             | Strict ONE-key envelope-shape assertion.                                                                                               |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`         | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('PUT … updateSubscription is NOT entered on the unauth branch', …)`                    | CRITICAL — even though PUT has NO IDOR check post-auth, the auth gate itself must fire BEFORE updateSubscription (no XSS-marker leak). |
| `test('DELETE … cancelSubscription is NOT entered on the unauth branch', …)`                 | CRITICAL — same gate-before invariant on DELETE.                                                                                       |
| `test('POST … cross-method probe (GET / PATCH) does NOT 5xx', …)`                            | Method-resolution walk. POST + PUT + DELETE are exported.                                                                              |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                        | Side-channel walk on POST.                                                                                                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status
   across all three methods.
2. **Canonical bare ONE-key envelope** `{ error:
   'Unauthorized' }` on all three methods.
3. **Cross-method 401 envelope equality** — POST,
   PUT, and DELETE return BYTE-IDENTICAL 401
   envelopes.
4. **Strict ONE-key envelope-shape preservation**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-updateSubscription invariant**
   (CRITICAL).
7. **Gate-before-cancelSubscription invariant**
   (CRITICAL).
8. **Cross-method invariance** — GET / PATCH
   return `< 500`.
9. **Side-channel isolation** on POST.

## See also

- The per-id update sibling
  [`stripe-subscription-id-update-body-spec.md`](stripe-subscription-id-update-body-spec.md)
  DOES enforce a user-scoped IDOR check (the
  proper way to update a subscription).
- The per-id cancel sibling
  [`stripe-subscription-id-cancel-body-spec.md`](stripe-subscription-id-cancel-body-spec.md)
  has NO IDOR (already a known finding); this
  collection-level route extends the no-IDOR
  surface to PUT.
- The per-id reactivate sibling
  [`stripe-subscription-id-reactivate-body-spec.md`](stripe-subscription-id-reactivate-body-spec.md)
  uses tenant-only IDOR.
- The Stripe billing-portal sibling
  [`stripe-subscription-portal-body-spec.md`](stripe-subscription-portal-body-spec.md)
  uses a different `auth()` + `getCustomerId`
  pattern.
- [`docs/questions.md`](../questions.md) — the
  Q-### entry tracking the no-IDOR finding (PUT
  and DELETE on the collection-level route accept
  ANY subscriptionId from any authenticated user).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
