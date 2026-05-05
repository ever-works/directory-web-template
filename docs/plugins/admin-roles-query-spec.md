---
id: admin-roles-query-spec
title: E2E Admin Roles Query Spec (apps/web-e2e/tests/api/admin-roles-query.spec.ts)
sidebar_label: E2E Admin Roles Query Spec
sidebar_position: 506
---

# E2E Admin Roles Query Spec — `apps/web-e2e/tests/api/admin-roles-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin roles listing query-param smoke spec** paired with
[`apps/web-e2e/tests/api/admin-roles-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside
the sibling admin-tree query smoke specs and the
**immediately-preceding**
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md).

This is the **sixth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
and
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
and the **fourth** under `tests/api/`.

## Why this spec sits apart from every prior admin-tree query smoke

The route under test
([`apps/web/app/api/admin/roles/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/route.ts))
documents one striking divergence from every other
admin-tree GET smoke-covered today, plus three smaller
postures the prior sibling specs do not document at this
intersection:

1. **No explicit `auth()` gate** (auth-gate-divergence
   finding) — distinct from every other admin-tree GET
   route smoke-covered by the sibling
   [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
   [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
   [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
   `admin-categories-query.spec.ts`, `admin-clients-query.spec.ts`,
   `admin-comments-query.spec.ts`, `admin-companies-query.spec.ts`,
   `admin-dashboard-stats-query.spec.ts`,
   `admin-featured-items-query.spec.ts`,
   `admin-geo-analytics-query.spec.ts`,
   `admin-items-query.spec.ts`, `admin-items-stats-query.spec.ts`,
   `admin-location-index-query.spec.ts`,
   `admin-navigation-query.spec.ts`,
   `admin-notifications-query.spec.ts`,
   `admin-reports-query.spec.ts`,
   `admin-reports-stats-query.spec.ts`,
   `admin-roles-stats-query.spec.ts`,
   `admin-settings-query.spec.ts`,
   `admin-tags-query.spec.ts`, `admin-tags-all-query.spec.ts`,
   `admin-twenty-crm-test-connection-body.spec.ts`,
   `admin-users-query.spec.ts`, and
   `admin-users-stats-query.spec.ts`. The
   `apps/web/app/api/admin/roles/route.ts` GET handler
   does NOT call `auth()` and does NOT check
   `session?.user?.isAdmin` before delegating to
   `roleRepository.findAllPaginated(...)`. The same
   absence holds for the sibling
   [`apps/web/app/api/admin/roles/active/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/active/route.ts)
   GET handler. The matching question is logged in
   [`docs/questions.md`](../questions.md) under
   **"Should `/api/admin/roles` and `/api/admin/roles/active`
   carry an explicit `auth()` gate like every other admin-
   tree GET?"** with the recommended default of "yes" and
   the migration-path note. The spec is INVARIANT to the
   resolution of that question — every assertion uses
   either the `< 500` envelope or the baseline-equality
   envelope, so it stays green whether the route remains
   unauthenticated OR a future contributor adds an
   `auth()` gate.
2. **Pagination via the shared
   `validatePaginationParams(searchParams)` helper** —
   the same helper used by every paginated admin
   surface (`admin/clients`, `admin/items`,
   `admin/users`, `admin/categories`, etc.). The
   helper short-circuits the handler with its
   `{ error, status }` envelope (typically 400)
   BEFORE the repository call. The smoke walk pins
   the helper's no-5xx contract for the
   `?page=invalid` / `?limit=invalid` / `?page=0` /
   `?limit=99999` permutations.
3. **Narrow inline enum coercion for `?status=`** —
   the handler accepts ONLY the literal strings
   `'active'` / `'inactive'` and coerces every other
   value (including `'pending'` / `'archived'` /
   `'deleted'` / `'ACTIVE'` / `''`) to `undefined`
   via an inline ternary, NOT via a Zod schema. The
   smoke walk pins the no-5xx envelope for every
   `?status=…` permutation including the four
   beyond-the-enum values.
4. **Narrow inline enum coercion for
   `?sortBy=` / `?sortOrder=`** — the handler accepts
   `?sortBy=` ONLY for `'name'` / `'id'` /
   `'created_at'` (defaulting to `'name'`) and
   `?sortOrder=` ONLY for `'asc'` / `'desc'`
   (defaulting to `'asc'`), via the `as` cast on the
   `searchParams.get(...)` result. Unknown values are
   passed through to the repository's `options` bag,
   which must handle them gracefully (defaulting to
   its own canonical sort key). The smoke walk pins
   the no-5xx envelope for every
   `?sortBy=` / `?sortOrder=` permutation including
   the unsupported values
   (`?sortBy=permissions` / `?sortBy=isAdmin` /
   `?sortBy=description` / `?sortOrder=random`).

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **13 hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/roles query-param surface', …)`:

| Block                                                                                | Purpose                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_ROLES_QUERIES) test(…)`                                    | Bulk-loop walk of every plausible query-param shape (~80 paths). Asserts the `< 500` no-server-error invariant for each path.                                                                                                                                    |
| `test('… round-trips to a stable status across query permutations', …)`              | Compares three different parameterised paths against the no-arg baseline status.                                                                                                                                                                                 |
| `test('… ?page=invalid returns the pagination-validator envelope', …)`               | Pins the `validatePaginationParams(...)` helper's short-circuit on non-positive-integer page values.                                                                                                                                                              |
| `test('… ?limit=invalid returns the pagination-validator envelope', …)`              | Pins the `validatePaginationParams(...)` helper's short-circuit on non-positive-integer limit values.                                                                                                                                                            |
| `test('… ?status=… does not 5xx on any value', …)`                                   | Per-key isolation walk: 8 `?status=` permutations including the four beyond-the-enum values (`pending` / `archived` / `deleted` / empty / `ACTIVE`).                                                                                                              |
| `test('… ?sortBy=… does not 5xx on any value', …)`                                   | Per-key isolation walk: 8 `?sortBy=` permutations including the unsupported values (`permissions` / `isAdmin` / `description`).                                                                                                                                  |
| `test('… ?sortOrder=… does not 5xx on any value', …)`                                | Per-key isolation walk: 5 `?sortOrder=` permutations including the unsupported `random` value.                                                                                                                                                                   |
| `test('… ?userId=… does not change baseline status', …)`                             | Per-key isolation walk: 6 impersonation-key permutations.                                                                                                                                                                                                        |
| `test('… ?token=… does not change baseline status', …)`                              | Per-key isolation walk: 6 magic-token bypass-key permutations.                                                                                                                                                                                                   |
| `test('… ?bypass=… does not change baseline status', …)`                             | Per-key isolation walk: 5 admin-override key permutations.                                                                                                                                                                                                       |
| `test('… ?includeDeleted=… does not change baseline status', …)`                     | Per-key isolation walk: 4 payload-shape key permutations the route does not read today.                                                                                                                                                                          |
| `test('… does not branch on Accept header', …)`                                      | Header-isolation walk: 4 `Accept` header values.                                                                                                                                                                                                                  |
| `test('… does not branch on side-channel cookies / headers', …)`                     | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` headers.                                                                                                                              |
| `test('… repeated query keys do not 5xx', …)`                                        | Repeated-key walk: 7 repeated-key permutations.                                                                                                                                                                                                                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~80 paths) must round-trip to a
   `< 500` status. This is the loosest envelope that
   still surfaces a real regression: a 500 from
   `roleRepository.findAllPaginated(...)` throwing
   under any of the parsed sort / status / pagination
   combinations would surface here.
2. **Status invariance across query permutations** —
   three different parameterised paths' statuses
   equal the no-arg baseline's status. The spec
   walks isolation for `?status=`, `?sortBy=`,
   `?sortOrder=`, `?userId=`, `?token=`, `?bypass=`,
   `?includeDeleted=`, `Accept` header, and repeated
   keys.
3. **Pagination-validator-helper short-circuit** —
   `?page=invalid` / `?limit=invalid` round-trip via
   the helper's `{ error, status }` envelope (typically
   400) BEFORE the repository call.
4. **Inline enum coercion non-crash** — `?status=` /
   `?sortBy=` / `?sortOrder=` with values outside the
   accepted enum sets do NOT crash the handler.
5. **Side-channel isolation** — fabricated session-
   token cookies and `X-Forwarded-For` / `X-Real-IP`
   headers do NOT change the baseline status.
6. **Repeated-key invariance** — repeated query keys
   do NOT change the baseline status (the handler
   reads via `URL.searchParams.get(key)` which
   returns the FIRST value).

## Auth-gate-divergence finding (for human review)

The spec is the **first** per-source-file reference the
docs tree publishes for an admin-tree route that is
missing an explicit `auth()` gate. This is documented
both inside the spec's docblock (so any reader of the
spec sees the finding) and in
[`docs/questions.md`](../questions.md) (so the
finding is surfaced for human review on the next
docs-question pass). The migration-path note recommends
adding the same two-step gate as the sibling
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

The spec stays green whether or not this migration
lands; the only assertion that would need to change
post-migration is the bulk-loop's status expectation
(currently `< 500`, which already covers the 401 / 403
post-migration branch).

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  and
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md)
  — sibling per-spec-file references (the **first
  three** under `tests/api/`; this spec is the
  **fourth**).
- [`admin-roles-page-object.md`](admin-roles-page-object.md)
  — the admin roles page-object driver paired with
  the same route's UI shell (`/admin/roles`).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the roles route sits
  inside.
