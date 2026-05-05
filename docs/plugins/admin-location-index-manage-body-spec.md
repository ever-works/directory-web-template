---
id: admin-location-index-manage-body-spec
title: E2E Admin Location Index Manage Body Spec (apps/web-e2e/tests/api/admin-location-index-manage-body.spec.ts)
sidebar_label: E2E Admin Location Index Manage Body Spec
sidebar_position: 553
---

# E2E Admin Location Index Manage Body Spec — `apps/web-e2e/tests/api/admin-location-index-manage-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin location-index manage POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-location-index-manage-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-location-index-manage-body.spec.ts).

This is the **first POST smoke** the docs tree
publishes that uses the **`checkAdminAuth()` helper**
from `@/lib/auth/admin-guard.ts` (the GET-sibling
[`admin-location-index-query-spec.md`](admin-location-index-query-spec.md)
already covers the helper for the query endpoint;
this is the first POST smoke that does the same).

It is also the **first action-enum-dispatched POST
smoke** the docs tree publishes that branches on a
`body.action === 'rebuild' | 'clear'` enum into TWO
distinct destructive operations on the same path:

- `'rebuild'` → calls `itemRepository.findAll()` +
  `service.rebuildIndex(items)` — the **heaviest
  service call across the entire admin tree**
  (re-indexes EVERY item with location data).
- `'clear'` → calls `clearLocationIndex()` — a
  **destructive table-wipe** that drops every row
  from the location_index table.

No prior POST smoke covers a destructive-operation
dispatcher of this shape.

## Why this spec is the destructive-action-enum-dispatch POST smoke

The route under test
([`apps/web/app/api/admin/location-index/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/location-index/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **`checkAdminAuth()` helper call** that folds three
   branches into one helper:
   - `!session?.user` → 401 `{ success: false,
     error: 'Unauthorized' }`.
   - `!session.user.id` → 401 `{ success: false,
     error: 'User ID not found' }`.
   - `!userIsAdmin` → 403 `{ success: false,
     error: 'Insufficient permissions' }`.

   For an unauthenticated request, the FIRST branch
   fires returning 401 `{ success: false, error:
   'Unauthorized' }` (canonical envelope with
   `success: false` AND short `'Unauthorized'`
   message).
2. **JSON body parse via `await request.json()`**
   AFTER the gate (inside the `try` block).
3. **Action enum dispatch** with three branches:
   - `action === 'rebuild'` → 200 `{ success:
     true, data: <rebuildResult> }`.
   - `action === 'clear'` → 200 `{ success: true,
     data: { cleared: <count> } }`.
   - else → 400 `{ success: false, error:
     'Invalid action. Use "rebuild" or
     "clear".' }`.
4. **`getLocationIndexService()` + `service.
   rebuildIndex(items)`** — the load-bearing
   rebuild path.
5. **`clearLocationIndex()`** — the load-bearing
   destructive table-wipe path.
6. **Outer catch** — `console.error` + 500
   `{ success: false, error: 'Internal server
   error' }`.
7. **Method-resolution surface** — the route
   exports `GET` and `POST`. `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~12
bodies) and **eleven hand-written scenarios**.

| Block                                                                                            | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_LOCATION_INDEX_MANAGE_HEADERS) test(…)`                  | Bulk-loop walk of every plausible header shape (~14 headers).                                                                                                      |
| `for (const { data, label } of ADMIN_LOCATION_INDEX_MANAGE_BODIES) test(…)`                      | Bulk-loop walk of every plausible body shape (~12 bodies covering valid actions, invalid actions, bypass shapes).                                                  |
| `test('… returns 401 with the canonical-envelope bare-message envelope', …)`                     | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                                                           |
| `test('… envelope shape has exactly success and error keys', …)`                                 | Strict envelope-shape assertion.                                                                                                                                   |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                        | Negative-property assertion: `data`, `cleared` must NOT appear; `success` must be `false`.                                                                         |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                  | Pins the gate-before-post-auth order across four candidate static messages.                                                                                        |
| `test('… has a stable status across header / body permutations', …)`                             | Six body permutations vs the no-body baseline.                                                                                                                     |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                 | Side-channel walk.                                                                                                                                                 |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk.                                                                                                                                            |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                        | Pins the gate-before-body-parse order.                                                                                                                             |
| `test('… action-enum dispatch is NOT entered on the unauth branch', …)`                          | Pins the gate-before-dispatch order: the unauth response must NEVER echo `'Invalid action. Use "rebuild" or "clear".'`.                                            |
| `test('… rebuild + clear destructive paths are NOT entered on the unauth branch', …)`            | Pins the gate-before-destructive-operation order: the unauth response must NEVER echo a `data` key from rebuild / clear.                                           |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data`,
   `cleared` keys must NOT appear in any unauth
   response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-dispatch invariant** for the
    invalid-action 400 branch.
11. **Gate-before-destructive-operation invariant**
    pinning that neither `service.rebuildIndex(...)`
    nor `clearLocationIndex()` runs on the unauth
    branch.

## See also

- The query-surface companion
  [`admin-location-index-query-spec.md`](admin-location-index-query-spec.md)
  is the GET sibling of the same route — the FIRST
  `checkAdminAuth()` helper smoke; this manage-POST
  smoke is the FIRST `checkAdminAuth()` helper POST
  smoke.
- The dashboard-stats sibling
  [`admin-clients-dashboard-query-spec.md`](admin-clients-dashboard-query-spec.md)
  is the SECOND `checkAdminAuth()` helper consumer
  the docs tree references for query endpoints.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the location-index route
  sits inside.
