---
id: cron-subscription-reminders-method-spec
title: E2E Cron Subscription Reminders Method Spec (apps/web-e2e/tests/api/cron-subscription-reminders-method.spec.ts)
sidebar_label: E2E Cron Subscription Reminders Method Spec
sidebar_position: 597
---

# E2E Cron Subscription Reminders Method Spec — `apps/web-e2e/tests/api/cron-subscription-reminders-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**subscription-reminders cron GET + POST header smoke
spec** paired with
[`apps/web-e2e/tests/api/cron-subscription-reminders-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-subscription-reminders-method.spec.ts).

This is the **first per-source-file smoke** the docs
tree publishes that pins a **207 Multi-Status partial-
success response** (the handler returns 207 when
`result.success === false`). The existing multi-cron
sibling
[`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
covers OTHER cron routes; this spec drills into the
subscription-reminders handler specifically.

## What's distinct from EVERY prior cron smoke

- **Timing-safe comparison on the FULL `Authorization`
  header** — `Buffer.from(authHeader)` is compared to
  `Buffer.from(\`Bearer ${cronSecret}\`)` (UNIQUE:
  every other cron handler compares ONLY the secret
  portion after stripping `Bearer `).
- **BARE ONE-key 401 envelope** `{ error:
  'Unauthorized' }` (NO `success` key, NO `message`
  field — DIFFERENT from the
  [`cron-subscription-expiration-method-spec.md`](cron-subscription-expiration-method-spec.md)
  sibling's TWO-key envelope).
- **207 Multi-Status response** — UNIQUE: the FIRST
  per-source-file smoke pinning a 207 partial-success
  status code (when `result.success === false`,
  returns 207 instead of 200/500).
- **Spread-result success / error pattern** — both
  branches spread the entire result object into the
  response (`{ message: 'Subscription reminder job
  completed', ...result }` and `{ error: 'Job
  completed with errors', ...result }`). UNIQUE:
  distinct from subscription-expiration which
  constructs an explicit `data` envelope.
- **GET + POST dual-method-delegate exports** — POST
  simply does `return GET(request)` (matches
  subscription-expiration sibling).
- **Outer catch via `safeErrorResponse(error, 'Cron
  job failed')`** — distinct message vs subscription-
  expiration's `'Failed to process expired
  subscriptions'`.

## Why this spec is the first 207 Multi-Status cron smoke

The route under test
([`apps/web/app/api/cron/subscription-reminders/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/cron/subscription-reminders/route.ts))
exports `GET` AND `POST` (where POST delegates to
GET). The handler combines:

1. **`verifyCronSecret(request)` helper** — Bearer-
   token check with timing-safe comparison on the
   FULL authHeader.
2. **Dev-mode short-circuit** — `if (!cronSecret &&
   process.env.NODE_ENV === 'development')` →
   bypass.
3. **`subscriptionRenewalReminderJob()`** — load-
   bearing reminder-job call.
4. **Conditional 207 branch** — `if (!result.success)`
   → 207 Multi-Status with spread-result envelope.
5. **Success payload** — `{ message: 'Subscription
   reminder job completed', ...result }` with status
   200.
6. **Outer catch** — `safeErrorResponse(error, 'Cron
   job failed')`.
7. **Method-resolution surface** — the route exports
   `GET` AND `POST` (POST delegates to GET). `PUT` /
   `PATCH` / `DELETE` must round-trip to a `< 500`
   status.

## How the spec walks its scenario tree

The spec emits **two header bulk-loop walks** (~9
headers × 2 methods) and **nine hand-written
scenarios**.

| Block                                                                                            | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / POST)                                                              | ~9 headers per method.                                                                                                                 |
| `test('GET … returns 401 with the BARE ONE-key envelope when no Authorization header is present', …)` | Pins the BARE ONE-key envelope shape (no `success` / `message` key — distinct from subscription-expiration sibling).                    |
| `test('GET … 401 envelope shape (when reached) has exactly the error key', …)`                   | Strict envelope-shape assertion.                                                                                                       |
| `test('GET … does NOT echo the wrong Bearer secret', …)`                                         | Pins that the caller-supplied Bearer secret marker is NEVER echoed.                                                                    |
| `test('GET … timing-safe comparison length-mismatch handling on FULL header', …)`                | Pins that BOTH a too-short AND a too-long Authorization header produce `< 500` (the length-equality short-circuit avoids `timingSafeEqual` throw on the FULL header). |
| `test('POST … delegates to GET (same envelope shape)', …)`                                       | Pins that POST returns the SAME envelope as GET on the unauth branch.                                                                  |
| `test('GET … cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk. GET and POST are exported.                                                                                     |
| `test('GET … does NOT branch on side-channel cookies / non-Bearer auth headers', …)`             | Side-channel walk.                                                                                                                     |
| `test('GET … subscriptionRenewalReminderJob is NOT entered with a wrong Bearer secret', …)`      | CRITICAL — pins that the load-bearing reminder-job call NEVER runs on unauth and no spread-result key (`processed` / `reminded`) is leaked. |
| `test('GET … does NOT echo any of the post-auth messages on the unauth branch', …)`              | Pins the gate-before-post-auth order.                                                                                                  |
| `test('GET … does NOT return 207 on the unauth branch', …)`                                      | Pins the 207 partial-success status NEVER fires on unauth (it only fires AFTER successful cron-secret verification).                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status
   on BOTH GET and POST.
2. **BARE ONE-key 401 envelope** — `{ error:
   'Unauthorized' }` with NO `success` / `message`
   key.
3. **Strict envelope-shape preservation**.
4. **No-Bearer-secret-echo invariant**.
5. **Timing-safe length-mismatch handling on FULL
   header** — both too-short and too-long are NON-
   5xx.
6. **POST-delegates-to-GET invariant**.
7. **Cross-method invariance** — GET and POST are
   exported.
8. **Side-channel isolation**.
9. **Gate-before-reminder-job invariant** (CRITICAL).
10. **Gate-before-post-auth invariant**.
11. **No-207-on-unauth invariant** — pins that the
    207 partial-success status code is NEVER
    reached on unauth.

## See also

- The subscription-expiration cron sibling
  [`cron-subscription-expiration-method-spec.md`](cron-subscription-expiration-method-spec.md)
  uses ALSO timing-safe comparison BUT compares
  ONLY the secret portion (after `Bearer ` stripped)
  and emits a TWO-key 401 envelope. This spec
  compares the FULL `Authorization` header and
  emits a BARE ONE-key envelope.
- The cron/sync GET sibling
  [`cron-sync-query-spec.md`](cron-sync-query-spec.md)
  uses a DIFFERENT cron-auth contract — exact
  string match (NOT timing-safe) — and emits a
  4-key 401 envelope.
- The multi-cron sibling
  [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
  covers subscription-expiration AND subscription-
  reminders together.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
