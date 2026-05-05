---
id: admin-clients-query-spec
title: E2E Admin Clients Query Spec (apps/web-e2e/tests/api/admin-clients-query.spec.ts)
sidebar_label: E2E Admin Clients Query Spec
sidebar_position: 617
---

# E2E Admin Clients Query Spec — `apps/web-e2e/tests/api/admin-clients-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin client-profiles listing query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-clients-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-query.spec.ts).

This spec is the **per-source-file landing page** for an
existing admin-tree query smoke that pins the
unauthenticated dispatch contract of the
[`apps/web/app/api/admin/clients/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/route.ts)
GET handler — a **single-step `auth()` + `session.user.isAdmin`
gate** that fires BEFORE the
`validatePaginationParams(...)` helper, BEFORE the six
optional `?search=` / `?status=` / `?plan=` /
`?accountType=` / `?provider=` query-param reads, and
BEFORE the legacy `getClientProfiles({…})` query helper
delegated to from `@/lib/db/queries`. Every assertion in
the spec pins behavior on the unauthenticated branch (the
e2e harness carries no admin session), so the load-bearing
invariant is **status invariance**: the 401 baseline must
hold across the full ~60-permutation query-string
walk, and no future query-string-based bypass — `?asAdmin=true`,
`?token=…`, `?bypass=…`, `?provider=…` impersonation —
may flip the unauth status to a non-401.

## What's distinct from EVERY prior admin-tree query smoke

- **Bare `'Unauthorized'` 401 message (NO suffix)** —
  distinct from the `admin/categories` /
  `admin/users` / `admin/items` /
  `admin/items/import` / `admin/items/import/validate`
  routes' role-context-specific
  `'Unauthorized. Admin access required.'` longer-
  message family AND the `admin/notifications/[id]/read`
  / `admin/notifications/mark-all-read` /
  `admin/users/check-email` /
  `admin/users/check-username` / `admin/clients/bulk`
  routes' two-step `auth()` chain that splits 401
  (no session) from 403 (session without `isAdmin`).
  The handler returns the **bare** shorter message
  via `{ error: 'Unauthorized' }` on a single-step
  collapse — both the no-session AND
  authenticated-non-admin branches collapse onto the
  same 401 envelope. A regression that switches the
  envelope to the longer `'Unauthorized. Admin access
  required.'` message OR splits the gate into
  401 / 403 would surface immediately on the
  `body.error.toBe('Unauthorized')` assertion, the
  `body.error.not.toBe('Unauthorized. Admin access
  required.')` negative assertion, and the
  `body.error.not.toBe('Forbidden')` negative
  assertion.
- **Single-step gate AHEAD of the
  `validatePaginationParams(...)` helper** — UNIQUE:
  the FIRST per-source-file admin-tree GET smoke
  pinning a route whose single-step
  `session?.user?.isAdmin` gate fires BEFORE the
  shared `validatePaginationParams(searchParams)`
  helper. The helper SHORT-CIRCUITS the handler with
  its `{ error, status }` 400 envelope on
  `?page=invalid` / `?limit=invalid` /
  `?page=-1` / `?limit=0` / `?limit=200`, but only on
  the AUTH branch — the unauth branch hits 401
  BEFORE the helper runs. A regression that swaps the
  ordering (validating before the gate) would change
  observable behavior on every permutation in the
  bulk-loop walk, even though every assertion pins
  baseline-equality rather than a specific status.
- **Six optional query-param reads, all AFTER the
  gate** — `?page` / `?limit` / `?search` /
  `?status` / `?plan` / `?accountType` / `?provider`
  are all read AFTER the gate via raw
  `searchParams.get('…') || undefined` calls
  (unboxed string, no Zod schema, no inline enum
  coercion). UNIQUE: the FIRST per-source-file admin-
  tree GET smoke pinning a route whose six query-
  param reads carry NO inline enum coercion or Zod
  schema validation — distinct from the
  `admin/roles` route's narrow inline ternary enum
  coercion for `?status=` and `?sortBy=` /
  `?sortOrder=`. Future contributors who add a Zod
  schema or inline enum validator must preserve the
  gate-order invariant — the spec walks ~30 invalid
  values across `?status=` / `?plan=` /
  `?accountType=` / `?provider=` that the route
  silently passes through to the legacy
  `getClientProfiles({…})` query helper. The unauth
  branch must NEVER reach those reads.
- **Legacy `getClientProfiles({…})` query helper** —
  distinct from the `admin/categories` route's
  `categoryRepository.findAllPaginated(...)`
  repository-pattern posture. The handler imports
  `getClientProfiles` directly from
  `@/lib/db/queries` and passes a single `options`
  bag with the seven parsed fields (`page`, `limit`,
  `search`, `status`, `plan`, `accountType`,
  `provider`). The repository-pattern posture is
  the production-source convention for new admin
  routes; this spec stays green if a future
  contributor refactors the route to use a
  `clientRepository` abstraction, BECAUSE the
  unauth branch fires before any repository call
  on every invocation in the bulk-loop walk.
- **Three-key `{ success, data, meta }` success
  envelope** — the route's success branch returns
  `{ success: true, data: { clients: [...] }, meta: {
  page, totalPages, total, limit } }` (the `data` key
  carries a single `clients: []` sub-key, distinct
  from the `admin/users` route's bare `{ success,
  data: [...], pagination: {…} }` shape and the
  `admin/categories` route's identically-shaped
  success envelope). Out of scope for this spec
  because the unauth branch never reaches the
  repository call.
- **`POST` branch with environment-flag-gated CRM
  sync** — the route's `POST` handler (out of scope
  for this GET-only spec) creates a new client
  profile, optionally creating the underlying user
  record with a temporary password
  (`Temp${crypto.randomBytes(6).toString('hex')}!`)
  and synchronously syncing the new client to
  Twenty CRM via
  `createTwentyCrmSyncServiceFromEnv()` when
  `process.env.TWENTY_CRM_ENABLED !== 'false'`. The
  CRM-sync branch is environment-flag-gated and
  returns its successful response regardless of CRM-
  sync success (failure is logged but non-blocking).
  Future contributors who add a `POST` smoke must
  defend against the CRM-sync branch by setting
  `TWENTY_CRM_ENABLED=false` in the e2e environment
  override.

## Why this spec sits inside the admin-tree smoke family

The route under test
([`apps/web/app/api/admin/clients/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/route.ts))
combines:

1. **Single-step `auth()` + `session.user.isAdmin`
   gate** — load-bearing — the unauth branch returns
   `NextResponse.json({ error: 'Unauthorized' }, {
   status: 401 })` BEFORE any query-string read.
2. **`URL(request.url).searchParams` extraction** —
   read AFTER the gate; never reached on the unauth
   branch.
3. **`validatePaginationParams(searchParams)` helper
   call** — read AFTER the gate; the helper's `{
   error, status }` short-circuit (typically 400) is
   reachable only on the AUTH branch.
4. **Six optional query-param reads** — `?search`,
   `?status`, `?plan`, `?accountType`, `?provider`
   parsed via
   `searchParams.get('…') || undefined`.
5. **`getClientProfiles({…})` legacy query helper
   call** — paginated repository call; never reached
   on the unauth branch.
6. **Success envelope** — `{ success: true, data: {
   clients: result.profiles }, meta: { page,
   totalPages, total, limit } }`.
7. **Outer `try / catch` with `console.error` +
   500-level catch** — `{ error: 'Failed to fetch
   clients' }` (status 500). Out of scope for this
   spec because the gate fires before any repository
   call on every unauth invocation.
8. **Method-resolution surface** — the route exports
   `GET` and `POST` (POST is the client-profile
   create path). `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status — Next.js returns
   405 by default, which satisfies the envelope.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/clients query-param
surface', …)`:

| Block                                                                                | Purpose                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_CLIENTS_QUERIES) test(…)`                                  | Bulk-loop walk of every plausible query-param shape (~60 paths). Asserts the `< 500` no-server-error invariant for each path. Permutations cover: no-arg baseline; `?page=` / `?limit=` valid + invalid + boundary; `?search=`; `?status=` / `?plan=` / `?accountType=` known + unknown; `?provider=`; `?asAdmin=` / `?as=` / `?asUser=` / `?impersonate=` admin-impersonation keys; `?token=` / `?secret=` / `?api_key=` / `?authorization=` / `?session=` / `?adminToken=` magic-token keys; `?bypass=` / `?admin=` / `?override=` / `?force=` admin-override keys; `?tenant=` / `?tenantId=` / `?org=` multi-tenancy keys; `?fields=` / `?select=` / `?include=` content-projection keys; `?refresh=` / `?cache=` / `?nocache=` cache-busting keys; `?orderBy=` / `?sortBy=` / `?sortOrder=` order-targeting keys; `?locale=` / `?lang=` i18n keys; repeated keys; bogus / typo'd query keys. |
| `test('… returns a 401 on the unauth branch', …)`                                    | Strict status assertion: `expect(response.status()).toBe(401)` AND strict envelope assertion `body.toEqual({ error: 'Unauthorized' })`.                                                                                                                          |
| `test('… stable status across query permutations', …)`                               | Compares the no-arg baseline status with a parameter-laden path stacking 10+ keys (including `?asAdmin=true&token=anything&unknown=value`).                                                                                                                      |
| `test('… ?asAdmin=… does NOT bypass the admin gate', …)`                             | Per-key isolation walk: 4 admin-impersonation key permutations.                                                                                                                                                                                                  |
| `test('… ?token=… does NOT bypass the admin gate', …)`                               | Per-key isolation walk: 6 magic-token bypass-key permutations.                                                                                                                                                                                                   |
| `test('… ?bypass=… does NOT bypass the admin gate', …)`                              | Per-key isolation walk: 5 admin-override key permutations.                                                                                                                                                                                                       |
| `test('… ?status=… does NOT introduce a status-filter bypass', …)`                   | Per-key isolation walk: 5 known + unknown `?status=` permutations.                                                                                                                                                                                               |
| `test('… ?provider=… does NOT introduce a provider-filter bypass', …)`               | Per-key isolation walk: 4 OAuth-provider permutations.                                                                                                                                                                                                           |
| `test('… keeps the response status stable across param permutations', …)`            | Compares three different parameterised paths' statuses against the no-arg baseline.                                                                                                                                                                              |
| `test('… does NOT branch on Accept header', …)`                                      | Header-isolation walk: 4 `Accept` header values (`application/json`, `text/csv`, `application/xml`, `*/*`).                                                                                                                                                      |
| `test('… repeated query keys do NOT bypass the gate', …)`                            | Repeated-key walk: 3 repeated-key permutations covering `?page=`, `?status=`, `?plan=`.                                                                                                                                                                          |
| `test('… response message does NOT echo the role-context-specific suffix', …)`       | Strict body assertion pinning that `body.error === 'Unauthorized'` AND `body.error !== 'Unauthorized. Admin access required.'` AND `body.error !== 'Forbidden'`. The 401 envelope's bare-message posture is the load-bearing invariant the spec pins.            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~60 paths) must round-trip to a
   `< 500` status. This is the loosest envelope that
   still surfaces a real regression: a 500 would
   indicate the route's parameter-parsing or the
   shared `validatePaginationParams(...)` helper
   crashed before reaching the gate, OR the gate
   itself crashed before returning the 401 envelope.
2. **Strict 401 envelope on the no-arg baseline** —
   `response.status() === 401` AND
   `body.toEqual({ error: 'Unauthorized' })`. The
   single-key envelope shape is the load-bearing
   invariant: a regression that adds a `success: false`
   key, a `message: …` key, or any other field
   would surface here.
3. **Status invariance across query permutations** —
   four different parameterised paths' statuses equal
   the no-arg baseline's status. The spec walks
   isolation for `?asAdmin=`, `?token=`, `?bypass=`,
   `?status=`, `?provider=`, `Accept` header, and
   repeated keys.
4. **No query-string-based admin-gate bypass** —
   `?asAdmin=true`, `?as=admin`, `?asUser=true`,
   `?impersonate=admin`, `?token=anything`,
   `?secret=anything`, `?api_key=anything`,
   `?authorization=Bearer+anything`, `?session=anything`,
   `?adminToken=anything`, `?bypass=1`, `?admin=1`,
   `?admin=true`, `?override=true`, `?force=true` all
   round-trip to the same status as the no-arg
   baseline. A regression that wires any of these
   keys to a fallback admin-context resolver would
   silently grant any anonymous caller admin-level
   client-profile visibility.
5. **No status-filter or provider-filter bypass** —
   `?status=` and `?provider=` permutations all
   round-trip to the same status as the no-arg
   baseline. A regression that reads either before
   the gate (e.g. as part of a multi-tenant
   resolver) would surface immediately.
6. **No Accept-header branching** — the four
   `Accept` header values all round-trip to the same
   status as the no-arg baseline. The route does
   NOT negotiate content types today; if it ever
   does, the negotiation must fire AFTER the gate.
7. **No repeated-key bypass** — `?page=1&page=2`,
   `?status=active&status=inactive`,
   `?plan=free&plan=premium` all round-trip to the
   same status as the no-arg baseline. The handler
   reads via `URL.searchParams.get(key)` which
   returns the FIRST repeated value, so repetition
   is irrelevant on every branch.
8. **Bare-message 401 envelope** —
   `body.error === 'Unauthorized'` AND
   `body.error !== 'Unauthorized. Admin access
   required.'` AND `body.error !== 'Forbidden'`. A
   regression that switches to the role-context-
   specific suffix or splits the gate into 401 / 403
   would surface here.

## Auth-gate posture

The single-step
`session?.user?.isAdmin` collapse used by this route
matches the sibling `admin/comments` /
`admin/companies` / `admin/users` routes (and is
distinct from the two-step `!session?.user?.id` →
401 then `!session.user.isAdmin` → 403 gate of the
sibling `admin/notifications/[id]/read` /
`admin/notifications/mark-all-read` /
`admin/users/check-email` /
`admin/users/check-username` / `admin/clients/bulk`
routes, and from the canonical-longer-message
`'Unauthorized. Admin access required.'` envelope
of the `admin/categories` / `admin/items` /
`admin/items/import` / `admin/items/import/validate`
family). The spec's strict
`body.error.not.toBe('Unauthorized. Admin access
required.')` assertion is the explicit guard
against this route accidentally migrating to the
longer-message family.

## See also

- The neighbouring per-id admin-clients sibling
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md)
  documents the auth-gated single-client CRUD surface
  (`GET` / `PUT` / `DELETE` on
  `/api/admin/clients/[clientId]`).
- The neighbouring bulk admin-clients sibling
  [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md)
  documents the auth-gated bulk-actions surface (the
  POST-only multi-id mutation route at
  `/api/admin/clients/bulk`).
- The neighbouring create admin-clients sibling
  [`admin-clients-create-body-spec.md`](admin-clients-create-body-spec.md)
  documents the auth-gated POST request-body surface
  on the same route (`/api/admin/clients`) — the two
  per-source-file specs partition the `POST` body
  surface and the `GET` query surface respectively
  on the same route file.
- The shared admin-clients page-object driver
  [`admin-clients-page-object.md`](admin-clients-page-object.md)
  documents the admin clients list-and-detail UI
  shell paired with the same admin route.
- The neighbouring admin-tree query smokes
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-tags-all-query-spec.md`](admin-tags-all-query-spec.md)
  — the prior per-source-file admin-tree GET smokes;
  this spec adds the **first per-source-file
  reference for the bare-`'Unauthorized'`-message
  single-step-gate admin-clients listing surface**.
- The admin-protected coverage spec
  [`apps/web-e2e/tests/api/admin-protected-extra.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-protected-extra.spec.ts)
  covers this route at the broad `< 500` level; this
  per-source-file spec adds the deep query-surface
  walk on top of that.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the clients route sits
  inside.

## Change protocol

Update this page in the same PR that touches:

- The source spec
  [`apps/web-e2e/tests/api/admin-clients-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-query.spec.ts)
  (any change to the `ADMIN_CLIENTS_QUERIES` array,
  the `test.describe` block, the strict 401
  envelope assertion, or the per-key isolation
  walks).
- The route under test
  [`apps/web/app/api/admin/clients/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/route.ts)
  (any change to the single-step
  `session?.user?.isAdmin` gate, the
  `validatePaginationParams(...)` helper call, the
  six optional query-param reads, the
  `getClientProfiles({…})` query helper call, the
  `{ success, data: { clients }, meta }` success
  envelope shape, the `{ error: 'Unauthorized' }`
  401 envelope shape, or the outer `try / catch`
  500-level catch envelope).

Cross-cutting bookkeeping:

- Update `docs/log.md` with the per-source-file
  entry.
- Update `docs/index.md`'s plugins table-of-contents
  with a one-line entry pointing at this page.
- Run `pnpm tsc --noEmit` in `apps/web-e2e`.
- Run the smoke-subset Playwright invocation
  targeting `admin-clients-query.spec.ts` if the
  route or the spec actually changed:
  `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "admin-clients query"`.
