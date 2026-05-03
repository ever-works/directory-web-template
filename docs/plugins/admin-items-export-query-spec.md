---
id: admin-items-export-query-spec
title: E2E Admin Items Export Query Spec (apps/web-e2e/tests/api/admin-items-export-query.spec.ts)
sidebar_label: E2E Admin Items Export Query Spec
sidebar_position: 508
---

# E2E Admin Items Export Query Spec — `apps/web-e2e/tests/api/admin-items-export-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items-export query-param smoke spec** paired with
[`apps/web-e2e/tests/api/admin-items-export-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-export-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside
the sibling admin-tree query smoke specs and the
**immediately-preceding**
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md).

This is the **eighth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
and
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
and the **sixth** under `tests/api/`.

## Why this spec is the natural sibling of `admin-items-export-sample-query.spec.ts`

The route under test
([`apps/web/app/api/admin/items/export/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/export/route.ts))
is the **per-tenant items dump** counterpart to the
sample-template route already covered by
[`admin-items-export-sample-page-object.md`](admin-data-export-page-object.md)
(shape) and the existing
`apps/web-e2e/tests/api/admin-items-export-sample-query.spec.ts`
smoke. The two routes share an identical authorization
shell:

- Same admin gate (`session?.user?.isAdmin`) and same
  canonical 401 message
  (`'Unauthorized. Admin access required.'`).
- Same Zod schema (`exportQuerySchema` from
  `@/lib/validations/item-import`) gating a single
  documented `format=csv|xlsx` query param.
- Same `safeErrorResponse(...)` catch envelope shape.
- Same `Content-Disposition: attachment; filename="…"`
  binary-stream return shape on the happy path.

The only structural difference between the two routes is
which export-service method is invoked post-gate:

| Route                                              | Service call                              | Returns                                    |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `/api/admin/items/export/sample`                   | `exportService.generateSampleCSV / XLSX()` | A static schema-documentation template    |
| `/api/admin/items/export` (this spec's route)      | `exportService.exportToCSV / XLSX()`       | The full per-tenant items dump (live data) |

The unauth branch is **invariant** to that distinction
(both routes return the same canonical 401 envelope), so
the smoke walk pins the same load-bearing
"401-before-any-service-call" contract. The post-auth
contract is fundamentally different (sample template vs
live data), but that is out of scope for this spec — the
e2e harness does not carry an authenticated session.

## Why a separate spec is worth maintaining

A single shared spec covering both routes would lose the
ability to detect the following regression classes
independently:

1. **Sample-route-only catch-message regression** — a
   change that copies the items-export route's
   `'Failed to export items'` catch message into the
   sample route would not surface on a shared spec but
   surfaces immediately on the per-route spec because
   each spec asserts the route-specific catch envelope
   on the auth-branch (out of scope for the unauth
   smoke walk, but documented on each spec's preamble).
2. **Items-export-route-only service-call regression** —
   a change that swaps `exportToCSV()` for
   `generateSampleCSV()` (or vice versa) on either
   route would round-trip to the same unauth 401 but
   would expose either no live data (sample-on-export)
   or static-schema-documentation as the live dump
   (export-on-sample) on the auth-branch. The unauth
   smoke envelopes stay green either way; per-spec
   files keep the routes' behavior auditably separate.
3. **One-route-only auth-gate-removal regression** — a
   change that removes the admin gate from one route
   but not the other would surface as a per-spec
   divergence (the affected spec's 401 baseline turns
   into a 200 / 4xx; the unaffected spec's stays at
   401). A shared spec would mask half of that change.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/items/export query-param surface', …)`:

| Block                                                                                 | Purpose                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_ITEMS_EXPORT_QUERIES) test(…)`                              | Bulk-loop walk of every plausible query-param shape (~85 paths). Asserts the `< 500` no-server-error invariant for each path.                                  |
| `test('… returns a 401 on the unauth branch', …)`                                     | Pins the canonical 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                          |
| `test('… has a stable status across query permutations', …)`                          | Compares a fully-parameterised path against the no-arg baseline status — the route's invariance to its query string on the unauth branch is the load-bearing assertion. |
| `test('… ?format=… does NOT bypass the admin gate', …)`                               | Per-key isolation walk: 8 `?format=` permutations including the case-sensitive `CSV` / `XLSX` rejections.                                                      |
| `test('… ?userId=… does NOT bypass the admin gate', …)`                               | Per-key isolation walk: 6 impersonation-key permutations.                                                                                                      |
| `test('… ?token=… does NOT bypass the admin gate', …)`                                | Per-key isolation walk: 6 magic-token bypass-key permutations.                                                                                                 |
| `test('… ?bypass=… does NOT bypass the admin gate', …)`                               | Per-key isolation walk: 5 admin-override key permutations.                                                                                                     |
| `test('… ?filename=… does NOT bypass the admin gate', …)`                             | Per-key isolation walk: 3 filename-override-key permutations including the path-traversal / null-byte attack-vector pins.                                      |
| `test('… ?metadata=… does NOT bypass the admin gate', …)`                             | Per-key isolation walk: 4 metadata-toggle-key permutations mirroring the `#include-metadata` checkbox in the `AdminDataExportPage` driver.                    |
| `test('… does not branch on Accept header on the unauth path', …)`                    | Header-isolation walk: 4 `Accept` header values including `text/csv` and `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX MIME type). |
| `test('… does not branch on side-channel cookies / headers', …)`                      | Side-channel walk: fabricated `next-auth.session-token` / `authjs.session-token` cookies + `X-Forwarded-For` / `X-Real-IP` headers.                            |
| `test('… repeated query keys do not 5xx', …)`                                         | Repeated-key walk: 5 repeated-key permutations.                                                                                                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation (~85 paths) must round-trip to a
   `< 500` status. The route's admin gate fires before
   any `searchParams` parsing or service call, so the
   unauthenticated GET surface returns a 4xx
   (typically 401) deterministically. There is no 5xx
   branch reachable on the unauthenticated GET surface
   because the catch can only fire after the gate has
   already let the call through.
2. **Canonical 401 envelope on the unauth branch** —
   the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`.
   Regression-detection clients depend on the early-
   return.
3. **Status invariance across query permutations** —
   any combination of known and unknown keys must
   round-trip to the same status as the no-arg
   baseline. A regression that reads any query param
   before the gate (e.g. a future `?asUser=true`
   impersonation key, a `?token=…` magic-token
   bypass, or a `?format=…` branch that runs before
   the admin gate) would surface here as a status
   divergence.
4. **`?format=` does NOT bypass the admin gate** — the
   `format=csv|xlsx` enum is parsed via Zod's
   `exportQuerySchema.parse(...)` **after** the gate,
   so the unauth branch must always return 401
   regardless of the format value. A regression that
   runs the schema parse before the gate would
   surface here as a 4xx on `?format=invalid` (the
   Zod-rejection branch) distinct from the 401 the
   no-arg baseline returns.
5. **`?userId=` / `?as=` / `?asUser=` / `?impersonate=` do NOT bypass the admin gate** —
   the route reads the user identity from
   `session.user.isAdmin` exclusively today; a
   regression that adds an impersonation key as a
   session-fallback would change the unauth branch
   from "always 401" to "200 with the requested
   user's items export".
6. **`?token=` / `?secret=` / `?api_key=` / `?authorization=` do NOT bypass the admin gate** —
   the route does not read any magic-token bypass
   key today.
7. **`?bypass=` / `?admin=` / `?override=` do NOT bypass the admin gate** —
   the route does not read any admin-override key
   today.
8. **`?filename=` does NOT bypass the admin gate** —
   the route hard-codes the filename in the
   `Content-Disposition` header via the export-
   service per-format default. A regression that
   reads `?filename=` before the gate would expose
   path-traversal / null-byte attack vectors. The
   unauth branch must be invariant to every
   filename-override key today (the smoke walks the
   `../../etc/passwd` and `%00malicious` shapes).
9. **`?metadata=` does NOT bypass the admin gate** —
   the `#include-metadata` checkbox in the
   `AdminDataExportPage` driver maps to a future
   query key the route does not read today.
10. **Side-channel isolation** — fabricated session-
    token cookies, `X-Forwarded-For` headers, and
    `X-Real-IP` headers do NOT change the baseline
    status.
11. **Repeated-key invariance** — repeated query keys
    do NOT change the baseline status
    (`searchParams.get(name)` returns the first value
    for every key the route reads, but the unauth
    gate fires before any `searchParams` parsing).

## Cross-route comparison with the sibling sample-export route

| Aspect                                | `/api/admin/items/export` (this spec)              | `/api/admin/items/export/sample` (sibling spec)            |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Auth gate                             | `session?.user?.isAdmin` → 401 on miss             | Same                                                       |
| Canonical 401 envelope                | `'Unauthorized. Admin access required.'`           | Same                                                       |
| Documented query param                | `format` (`'csv' \| 'xlsx'`, `'csv'` default)      | Same                                                       |
| Zod schema                            | `exportQuerySchema` from `@/lib/validations/item-import` | Same                                                  |
| Catch message                         | `'Failed to export items'`                         | `'Failed to generate sample template'`                     |
| Service class                         | `ItemExportService`                                | Same                                                       |
| Service method (CSV)                  | `exportService.exportToCSV()`                      | `exportService.generateSampleCSV()`                        |
| Service method (XLSX)                 | `exportService.exportToXLSX()`                     | `exportService.generateSampleXLSX()`                       |
| Happy-path payload                    | The full per-tenant items dump (live CMS / DB data) | A static schema-documentation template (importable column shape) |
| Admin-driver UI                       | "Export Items" action in `AdminDataExportPage`     | "Download Sample Template" action in `AdminDataExportPage` |

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  and
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md)
  — sibling per-spec-file references (the **first
  five** under `tests/api/`; this spec is the
  **sixth**).
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the admin data-export page-object driver paired
  with the same admin route's UI shell.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the admin item-form page-object driver, sibling
  shell of the items area.
- [`admin-items-page-object.md`](admin-items-page-object.md)
  — the admin items list page-object driver paired
  with the items-area UI shell.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items-export route sits
  inside.
