---
id: health-database-query-spec
title: E2E Health Database Query Spec (apps/web-e2e/tests/api/health-database-query.spec.ts)
sidebar_label: E2E Health Database Query Spec
sidebar_position: 626
---

# E2E Health Database Query Spec — `apps/web-e2e/tests/api/health-database-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public database-health GET query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts).

This is the **first per-source-file GET smoke** the docs
tree publishes that pins a **public (no-auth-gate)
zero-argument health-probe endpoint** combining a
**hard-coded `db.execute(sql\`SELECT 1 as test\`)`
round-trip** (no parameter binding, no URL-driven SQL),
a **two-branch (200-healthy / 500-unhealthy) status
envelope** that is determined by the database's
reachability NOT the URL, a **shared `{ status, database,
timestamp }` envelope shape** across both branches with
a branch-specific fourth key (`result` on success,
`error` on failure), and a **bare zero-argument
`GET()` Next 16 handler signature** that NEVER reads
the request URL — every query permutation the spec
walks is silently discarded by the Next.js routing
layer before the handler body runs.

## What's distinct from EVERY prior public-route GET smoke

- **Two-valid-status contract `[200, 500]`** — UNIQUE:
  the FIRST per-source-file GET smoke pinning a route
  whose `500` status is an EXPECTED outcome rather than
  a regression signal. The route's catch branch
  responds with a 500 envelope `{ status: 'unhealthy',
  database: 'disconnected', error: 'Database
  connection check failed', timestamp }` when the
  configured database is unreachable; the e2e
  environment does not guarantee a reachable DB so
  both `200` and `500` are valid CI outcomes. The
  bulk-loop assertion is therefore tighter than the
  generic `< 500` contract used by every prior public-
  route GET smoke (`featured-items-query`,
  `items-popularity-scores`, `sponsor-ads-public`,
  `agent-discovery`) — instead it asserts
  `expect([200, 500]).toContain(response.status())`,
  which surfaces a 502 / 503 / 504 (gateway / proxy
  failure) or any 4xx (parameter-rejection
  regression) as a test failure.
- **Status invariance under URL changes** — UNIQUE:
  the FIRST per-source-file GET smoke pinning a route
  whose status is **invariant to its query string**
  AND whose status branch (healthy vs unhealthy) is
  **invariant to its query string**. The spec's
  load-bearing assertion is `expect(parameterised.
  status()).toBe(baseline.status())` plus
  `expect(parameterisedBody.status).toBe(
  baselineBody.status)` — pinning that the response
  branch never drifts from the baseline regardless of
  how many bogus / typo'd / SQL-injection-shaped query
  params the caller appends. A regression that
  introduced a `request.nextUrl.searchParams.get(...)`
  call (e.g. for a future `?refresh=true` cache-bypass
  or `?schema=public` scoping feature) would be caught
  by this branch-equality assertion without the
  bulk-loop going red.
- **Bare zero-argument `GET()` handler signature** —
  the FIRST per-source-file GET smoke pinning a route
  that uses the `export async function GET()`
  signature with NO `request` parameter at all. The
  sibling `admin-roles-active-query-spec.md` ALSO
  pins a bare zero-argument `GET()` signature, but
  that route is admin-tree (auth-gate-divergence
  flagged); this is the FIRST **public** route the
  docs tree pins with that signature. A regression
  that switches the signature to `GET(request)` and
  starts reading `searchParams.get(...)` would change
  the observable behavior on at least one of the
  permutations the spec walks — the baseline-equality
  assertion would surface that change.
- **SQL-injection invariance contract** — UNIQUE: the
  FIRST per-source-file GET smoke pinning that
  SQL-injection-shaped values in `?schema=` /
  `?table=` (e.g. `'OR'1'='1`,
  `';+DROP+TABLE+users;+--`, `%27`, `%22`, `%3B`,
  `%2D%2D`) do NOT reach the SQL layer. The route
  runs a hard-coded `sql\`SELECT 1 as test\`` with no
  parameter binding, so injected payloads cannot
  alter the executed statement; the spec pins this
  invariant via a dedicated test that compares the
  injection-laden URL against the no-arg baseline.
  A regression that introduced any
  `sql.raw(searchParams.get('schema'))` or
  `\`SELECT ... FROM ${schema}.users\`` interpolation
  would change either the status or the branch on
  the injection URL — caught immediately by the
  branch-equality assertion.
