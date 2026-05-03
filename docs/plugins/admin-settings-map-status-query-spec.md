---
id: admin-settings-map-status-query-spec
title: E2E Admin Map-Status Query Spec (apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts)
sidebar_label: E2E Admin Map-Status Query Spec
sidebar_position: 503
---

# E2E Admin Map-Status Query Spec — `apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin map-provider configuration-status query-param
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
**29-and-counting** sibling admin-tree query-smoke specs
(`admin-clients-stats-query.spec.ts`,
`admin-roles-stats-query.spec.ts`,
`admin-tags-all-query.spec.ts`,
`admin-categories-all-query.spec.ts`,
`admin-categories-git-query.spec.ts`,
`admin-clients-advanced-search-query.spec.ts`,
`admin-clients-dashboard-query.spec.ts`,
`admin-collections-query.spec.ts`,
`admin-comments-query.spec.ts`,
`admin-companies-query.spec.ts`,
`admin-dashboard-stats-query.spec.ts`,
`admin-featured-items-query.spec.ts`,
`admin-geo-analytics-query.spec.ts`,
`admin-items-export-sample-query.spec.ts`,
`admin-items-query.spec.ts`,
`admin-items-stats-query.spec.ts`,
`admin-location-index-query.spec.ts`,
`admin-navigation-query.spec.ts`,
`admin-notifications-query.spec.ts`,
`admin-reports-query.spec.ts`,
`admin-reports-stats-query.spec.ts`,
`admin-settings-query.spec.ts`,
`admin-sponsor-ads-query.spec.ts`,
`admin-tags-query.spec.ts`,
`admin-users-query.spec.ts`,
`admin-users-stats-query.spec.ts`).

This is the **third** per-source-file reference the docs
tree publishes for any file under `apps/web-e2e/tests/`,
**continuing** the per-spec-file docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md) and
[`smoke-navigation-spec.md`](smoke-navigation-spec.md) and
**opening the per-admin-API-query-smoke-spec docs
sub-rollout** that complements the now-closed page-object
docs rollout (the admin-tree at 17-of-17, the public-tree
at 14-of-14, the client-tree at 6-of-6, plus the
`auth/signin` and `base.page.ts` roots — see
[`base-page-object.md`](base-page-object.md) and
[`signin-page-object.md`](signin-page-object.md)).

## Why this spec sits apart from every prior admin-tree query smoke

The route under test
([`apps/web/app/api/admin/settings/map-status/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/settings/map-status/route.ts))
is the **first** admin-tree route the smoke layer covers
that documents **three** distinct postures the prior
sibling specs do not:

1. **`getCachedApiSession(req)` session resolver** —
   this is the **only** admin-tree route the smoke
   layer covers that uses the request-scoped wrapper
   from
   [`apps/web/lib/auth/cached-session.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/auth/cached-session.ts)
   rather than the bare `auth()` call every other
   admin-tree route uses. The wrapper short-circuits
   the per-request `auth()` resolver via a per-request
   cache, so the route handler can be re-entered
   cheaply by the React Query hooks the admin
   dashboard uses to poll the map-status endpoint.
   The handler signature is therefore the
   **request-bearing** `GET(req: NextRequest)` form
   (necessary because `getCachedApiSession` requires
   the `NextRequest` to key the per-request cache) —
   distinct from the bare `GET()` signature most
   admin-stats routes use.
2. **Single-step gate-collapse posture with the
   `{ error }` envelope** — the gate is a single
   `if (!session?.user?.isAdmin)` check that collapses
   both unauthenticated and authenticated-non-admin
   branches into the same 401 envelope. The 401
   envelope deliberately lacks the `success: false`
   key every other admin-tree route smoke-covered to
   date emits — the route emits the **bare
   `{ error }`** form rather than the canonical
   `{ success: false, error }` envelope. A regression
   that adopts the canonical envelope would change
   the client-side error-handling contract for every
   consumer of the map-status admin dashboard widget.
3. **Per-environment publishable-key disclosure
   surface** — the success branch returns booleans
   (`isConfigured`, `isPreviewAvailable`) derived from
   `Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)`
   and `Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)`
   — never the actual values. Even though the keys
   are publishable (`NEXT_PUBLIC_*`) and reachable
   from any client bundle the web app ships, leaking
   them through an unauth admin-only endpoint would
   be a per-environment-config disclosure regression.
   The spec includes a deliberate **negative-string
   assertion** that the unauth response body does NOT
   contain a Mapbox public access token (`pk.*`) or a
   Google Maps API key (typically `AIza*`) substring,
   the env-var names themselves, or any value that
   resembles them. This is the **first** admin-tree
   query smoke that pins a per-env-disclosure
   contract on the unauth branch.

## How the spec walks its 4-block scenario tree

The spec emits **four nested scenario blocks** under a
single top-level `test.describe('API: /api/admin/settings/map-status query-param surface', …)`:

| Block                                                                                                                  | Purpose                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_SETTINGS_MAP_STATUS_QUERIES) test(…)`                                                         | Bulk-loop walk of every plausible query-param shape (49 paths). Asserts the `< 500` no-server-error invariant for each path.                                                                                                  |
| `test('… returns 401 with the bare-error envelope on the unauth branch', …)`                                            | Pins the **bare-`{ error }` envelope** (no `success: false` key) — the route's single-step gate fires, returning 401. Asserts `body.success` is `undefined` to catch a regression that adopts the canonical envelope.         |
| `test('… ?provider=… does NOT bypass the admin gate', …)` (and 7 sibling per-key variants)                              | Per-key isolation walks for `?provider=`, `?include=`, `?isAdmin=`, `?userId=`, `?token=`, `?bypass=`, `?reveal=`, plus an `Accept` header walk. Each compares the per-key responses to the no-arg baseline.                  |
| `test('… does NOT leak per-env map-key values on the unauth branch', …)`                                               | Negative-string assertion that the unauth response does not contain `pk.*`, `AIza*`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` substrings.                                                       |

