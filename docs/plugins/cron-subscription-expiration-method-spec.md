---
id: cron-subscription-expiration-method-spec
title: E2E Cron Subscription Expiration Method Spec (apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts)
sidebar_label: E2E Cron Subscription Expiration Method Spec
sidebar_position: 596
---

# E2E Cron Subscription Expiration Method Spec — `apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**subscription-expiration cron GET + POST header smoke
spec** paired with
[`apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts).

This is the **first per-source-file smoke** the docs
tree publishes that pins a **timing-safe Bearer-token
comparison** via `crypto.timingSafeEqual`. The
existing multi-cron sibling
[`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
covers the OTHER cron routes; this spec drills into
the subscription-expiration handler specifically AND
its **GET + POST dual-method-delegate** export
pattern.

## What's distinct from EVERY prior cron smoke

- **Timing-safe Bearer-token comparison** via
  `crypto.timingSafeEqual(Buffer.from(provided),
  Buffer.from(cronSecret))` — the FIRST per-source-
  file smoke pinning a constant-time comparison
  contract on a Bearer-token-gated endpoint.
- **Length-equality short-circuit** —
  `providedSecret.length !== cronSecret.length` →
  false (avoids `timingSafeEqual` length-mismatch
  throw; UNIQUE).
- **`authHeader.replace('Bearer ', '')` parsing** —
  extracts the token via `.replace(...)` (rather than
  exact-match comparison like the cron/sync sibling).
- **TWO-key 401 envelope** `{ success: false,
  message: 'Unauthorized - Invalid or missing cron
  secret' }` — UNIQUE: longer specific message
  naming the failure mode (vs cron/sync's
  `'Unauthorized'`); uses `message` (not `error`).
- **GET + POST dual-method-delegate exports** — POST
  simply does `return GET(request)`; UNIQUE: the
  FIRST per-source-file smoke pinning a method-
  delegate POST that re-routes to GET verbatim.
- **Email-service best-effort side-effect** — if the
  email service is unavailable, the cron does NOT
  fail (continues to update DB).
- **PII-stripped `affectedUsers`** — the response
  includes `{ subscriptionId, userId, planId }` per
  affected user but NEVER `email` (intentional PII
  protection).

## Why this spec is the first timing-safe Bearer-token cron smoke

The route under test
([`apps/web/app/api/cron/subscription-expiration/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/cron/subscription-expiration/route.ts))
exports `GET` AND `POST` (where POST delegates to
GET). The handler combines:

1. **`verifyCronSecret(request)` helper** — Bearer-
   token check with timing-safe comparison.
2. **Dev-mode short-circuit** — `if (!cronSecret &&
   process.env.NODE_ENV === 'development')` →
   bypass.
3. **`subscriptionService.processExpiredSubscriptions()`**
   — load-bearing DB-write call.
4. **PII-strip transformation** — affectedUsers with
   subscriptionId / userId / planId only.
5. **Email-service side-effect** — best-effort, does
   NOT fail the cron job.
6. **Success payload** — `{ success: true, message:
   'Processed X expired subscriptions', data: {
   processed, affectedUsers, errors, timestamp } }`
   with status 200.
7. **Outer catch** — `safeErrorResponse(error,
   'Failed to process expired subscriptions')`.
8. **Method-resolution surface** — the route exports
   `GET` AND `POST` (POST delegates to GET). `PUT` /
   `PATCH` / `DELETE` must round-trip to a `< 500`
   status.

## How the spec walks its scenario tree

The spec emits **two header bulk-loop walks** (~9
headers × 2 methods) and **eight hand-written
scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / POST)                                                                | ~9 headers per method including various Authorization probes (wrong Bearer, empty Bearer, non-Bearer scheme, Basic auth) plus side-channels. |
| `test('GET … returns 401 with the canonical TWO-key envelope when no Authorization header is present', …)` | Pins the TWO-key envelope shape: `success: false`, `message: 'Unauthorized - Invalid or missing cron secret'` — and NO `error` key.    |
| `test('GET … 401 envelope shape (when reached) has exactly success and message keys', …)`         | Strict envelope-shape assertion via `Object.keys(body).sort()`.                                                                        |
| `test('GET … does NOT echo the wrong Bearer secret', …)`                                          | Pins that the caller-supplied Bearer secret marker is NEVER echoed.                                                                    |
| `test('GET … timing-safe comparison length-mismatch handling', …)`                                 | Pins that BOTH a too-short AND a too-long Bearer token produce `< 500` (the length-equality short-circuit avoids `timingSafeEqual` throw). |
| `test('POST … delegates to GET (same envelope shape)', …)`                                         | Pins that POST returns the SAME envelope as GET on the unauth branch (the method-delegate POST contract).                              |
| `test('GET … cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                          | Method-resolution walk. GET and POST are exported.                                                                                     |
| `test('GET … does NOT branch on side-channel cookies / non-Bearer auth headers', …)`               | Side-channel walk.                                                                                                                     |
| `test('GET … processExpiredSubscriptions is NOT entered with a wrong Bearer secret', …)`           | CRITICAL — pins that the load-bearing DB-write call NEVER runs on unauth and no `affectedUsers` / `processed` / `subscriptionId` is leaked. |
| `test('GET … does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order.                                                                                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status
   on BOTH GET and POST.
2. **TWO-key 401 envelope** — `{ success: false,
   message: 'Unauthorized - Invalid or missing cron
   secret' }` with NO `error` key (UNIQUE longer
   message).
3. **Strict envelope-shape preservation**.
4. **No-Bearer-secret-echo invariant**.
5. **Timing-safe length-mismatch handling** — both
   too-short and too-long tokens are NON-5xx.
6. **POST-delegates-to-GET invariant** — POST and
   GET return identical envelopes on unauth.
7. **Cross-method invariance** — GET and POST are
   exported.
8. **Side-channel isolation**.
9. **Gate-before-DB-mutation invariant** (CRITICAL).
10. **Gate-before-post-auth invariant**.

## See also

- The cron/sync GET sibling
  [`cron-sync-query-spec.md`](cron-sync-query-spec.md)
  uses a DIFFERENT cron-auth contract — exact
  `Bearer ${CRON_SECRET}` string match (NOT
  timing-safe). The cron/sync handler also emits a
  4-key 401 envelope; this subscription-expiration
  handler emits a TWO-key 401 envelope.
- The multi-cron sibling
  [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
  covers subscription-expiration AND subscription-
  reminders together; this spec drills into the
  subscription-expiration handler specifically.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