- **Canonical health-envelope contract** — UNIQUE:
  the FIRST per-source-file GET smoke pinning a
  Kubernetes-style health-probe envelope with the
  three-key `{ status, database, timestamp }` shape
  enumerable across both branches. The `status`
  field is constrained to `['healthy', 'unhealthy']`,
  the `database` field to `['connected',
  'disconnected']`, the `timestamp` field to a
  `Date.parse`-able ISO-8601 string. A regression
  that flips any of those constraints (e.g.
  `'ok' / 'error'` instead of `'healthy' /
  'unhealthy'`) is caught by the canonical-envelope
  assertion without the bulk-loop going red.
- **Non-JSON `format` invariance** — UNIQUE: the
  FIRST per-source-file GET smoke pinning that
  Kubernetes-style `?format=text` /
  `?format=prometheus` content-negotiation values
  do NOT change the status (the route always
  responds `application/json` regardless of any
  `Accept` header or `?format=` parameter). A
  regression that adds a `?format=text`
  branch returning `text/plain` would change the
  body shape on that URL — caught by the canonical-
  envelope assertion (which expects `body.status`
  to be a string from a fixed enum).
- **Public (no-auth-gate) route** — distinct from
  the auth-gated `client/dashboard/stats`,
  `client/geo-stats`, `client/items/coordinates`
  client-tree health-probe siblings. All callers
  (anon / signed-in / admin) see the same envelope.
- **Method-resolution surface** — the route exports
  ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
  must round-trip to a `< 500` status (Next.js
  returns 405 by default, which satisfies the
  envelope).

## Why this spec is the first public health-probe GET smoke

