---
id: lemonsqueezy-update-body-spec
title: E2E LemonSqueezy Update Body Spec (apps/web-e2e/tests/api/lemonsqueezy-update-body.spec.ts)
sidebar_label: E2E LemonSqueezy Update Body Spec
sidebar_position: 583
---

# E2E LemonSqueezy Update Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-update-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**LemonSqueezy generic-subscription-update POST body
/ header smoke spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-update-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-update-body.spec.ts).

This is the **richest per-source-file POST smoke**
the docs tree publishes — it pins SIX FIRST
contracts:

1. **`success: false`-AND-`code`-typed FIVE-key 401
   envelope** — `{ success: false, error:
   'Unauthorized', code: 'UNAUTHORIZED', requestId:
   <uuid>, timestamp: <ISO> }`. Distinct from
   cancel/reactivate/update-plan sibling THREE-key
   envelope. The FIRST per-source-file POST smoke
   pinning a 5-key envelope with both `requestId`
   and `timestamp`.
2. **Per-request UUID** via `crypto.randomUUID?.()
   || Math.random().toString(36).substring(2)` —
   UUID v4 with browser-fallback. The FIRST per-
   source-file POST smoke pinning per-request UUID
   generation with optional-chain fallback.
3. **Performance tracking** via `startTime =
   Date.now()` and `duration: ${Date.now() -
   startTime}ms` in the catch envelope. The FIRST
   per-source-file POST smoke pinning request-
   duration measurement.
4. **Development-mode short-circuit** — `if
   (process.env.NODE_ENV === 'development')`
   returns 200 with input echoed BEFORE calling the
   provider. The FIRST per-source-file POST smoke
   pinning a dev-mode short-circuit contract.
5. **Custom response headers** — `Cache-Control:
   no-cache, no-store, must-revalidate`,
   `X-Request-ID`, `X-Response-Time`. The FIRST
   per-source-file POST smoke pinning custom
   response headers.
6. **Five-tier catch dispatcher** — `errorCode`
   extracted from `error.code`, dispatched to:
   `VALIDATION_ERROR` → 400, `UNAUTHORIZED` → 401,
   `SUBSCRIPTION_NOT_FOUND` → 404,
   `PROVIDER_UNAVAILABLE` → 503, default → 500.
   The FIRST per-source-file POST smoke pinning a
   five-tier catch dispatcher.

## What's distinct from the cancel + reactivate + update-plan siblings

- **`!session?.user` gate** (NOT `!session?.user?.
  email`).
- **`code: 'UNAUTHORIZED'`** (NOT `'AUTH_
  REQUIRED'`).
- **5-key 401 envelope** with `success: false` +
  `code` + `requestId` + `timestamp`.
- **Dev-mode short-circuit** — UNIQUE.

## Why this spec is the richest per-source-file POST smoke

The route under test
([`apps/web/app/api/lemonsqueezy/update/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/update/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user`
   → 401 5-key envelope.
2. **JSON body parse** via `await request.json()`
   AFTER auth gate.
3. **`updateSubscriptionSchema.safeParse(body)`**
   — failure → 400 5-key envelope with `code:
   'VALIDATION_ERROR'` and `details`.
4. **Dev-mode short-circuit** — returns 200 with
   input echoed if `NODE_ENV === 'development'`.
5. **`PaymentProviderManager.getLemonsqueezy
   Provider()`** retrieve.
6. **`lemonsqueezy.updateSubscription({...})`** —
   load-bearing call. If null result → 404 5-key
   envelope with `code: 'SUBSCRIPTION_NOT_FOUND'`.
7. **Success payload** — `{ success: true, data:
   <subscription>, metadata: { requestId,
   timestamp, duration: <ms>, userId } }`.
8. **Five-tier catch dispatcher** with `errorCode`
   from `error.code`.
9. **Custom response headers** on success and
   catch — `Cache-Control` + `X-Request-ID` +
   `X-Response-Time`.
10. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~7 headers + ~13
bodies) and **twelve hand-written scenarios**.

| Block                                                                                                           | Purpose                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                                           | ~7 headers including fabricated `X-Request-ID` (to verify request-id-forgery prevention).                                              |
| Body bulk-loop walk                                                                                             | ~13 bodies covering required-field probes, validation probes, multi-field valid bodies, bypass attempts.                               |
| `test('… returns 401 with the FIVE-key Unauthorized envelope', …)`                                              | Pins the FIVE-key envelope with all five fields verified including ISO-format `timestamp`.                                             |
| `test('… envelope shape has exactly success / error / code / requestId / timestamp keys', …)`                   | Strict envelope-shape assertion: NO `message`/`duration`/`details` leak.                                                               |
| `test('… requestId is unique per-request', …)`                                                                  | Pins the per-request UUID generation: three requests must produce three different requestIds.                                          |
| `test('… caller-supplied X-Request-ID is NOT echoed in requestId', …)`                                          | Pins the request-id-forgery prevention: caller's `X-Request-ID: 'attacker-injected-uuid'` must NOT appear in the body's `requestId`.   |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                                       | Negative-property assertion.                                                                                                           |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                                 | Pins the gate-before-post-auth order across three messages and four codes.                                                             |
| `test('… has a stable status across header / body permutations', …)`                                            | Five body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                                | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                     | Method-resolution walk.                                                                                                                |
| `test('… validation chain is NOT entered on the unauth branch', …)`                                             | Pins the gate-before-Zod order.                                                                                                        |
| `test('… dev-mode short-circuit / provider-call / 5-tier-catch are NOT entered on the unauth branch', …)`       | Pins the gate-before-dev-mode / -provider-call / -catch-dispatcher orders.                                                             |
| `test('… response includes X-Request-ID custom header on unauth branch', …)`                                    | Pins the no-custom-header invariant on the unauth branch — custom headers (`X-Request-ID`, `X-Response-Time`) only appear on success/catch. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~20 total) must round-trip to a
   `< 500` status.
2. **FIVE-key envelope** with all fields verified.
3. **Strict envelope-shape preservation**.
4. **Per-request UUID uniqueness**.
5. **Request-id-forgery prevention**.
6. **Success-branch-key non-disclosure**.
7. **Gate-before-post-auth invariant** with mixed
   message + code allow-list.
8. **Status invariance across body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance**.
11. **Gate-before-validation invariant**.
12. **Gate-before-dev-mode-short-circuit /
    -provider-call / -five-tier-catch invariant**.
13. **No-custom-header invariant** on unauth branch.

## See also

- The companion cancel sibling
  [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md).
- The companion reactivate sibling
  [`lemonsqueezy-reactivate-body-spec.md`](lemonsqueezy-reactivate-body-spec.md).
- The companion update-plan sibling
  [`lemonsqueezy-update-plan-body-spec.md`](lemonsqueezy-update-plan-body-spec.md)
  pins multi-field-with-defaults Zod schema.
- The LemonSqueezy webhook signature-verified POST
  sibling
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md).
- The LemonSqueezy checkout POST sibling
  [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
