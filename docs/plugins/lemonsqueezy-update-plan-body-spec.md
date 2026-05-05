---
id: lemonsqueezy-update-plan-body-spec
title: E2E LemonSqueezy Update-Plan Body Spec (apps/web-e2e/tests/api/lemonsqueezy-update-plan-body.spec.ts)
sidebar_label: E2E LemonSqueezy Update-Plan Body Spec
sidebar_position: 581
---

# E2E LemonSqueezy Update-Plan Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-update-plan-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**LemonSqueezy plan-update POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-update-plan-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-update-plan-body.spec.ts).

This is the **third sibling** in the LemonSqueezy
subscription-management trio (cancel + reactivate +
update-plan), all sharing the same email-gated auth
contract, THREE-key 401 envelope with `code:
'AUTH_REQUIRED'`, Zod `safeParse` validation, and
`timestamp` field in the success envelope.

## What's distinct from the cancel + reactivate siblings

- **Multi-field Zod schema with defaults:** the
  `updatePlanSchema` has TWO required fields
  (`subscriptionId`, `variantId`) AND FOUR OPTIONAL
  fields with defaults (`proration`,
  `invoiceImmediately`, `disableProrations`,
  `billingAnchor`). The FIRST per-source-file POST
  smoke pinning a multi-field-with-defaults Zod
  schema.
- **`z.coerce.number().positive()`:** the FIRST
  per-source-file POST smoke pinning a Zod coerce-
  number contract (string-to-number coercion via
  `z.coerce`).
- **`z.enum` with default:** `proration: z.enum
  (['immediate', 'next_period']).optional()
  .default('immediate')`. The FIRST per-source-file
  POST smoke pinning a Zod enum-with-default
  contract.
- **`z.number().min(1).max(31)`** for
  `billingAnchor` — pins a day-of-month range
  constraint.
- **Plan-update-specific metadata** — writes 7
  metadata fields including `session.user.email` as
  `updatedBy`. Same email-in-metadata pattern as
  reactivate sibling, but with FOUR additional flag
  fields (`proration`, `invoiceImmediately`,
  `disableProrations`, `billingAnchor`).

## Why this spec is the multi-field-Zod LemonSqueezy plan-update smoke

The route under test
([`apps/web/app/api/lemonsqueezy/update-plan/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/update-plan/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.
   email` → 401 `{ error: 'Unauthorized', message:
   'Authentication required', code: 'AUTH_REQUIRED' }`
   (same THREE-key envelope as cancel + reactivate
   siblings).
2. **JSON body parse** via `await request.json()`
   AFTER auth gate.
3. **`updatePlanSchema.safeParse(body)`** with
   multi-field schema. Failure → 400 `{ error:
   'Invalid request data', details: <issues>, code:
   'VALIDATION_ERROR' }`.
4. **`getOrCreateLemonsqueezyProvider()` singleton
   initialization**.
5. **`lemonsqueezy.updateSubscription({
   subscriptionId, priceId: variantId.toString(),
   metadata: { action, proration,
   invoiceImmediately, disableProrations,
   billingAnchor, updatedAt, updatedBy } })`** —
   load-bearing call.
6. **Success payload** — `{ success: true, data:
   <result>, message: 'Subscription plan updated
   successfully', timestamp: <ISO> }`.
7. **Outer catch** — `safeErrorResponse(error,
   'Failed to update subscription plan')`.
8. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~8 headers + ~14
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~8 headers.                                                                                                                            |
| Body bulk-loop walk                                                                                | ~14 bodies covering required-field probes, validation probes (negative variantId, invalid enum, out-of-range billingAnchor), bypass.   |
| `test('… returns 401 with the THREE-key Unauthorized envelope', …)`                                | Pins the same THREE-key envelope as cancel + reactivate siblings.                                                                      |
| `test('… envelope shape has exactly error / message / code keys', …)`                              | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order.                                                                                                  |
| `test('… does NOT echo VALIDATION_ERROR or UPDATE_FAILED codes on the unauth branch', …)`          | Pins the static-code allow-list.                                                                                                       |
| `test('… caller-supplied updatedBy / metadata fields are NOT echoed on the unauth branch', …)`     | Pins that the metadata-spread is NEVER reached on unauth.                                                                              |
| `test('… has a stable status across header / body permutations', …)`                               | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                 |
| `test('… multi-field validation chain is NOT entered on the unauth branch', …)`                    | Pins the gate-before-Zod order across five validation-failure shapes.                                                                  |
| `test('… updateSubscription call (with metadata write) is NOT entered on the unauth branch', …)`   | Pins the gate-before-provider-call order.                                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~22 total) must round-trip to a
   `< 500` status.
2. **THREE-key envelope** (same as cancel + reactivate
   siblings).
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Static-code allow-list** — only `AUTH_REQUIRED`
   may appear on unauth.
7. **No-`updatedBy`-leak invariant**.
8. **Status invariance across body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance**.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-multi-field-Zod invariant** —
    NONE of the five validation-failure shapes may
    surface on unauth.
13. **Gate-before-updateSubscription invariant** —
    no metadata write on unauth.

## See also

- The companion cancel sibling
  [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md).
- The companion reactivate sibling
  [`lemonsqueezy-reactivate-body-spec.md`](lemonsqueezy-reactivate-body-spec.md)
  uses the same email-in-metadata pattern.
- The LemonSqueezy webhook signature-verified POST
  sibling
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md).
- The LemonSqueezy checkout POST sibling
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