The route under test
([`apps/web/app/api/health/database/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/health/database/route.ts))
exports only `GET` with the bare zero-argument
signature. The handler combines:

1. **Hard-coded `SELECT 1` round-trip** — load-bearing —
   `db.execute(sql\`SELECT 1 as test\`)`. No parameter
   binding, no URL-driven SQL.
2. **Success envelope** — `{ status: 'healthy',
   database: 'connected', timestamp: new Date().
   toISOString(), result }`. Returned via
   `NextResponse.json(...)` with the default `200`
   status.
3. **Outer catch** — logs `'Database health check
   failed:'` to `console.error` (load-bearing for the
   CI log surface) and returns `{ status: 'unhealthy',
   database: 'disconnected', error: 'Database
   connection check failed', timestamp: new Date().
   toISOString() }` with explicit `{ status: 500 }`.
4. **No request-URL read** — the handler signature is
   `export async function GET()` (no `request`
   parameter), so any query string the caller
   appends is silently discarded by the Next.js
   routing layer before the handler body runs.
5. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single query-string bulk-loop walk**
covering ~50 permutations PLUS three hand-written
scenarios under a single top-level `test.describe(
'API: /api/health/database query-param surface', …)`:

| Block                                                                                     | Purpose                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical health envelope test                                                            | Pins the `{ status, database, timestamp }` shape, `status ∈ {'healthy', 'unhealthy'}`, `database ∈ {'connected', 'disconnected'}`, ISO-8601 `timestamp`. |
| Bulk-loop walk (~50 paths)                                                                | Pins the `[200, 500]` two-valid-status contract on every permutation.                                                                              |
| `?refresh=` / `?force=`                                                                   | Cache-bypass keys a future contributor might add. Today silently ignored.                                                                          |
| `?schema=` / `?database=` / `?table=`                                                     | Scoping keys a future contributor might add. Today silently ignored.                                                                               |
| `?timeout=`                                                                               | Fail-fast key a future contributor might add. Today silently ignored.                                                                              |
| `?check=` / `?probe=`                                                                     | Different-check keys a future contributor might add (read / write / replica; liveness / readiness / startup). Today silently ignored.              |
| `?format=`                                                                                | Content-negotiation key (json / text / prometheus). Today silently ignored.                                                                        |
| `?verbose=` / `?debug=`                                                                   | Diagnostics keys a future contributor might add. Today silently ignored.                                                                           |
| `?locale=` / `?lang=`                                                                     | i18n keys. Today silently ignored.                                                                                                                  |
| Empty values                                                                              | `?key=` returns `''` from `searchParams.get(...)`; route never calls it.                                                                            |
| Repeated keys                                                                             | `?refresh=true&refresh=false`; route never reads either.                                                                                            |
| SQL-injection-shaped values                                                               | `?schema=%27` / `?table='OR'1'='1` / `?table=DROP+TABLE+users`; route runs hard-coded `SELECT 1`, never reaches SQL.                                 |
| 500-character long values                                                                 | Buffer-overflow-style guard.                                                                                                                        |
| Bogus / typo'd query keys                                                                 | `?unknown=value`, `?foo=bar&baz=qux`; route reads nothing from the URL.                                                                             |
| Status-invariance test                                                                    | Pins `parameterised.status() === baseline.status()` AND `parameterisedBody.status === baselineBody.status`.                                          |
| SQL-injection invariance test                                                             | Pins SQL-injection-shaped query values do NOT reach the SQL layer.                                                                                  |

## What the spec asserts

1. **Two-valid-status contract** — every query
   permutation MUST round-trip to `200` or `500`.
   Any other status (4xx parameter-rejection
   regression, 502 / 503 / 504 gateway failure)
   surfaces as a test failure.
2. **Canonical health-envelope shape** — the
   no-arg baseline asserts `body.status ∈
   {'healthy', 'unhealthy'}`, `body.database ∈
   {'connected', 'disconnected'}`, `body.timestamp`
   is a `Date.parse`-able ISO-8601 string.
3. **Status invariance under URL changes** — the
   parameterised URL's status MUST equal the
   baseline's, AND the response branch
   (`healthy` / `unhealthy`) MUST equal the
   baseline's.
4. **SQL-injection invariance** — SQL-injection-
   shaped `?schema=` / `?table=` values do NOT
   change the status or the branch.

## See also

- The cross-cutting
  [`health.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health.spec.ts)
  ALSO probes `GET /api/health/database` BUT only
  the no-arg baseline; this per-source-file spec
  adds the **query-param surface** + the **SQL-
  injection invariance contract** + the
  **canonical-envelope shape assertion** so a
  regression in any of those is caught explicitly.
- The neighbouring `internal-db-init-query-spec.md`
  documents the related `/api/internal/db-init`
  surface that complements the database-health
  endpoint (init-time vs probe-time database
  surfaces).
- The neighbouring `cron-sync-query-spec.md`
  documents another zero-argument GET handler that
  mirrors this spec's bare `GET()` signature
  posture.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.

## Change protocol

Update this page in the same PR that touches:

- The source spec
  [`apps/web-e2e/tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts)
  (any change to the `HEALTH_DATABASE_QUERIES`
  array, the `test.describe` block, the canonical
  envelope assertion, the `[200, 500]` bulk-loop
  contract, the status-invariance test, or the
  SQL-injection invariance test).
- The route under test
  [`apps/web/app/api/health/database/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/health/database/route.ts)
  (any change to the `db.execute(sql\`SELECT 1\`)`
  round-trip, the `{ status, database, timestamp,
  result }` success envelope, the `{ status,
  database, error, timestamp }` failure envelope,
  the explicit `{ status: 500 }` on the catch
  branch, the `console.error` log line, or the
  bare zero-argument `GET()` handler signature).

Cross-cutting bookkeeping:

- Update `docs/log.md` with the per-source-file
  entry.
- Update `docs/index.md`'s plugins table-of-
  contents with a one-line entry pointing at this
  page.
- Run `pnpm tsc --noEmit` in `apps/web-e2e`.
- Run the smoke-subset Playwright invocation
  targeting `health-database-query.spec.ts` if
  the route or the spec actually changed:
  `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "health/database"`.
