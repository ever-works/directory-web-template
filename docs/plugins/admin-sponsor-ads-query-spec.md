---
id: admin-sponsor-ads-query-spec
title: E2E Admin Sponsor-Ads Query Spec (apps/web-e2e/tests/api/admin-sponsor-ads-query.spec.ts)
sidebar_label: E2E Admin Sponsor-Ads Query Spec
sidebar_position: 505
---

# E2E Admin Sponsor-Ads Query Spec — `apps/web-e2e/tests/api/admin-sponsor-ads-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin sponsor-ads listing query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-sponsor-ads-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-sponsor-ads-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside
the sibling admin-tree query smoke specs and the
**immediately-preceding**
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md).

This is the **fifth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
and
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
and the **third** under `tests/api/`.

## Why this spec sits apart from every prior admin-tree query smoke

The route under test
([`apps/web/app/api/admin/sponsor-ads/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/route.ts))
documents three distinct postures the prior sibling
specs do not (or do partially):

1. **Route-specific
   `'Unauthorized. Admin access required.'` error
   string with a request-bearing `GET(request: NextRequest)`
   handler signature** — distinct from the
   immediately-preceding
   [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md)
   which uses the same purpose-built error string but
   pairs it with a bare `GET()` handler signature
   (no `request` parameter, zero `searchParams`
   surface inside the handler). The sponsor-ads route
   is the **first** admin-tree route the smoke layer
   covers that documents this exact intersection (the
   longer-message variant + a wide query-param surface
   read via `new URL(request.url).searchParams` AFTER
   the auth gate). A regression that swaps the error
   string back to the bare `'Unauthorized'` form
   would change the client-side error-handling
   contract for every consumer of the sponsor-ads
   admin dashboard widget.
2. **Widest documented query-param surface in the
   admin tree paired with deferred Zod validation** —
   the route reads pagination
   (`?page=` / `?limit=`), enum filters
   (`?status=` / `?interval=`), free-text search
   (`?search=`), and order-targeting keys
   (`?sortBy=` / `?sortOrder=`) via
   `new URL(request.url).searchParams`, then runs
   `querySponsorAdsSchema.safeParse(queryParams)` for
   shape validation and
   `validatePaginationParams(searchParams)` for
   pagination clamping — but **all of these reads run
   AFTER the auth gate**. A regression that re-orders
   the gate to fire AFTER the validation would
   surface here as a 400 'Invalid query parameters'
   instead of a 401 on the unauth branch (e.g.
   `?limit=invalid` or `?sortBy=invalid` would
   return 400 rather than 401). The spec includes a
   deliberate `'Unauthorized. Admin access required.'
   != 'Invalid query parameters'` assertion that
   pins the auth-gate-before-Zod-validation order.
3. **Widest documented isolation walks in any admin-
   tree query smoke** — the spec walks **eight**
   independent query-key shape isolations
   (`?status=` / `?interval=` / `?page=&limit=` /
   `?isAdmin=` / `?userId=` / `?token=` /
   `?bypass=` / `Accept` header), plus repeated-key
   walks (`?as=admin&as=user`,
   `?token=foo&token=bar`,
   `?bypass=1&bypass=0`,
   `?status=active&status=pending`), plus a cookie /
   `X-*` header side-channel walk
   (`Cookie: next-auth.session-token=fabricated`,
   `Cookie: authjs.session-token=fabricated`,
   `X-Forwarded-For: 127.0.0.1`,
   `X-Real-IP: 10.0.0.1`). This is the **deepest**
   per-spec isolation walk-set the admin-tree smoke
   layer publishes. A regression that switches the
   gate to read any of those side channels (e.g.
   `request.cookies.get('next-auth.session-token')`
   for a fabricated session-token cookie) would
   surface here as a status divergence.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **13 hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/sponsor-ads query-param surface', …)`:

| Block                                                                                            | Purpose                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_SPONSOR_ADS_QUERIES) test(…)`                                          | Bulk-loop walk of every plausible query-param shape (78 paths). Asserts the `< 500` no-server-error invariant for each path.                                                                                                                                     |
| `test('… returns 401 with the longer-message envelope on the unauth branch', …)`                 | Pins the **route-specific `'Unauthorized. Admin access required.'`** message paired with the canonical `{ success: false, error }` envelope on the unauth 401 branch.                                                                                            |
| `test('… has a stable status across query permutations', …)`                                     | Compares a parameterised path (page, limit, status, interval, isAdmin, sortBy, sortOrder, search, userId, token, unknown) against the no-arg baseline.                                                                                                            |
| `test('… ?status=… does NOT bypass the admin gate', …)` and 5 sibling per-key variants           | Per-key isolation walks for `?status=`, `?interval=`, `?page=&limit=`, `?isAdmin=`, `?userId=`, `?token=`, `?bypass=`, plus an `Accept` header walk. Each compares the per-key responses to the no-arg baseline.                                                  |
| `test('… invalid Zod query does NOT surface as 400 on unauth branch', …)`                        | Pins the auth-gate-before-Zod-validation order. Asserts that `?sortBy=invalid` / `?sortOrder=invalid` / `?status=invalid` / `?interval=invalid` return 401 'Unauthorized. Admin access required.' (NOT 400 'Invalid query parameters').                          |
| `test('… cookie / X-* headers do NOT bypass the gate', …)`                                       | Side-channel walk asserting fabricated session-token cookies (`next-auth.session-token`, `authjs.session-token`) and `X-Forwarded-For` / `X-Real-IP` headers do NOT bypass `auth()`.                                                                              |
| `test('… response message uniquely identifies sponsor-ads route', …)`                            | Negative-string assertion that the GET response error does NOT echo the bare `'Unauthorized'` or `'Forbidden'` strings, and DOES echo the longer-message variant.                                                                                                |
| `test('… repeated query keys do NOT bypass the gate', …)`                                        | Asserts that repeated keys (`?as=admin&as=user`, `?token=foo&token=bar`, `?bypass=1&bypass=0`, `?status=active&status=pending`) do NOT change the unauth-branch status.                                                                                          |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (78 paths) must round-trip to a
   `< 500` status on the unauth branch.
2. **Longer-message `'Unauthorized. Admin access required.'`
   envelope shape** — the unauth branch returns
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   with the canonical `success: false` key.
3. **Status invariance across query permutations** —
   the parameterised path's status equals the no-arg
   baseline's status. The spec walks 7 independent
   query-key shapes plus an `Accept` header walk.
4. **Auth-gate-before-Zod-validation order** — invalid
   Zod query params (`?sortBy=invalid` /
   `?sortOrder=invalid` / `?status=invalid` /
   `?interval=invalid`) return 401 'Unauthorized.
   Admin access required.' on the unauth branch (NOT
   400 'Invalid query parameters').
5. **Side-channel isolation** — fabricated session-
   token cookies and `X-Forwarded-For` / `X-Real-IP`
   headers do NOT change the unauth-branch status.
6. **Cross-route error-string isolation** — the GET
   response error uniquely identifies the sponsor-ads
   route: `body.error === 'Unauthorized. Admin access required.'`
   AND `body.error !== 'Unauthorized'` AND
   `body.error !== 'Forbidden'`.
7. **Repeated-key invariance** — repeated query keys
   do NOT change the unauth-branch status.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md)
  and
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/api/`; this spec is the
  **third**).
- [`admin-sponsorships-page-object.md`](admin-sponsorships-page-object.md)
  — the admin sponsorships page-object driver paired
  with the same route's UI shell (`/admin/sponsorships`).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the sponsor-ads route sits
  inside.