The total scenario count under the describe is the
**bulk-loop count plus 12 hand-written scenarios**, in
line with the sibling
[`admin-clients-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-stats-query.spec.ts)
posture but adapted for the route's distinct envelope
shape and per-env-disclosure contract.

## What the spec asserts

1. **Bulk-loop `< 500` contract** — the route's
   single-step gate fires before any
   `process.env.NEXT_PUBLIC_*` read or response-builder
   call, so every query-param permutation must round-
   trip to a `< 500` status (specifically 401) on the
   unauth branch.
2. **Bare-`{ error }` envelope shape** — the unauth
   branch returns `{ error: 'Unauthorized' }` with NO
   `success` key. A regression that adopts the
   canonical `{ success: false, error: 'Unauthorized' }`
   envelope would surface as a failing
   `body.success` undefined assertion.
3. **Status invariance across query permutations** —
   the parameterised path's status equals the no-arg
   baseline's status. The spec walks 8 independent
   query-key shapes (`?provider=`, `?include=`,
   `?isAdmin=`, `?userId=`, `?token=`, `?bypass=`,
   `?reveal=`, plus `Accept` header), each as a
   separate scenario block.
4. **Per-env publishable-key non-disclosure** — the
   unauth response body does NOT contain a Mapbox
   public access token (`pk.*` regex), a Google Maps
   API key (`AIza*` regex), or either env-var name as
   a substring. Even though both env vars are
   `NEXT_PUBLIC_*` (publishable), leaking them
   through an unauth admin-only endpoint would be a
   per-env-config disclosure regression.

## Sibling specs and rollout posture

Where
[`smoke-health-spec.md`](smoke-health-spec.md) and
[`smoke-navigation-spec.md`](smoke-navigation-spec.md)
document the **two `tests/smoke/` specs** (a data-driven
breadth-first health pin and a hand-crafted depth-first
navigation pin), this page documents the **first
`tests/api/` admin-tree query smoke** the docs tree
publishes a per-source-file reference for. The next
per-source-file references the docs tree may publish
under `tests/api/` are expected to follow the same
shape — one per admin-tree query smoke, cross-linked
by route-and-gate posture rather than alphabetically.

## See also

- [`packages.md`](packages.md) — overview of the
  monorepo's plugin packages.
- [`smoke-health-spec.md`](smoke-health-spec.md) —
  sibling per-spec-file reference (the **first**
  `tests/smoke/` reference).
- [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file reference (the **second**
  `tests/smoke/` reference).
- [`admin-settings-page-object.md`](admin-settings-page-object.md)
  — the admin settings page-object driver paired with
  this route's UI shell. The query-smoke spec
  exercises only the API-side admin gate; the page-
  object driver exercises the UI-side admin gate.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 011 — Maps Providers](../spec/011-maps-providers/spec.md)
  is the maps-tree spec the map-status route sits
  inside.
