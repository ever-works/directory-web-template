---
id: admin-roles-active-query-spec
title: E2E Admin Roles Active Query Spec (apps/web-e2e/tests/api/admin-roles-active-query.spec.ts)
sidebar_label: E2E Admin Roles Active Query Spec
sidebar_position: 507
---

# E2E Admin Roles Active Query Spec — `apps/web-e2e/tests/api/admin-roles-active-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin active-roles query-param smoke spec** paired with
[`apps/web-e2e/tests/api/admin-roles-active-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-active-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside
the sibling admin-tree query smoke specs and the
**immediately-preceding**
[`admin-roles-query-spec.md`](admin-roles-query-spec.md).

This is the **seventh** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
and
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
and the **fifth** under `tests/api/`.

## Why this spec sits paired with `admin-roles-query-spec.md`

The route under test
([`apps/web/app/api/admin/roles/active/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/active/route.ts))
is the **second** of the two admin-tree GET routes
flagged by the `Q-010b` auth-gate-divergence finding
([`docs/questions.md`](../questions.md)).
The first sibling
([`admin-roles-query-spec.md`](admin-roles-query-spec.md))
documents the divergence finding and the migration-
path note; this spec extends the same divergence-pin
posture to the active-roles endpoint, which:

1. **Also lacks an explicit `auth()` gate** — the
   handler does NOT call `auth()` and does NOT check
   `session?.user?.isAdmin` before delegating to
   `roleRepository.findActive()`. Today the route is
   effectively **public**: the e2e harness hits it
   without an authenticated session and receives the
   same 200-with-roles payload an authenticated admin
   would. The same `Q-010b` migration-path note applies:
   the recommended default is to add the same two-step
   gate as the sibling `/api/admin/roles/stats` route.
2. **Uses the bare zero-argument `GET()` Next 16
   handler signature** — distinct from the sibling
   `admin/roles` route's `GET(request: NextRequest)`
   signature. The active-roles handler does NOT take a
   `request` parameter at all, so every `?…=…`
   permutation is silently discarded by the Next.js
   routing layer before the handler body runs. The
   route is **invariant** to its query string: every
   permutation rounds-trips to the same status as the
   no-arg baseline. A regression that switches the
   signature to `GET(request)` and starts reading
   `searchParams.get(...)` would change the
   observable behavior on at least one of the
   permutations the spec walks — the baseline-equality
   assertions would surface that change without the
   suite going red, because the bulk-loop's `< 500`
   envelope still holds.
3. **Calls `roleRepository.findActive()` with zero
   arguments** — the repository is invoked with NO
   `options` bag at all. A regression that threads any
   of the query keys below into a new `options` bag
   (e.g. `?includeInactive=true` to widen the active
   set, defeating the whole purpose of the route)
   would change the auth-branch payload — the smoke
   walk's `< 500` envelope still holds.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **13 hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/roles/active query-param surface', …)`:

| Block                                                                                | Purpose                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_ROLES_ACTIVE_QUERIES) test(…)`                             | Bulk-loop walk of every plausible query-param shape (~85 paths). Asserts the `< 500` no-server-error invariant for each path.                                                                                                                                    |
| `test('… round-trips to a stable status across query permutations', …)`              | Compares three different parameterised paths against the no-arg baseline status — the route's invariance to its query string is the load-bearing assertion.                                                                                                      |
| `test('… ?status=… does not change baseline status', …)`                             | Per-key isolation walk: 9 `?status=` permutations including the four beyond-the-enum values (`pending` / `archived` / `deleted` / empty / `ACTIVE`) and the new `all` value.                                                                                       |
| `test('… ?isAdmin=… does not change baseline status', …)`                            | Per-key isolation walk: 4 `?isAdmin=` permutations.                                                                                                                                                                                                              |
| `test('… ?sortBy=… does not change baseline status', …)`                             | Per-key isolation walk: 8 `?sortBy=` permutations including the unsupported values (`permissions` / `isAdmin` / `description`).                                                                                                                                  |
| `test('… ?sortOrder=… does not change baseline status', …)`                          | Per-key isolation walk: 5 `?sortOrder=` permutations including the unsupported `random` / `invalid` values.                                                                                                                                                       |
| `test('… ?page=… does not change baseline status', …)`                               | Per-key isolation walk: 7 pagination-key permutations including invalid / negative / out-of-range values.                                                                                                                                                         |
| `test('… ?userId=… does not change baseline status', …)`                             | Per-key isolation walk: 6 impersonation-key permutations.                                                                                                                                                                                                        |
| `test('… ?token=… does not change baseline status', …)`                              | Per-key isolation walk: 6 magic-token bypass-key permutations.                                                                                                                                                                                                   |
| `test('… ?bypass=… does not change baseline status', …)`                             | Per-key isolation walk: 5 admin-override key permutations.                                                                                                                                                                                                       |
| `test('… ?includeInactive=… does not change baseline status', …)`                    | Per-key isolation walk: 5 payload-shape key permutations the route does not read today (the **active**-routes-specific `?includeInactive=true` is the load-bearing case, since it would defeat the whole purpose of the route if a regression wired it through). |
| `test('… does not branch on Accept header', …)`                                      | Header-isolation walk: 4 `Accept` header values.                                                                                                                                                                                                                  |
| `test('… does not branch on side-channel cookies / headers', …)`                     | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                                                                              |
| `test('… repeated query keys do not 5xx', …)`                                        | Repeated-key walk: 7 repeated-key permutations.                                                                                                                                                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~85 paths) must round-trip to a
   `< 500` status. This is the loosest envelope that
   still surfaces a real regression: a 500 from
   `roleRepository.findActive()` throwing under any
   of the parsed parameters would surface here.
