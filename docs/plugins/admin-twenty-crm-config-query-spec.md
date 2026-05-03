---
id: admin-twenty-crm-config-query-spec
title: E2E Admin Twenty CRM Config Query Spec (apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts)
sidebar_label: E2E Admin Twenty CRM Config Query Spec
sidebar_position: 504
---

# E2E Admin Twenty CRM Config Query Spec — `apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Twenty CRM configuration query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree query smoke specs and the
**immediately-preceding**
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md).

This is the **fourth** per-source-file reference the docs
tree publishes for any file under `apps/web-e2e/tests/`,
**continuing** the per-spec-file docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
and
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
and the **second** under `tests/api/`.

## Why this spec sits apart from every prior admin-tree query smoke

The route under test
([`apps/web/app/api/admin/twenty-crm/config/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/twenty-crm/config/route.ts))
documents three distinct postures the prior sibling
specs do not (or do partially):

1. **Route-specific
   `'Unauthorized. Admin access required.'` error
   string** — distinct from the bare `'Unauthorized'`
   string every other admin-tree route smoke-covered
   to date emits, and distinct from the `'Forbidden'`
   string the `admin/reports` and
   `admin/clients/stats` routes' second-step gates
   emit. The only sibling that uses the same
   purpose-built string is `admin/sponsor-ads`. A
   regression that swaps the error string back to the
   bare `'Unauthorized'` form would change the
   client-side error-handling contract for every
   consumer of the Twenty CRM admin dashboard widget.
2. **Bare `GET()` handler signature combined with
   single-step canonical-envelope gate** — the
   handler signature is `GET()` (no `request`
   parameter), so there is no `searchParams` surface
   inside the handler at all. Combined with the
   single-step `if (!session?.user?.isAdmin)` gate
   and the canonical
   `{ success: false, error: '…' }` envelope, this is
   the **first** admin-tree route the smoke layer
   covers that documents this exact intersection.
   Distinct from the immediately-preceding
   [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md)
   which uses the request-bearing
   `GET(req: NextRequest)` signature with the bare
   `{ error }` envelope.
3. **Per-tenant credential-disclosure contract** —
   the success branch returns a Twenty CRM config
   object whose `apiKey` field is masked by the
   `TwentyCrmConfigRepository.getConfig()` helper to
   `****<last4>` (only the final 4 characters of the
   API key are exposed). The spec includes a
   deliberate negative-string assertion that the
   unauth response body does NOT contain the masked
   form (`/\*{4}[A-Za-z0-9]{4}/` regex), the
   `TWENTY_CRM_API_KEY` / `TWENTY_CRM_BASE_URL`
   env-var names, or any of the config sub-field
   names (`apiKey`, `baseUrl`, `syncMode`). This is
   the **first** admin-tree query smoke that pins a
   per-tenant CRM-credential-disclosure contract on
   the unauth branch.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** + **13 hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/twenty-crm/config query-param surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_TWENTY_CRM_CONFIG_QUERIES) test(…)`                                       | Bulk-loop walk of every plausible query-param shape (52 paths). Asserts the `< 500` no-server-error invariant for each path.                                                                                                  |
| `test('… returns 401 with the route-specific Unauthorized envelope', …)`                            | Pins the **route-specific `'Unauthorized. Admin access required.'`** message as the unauth envelope.                                                                                                                          |
| `test('… ?syncMode=… does NOT bypass the admin gate', …)` and 6 sibling per-key variants            | Per-key isolation walks for `?syncMode=`, `?reveal=`, `?isAdmin=`, `?userId=`, `?token=`, `?bypass=`, plus an `Accept` header walk. Each compares the per-key responses to the no-arg baseline.                               |
| `test('… does NOT leak Twenty CRM credential surface on the unauth branch', …)`                    | Negative-string assertion that the unauth response body does NOT contain the masked-API-key regex, the env-var names, or the config sub-field names.                                                                         |
| `test('… error message does NOT echo any other admin-tree route signature', …)`                   | Pins the route-specific error string as load-bearing — the spec lists every sibling admin-tree route's error string and asserts the GET response does NOT match any of them.                                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query-param
   permutation must round-trip to a `< 500` status on
   the unauth branch.
2. **Route-specific `'Unauthorized. Admin access required.'`
   envelope shape** — the unauth branch returns
   `{ success: false, error: 'Unauthorized. Admin access required.' }`.
3. **Status invariance across query permutations** —
   the parameterised path's status equals the no-arg
   baseline's status. The spec walks 7 independent
   query-key shapes plus an `Accept` header walk.
4. **Per-tenant CRM-credential non-disclosure** — the
   unauth response body does NOT contain the masked
   API-key regex, the env-var names, or the config
   sub-field names.
5. **Cross-route error-string isolation** — the GET
   response error does NOT echo any other admin-tree
   route's error string (`'Unauthorized'` /
   `'Forbidden'` / `'Failed to retrieve configuration'`
   / `'User ID not found'` / `'Insufficient permissions'`).

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first
  two** under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md)
  — sibling per-spec-file reference (the **first**
  under `tests/api/`, this spec is the **second**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the Twenty CRM config route
  sits inside.
