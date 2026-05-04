---
id: cron-sync-query-spec
title: E2E Cron Sync Query Spec (apps/web-e2e/tests/api/cron-sync-query.spec.ts)
sidebar_label: E2E Cron Sync Query Spec
sidebar_position: 591
---

# E2E Cron Sync Query Spec — `apps/web-e2e/tests/api/cron-sync-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Vercel-cron sync GET header smoke spec** paired with
[`apps/web-e2e/tests/api/cron-sync-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-sync-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes for a **Bearer-token-secret-gated
cron endpoint**. The existing multi-cron sibling
[`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
covers the OTHER cron routes (subscription-expiration,
subscription-reminders); this spec drills into the
cron/sync handler specifically.

## What's distinct from EVERY prior GET smoke

- **Bearer-token-secret auth** — the handler accepts
  ONLY `Authorization: Bearer ${CRON_SECRET}` (NOT
  session-based auth). The FIRST per-source-file GET
  smoke pinning a Bearer-token-only auth contract.
- **Dev-mode short-circuit** — if `CRON_SECRET` is NOT
  configured AND env is `development`, the handler
  allows access without auth. Same pattern as
  lemonsqueezy/update's dev-mode short-circuit.
- **FOUR-key 401 envelope** — `{ success: false,
  timestamp: <ISO>, duration: <ms>, message:
  'Unauthorized' }`. UNIQUE: NO `error` field; uses
  `message` (not `error`) for the auth failure. The
  FIRST per-source-file smoke pinning a 401 envelope
  WITHOUT an `error` field.
- **Performance tracking** via `startTime = Date.now()`
  and `duration: Date.now() - startTime` in BOTH the
  unauth response AND the success/catch responses
  (matches lemonsqueezy/update's richest-envelope spec
  but with a `message`-only envelope).
- **Custom `Cache-Control: no-cache, no-store,
  must-revalidate` header** on success.
- **Conditional success status** — `{ status:
  result.success ? 200 : 500 }` based on the sync
  result.

## Why this spec is the cron/sync GET smoke

The route under test
([`apps/web/app/api/cron/sync/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/cron/sync/route.ts))
exports only `GET`. The handler combines:

1. **Bearer-token-secret check** — `request.headers.
   get('authorization') === \`Bearer ${cronSecret}\``.
   Failure → 401 4-key envelope (UNLESS dev-mode
   short-circuit).
2. **Dev-mode short-circuit** — `if (!cronSecret &&
   isDevelopment)` → bypass.
3. **`triggerManualSync()`** — load-bearing sync call.
4. **Success payload** — `{ success: <result.
   success>, timestamp: <ISO>, duration: <ms>,
   message: <result.message>, details?:
   <result.details> }` with status 200 (if
   `result.success`) or 500.
5. **Outer catch** — `safeErrorMessage(error,
   'Unknown error')` extracted into the catch
   envelope. Status 500.
6. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~9
headers) and **eight hand-written scenarios**.

| Block                                                                              | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                              | ~9 headers including various Authorization probes (wrong Bearer, empty Bearer, non-Bearer scheme, Basic auth) plus side-channels.       |
| `test('… returns 401 with the FOUR-key envelope when no Authorization header is present', …)` | Pins the 4-key envelope shape: `success: false`, `message: 'Unauthorized'`, ISO `timestamp`, numeric `duration` — and NO `error` key.   |
| `test('… 401 envelope shape (when reached) has exactly success / timestamp / duration / message keys', …)` | Strict envelope-shape assertion via `Object.keys(body).sort()`.                                                                        |
| `test('… response includes ISO-format timestamp', …)`                              | Pins the ISO timestamp regex on whichever envelope is reached.                                                                         |
| `test('… response includes numeric duration field', …)`                            | Pins the numeric duration field (FIRST per-source-file GET smoke pinning request-duration measurement on the unauth branch).            |
| `test('… does NOT echo the wrong Bearer secret', …)`                               | Pins that the caller-supplied Bearer secret marker is NEVER echoed in the response body.                                               |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`       | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… does NOT branch on side-channel cookies / non-Bearer auth headers', …)`   | Side-channel walk: fabricated session cookies / X-User-Id / X-Forwarded-For do NOT bypass the Bearer-token auth.                       |
| `test('… triggerManualSync is NOT entered with a wrong Bearer secret', …)`         | CRITICAL — pins that the load-bearing `triggerManualSync()` call NEVER runs on unauth and no `details` from a sync result is leaked.   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **FOUR-key 401 envelope** — `{ success: false,
   timestamp, duration, message: 'Unauthorized' }`
   with NO `error` key (UNIQUE).
3. **Strict envelope-shape preservation**.
4. **ISO timestamp format**.
5. **Numeric duration field** (request-duration
   measurement on the unauth branch).
6. **No-Bearer-secret-echo invariant** — the caller-
   supplied secret is NEVER echoed back.
7. **Cross-method invariance** — GET is the only
   exported method.
8. **Side-channel isolation** — fabricated session
   cookies / X-User-Id / X-Forwarded-For do NOT
   bypass the Bearer-token auth.
9. **Gate-before-triggerManualSync invariant**
   (CRITICAL) — the load-bearing sync call NEVER
   runs on unauth.

## See also

- The multi-cron sibling
  [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
  covers the OTHER cron routes (subscription-
  expiration, subscription-reminders); this spec
  drills into the cron/sync handler.
- The LemonSqueezy update POST sibling
  [`lemonsqueezy-update-body-spec.md`](lemonsqueezy-update-body-spec.md)
  also pins a dev-mode short-circuit + performance-
  tracking envelope (richest envelope to date), but
  with a different shape.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