2. **Status invariance across query permutations** —
   three different parameterised paths' statuses
   equal the no-arg baseline's status. The spec
   walks isolation for `?status=`, `?isAdmin=`,
   `?sortBy=`, `?sortOrder=`, `?page=` / `?limit=`,
   `?userId=`, `?token=`, `?bypass=`,
   `?includeInactive=`, `Accept` header, and
   repeated keys.
3. **Active-roles invariant** — the route's whole
   purpose is to return only active roles. A
   regression that wires `?includeInactive=true`
   into a new `options` bag for
   `roleRepository.findActive(...)` would defeat
   that purpose; the per-key isolation walk pins the
   `?includeInactive=…` baseline-equality envelope
   so any such regression surfaces via the auth-
   branch behavioral test (out of scope for this
   spec) without the smoke walk going red.
4. **Side-channel isolation** — fabricated session-
   token cookies and `X-Forwarded-For` / `X-Real-IP`
   headers do NOT change the baseline status.
5. **Repeated-key invariance** — repeated query keys
   do NOT change the baseline status (the handler
   does not even take `request`, so no key-collision
   parsing branch exists).

## Auth-gate-divergence finding (for human review)

The spec is the **second** per-source-file reference
the docs tree publishes for an admin-tree route that
is missing an explicit `auth()` gate. The first was
[`admin-roles-query-spec.md`](admin-roles-query-spec.md).
Both routes are flagged by the same `Q-010b` open
question in [`docs/questions.md`](../questions.md):

> **Should `/api/admin/roles` and `/api/admin/roles/active`
> carry an explicit `auth()` gate like every other admin-
> tree GET?**

The recommended default is "yes" — the migration
path is to add the same two-step gate as the sibling
`/api/admin/roles/stats` route:

```typescript
const session = await auth();
if (!session?.user) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
if (!session.user.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  );
}
```

Both specs (this one and
[`admin-roles-query-spec.md`](admin-roles-query-spec.md))
stay green whether or not this migration lands; the
only assertion that would need to change post-
migration is the bulk-loop's status expectation
(currently `< 500`, which already covers the 401 / 403
post-migration branch).

The active-roles route additionally narrows the data-
exposure surface compared to the sibling listing
route — `roleRepository.findActive()` returns ONLY
roles with `status: 'active'`, while the sibling
`roleRepository.findAllPaginated(...)` can return
inactive roles via `?status=inactive`. The
unauthenticated payload from the active-roles route
is therefore **strictly smaller** than the
unauthenticated payload from the listing route, but
both leak the `permissions[]` array (which enumerates
the security boundary of the admin tree). The
migration-path recommendation applies to both routes
equally.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  and
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md)
  — sibling per-spec-file references (the **first
  four** under `tests/api/`; this spec is the
  **fifth**).
- [`admin-roles-page-object.md`](admin-roles-page-object.md)
  — the admin roles page-object driver paired with
  the same admin route's UI shell (`/admin/roles`).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the active-roles route sits
  inside.
