---
id: admin-sponsor-ads-id-method-spec
title: E2E Admin Sponsor Ads [id] Method Spec (apps/web-e2e/tests/api/admin-sponsor-ads-id-method.spec.ts)
sidebar_label: E2E Admin Sponsor Ads [id] Method Spec
sidebar_position: 530
---

# E2E Admin Sponsor Ads [id] Method Spec — `apps/web-e2e/tests/api/admin-sponsor-ads-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-sponsor-ad GET / DELETE method / id /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-sponsor-ads-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-sponsor-ads-id-method.spec.ts).

This is the **first GET + DELETE-only dual-method admin-
tree smoke** the docs tree publishes — the sponsor-ad
write path is split across the sibling
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
[`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
and
[`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md)
action routes which the smoke layer already covers
separately, so this leaf-`[id]` root route only ships
`GET` (read) and `DELETE` (purge) handlers. With this
entry, the sponsor-ad area smoke coverage is complete.

## Why this spec is the GET + DELETE-only dual-method smoke

The route under test
([`apps/web/app/api/admin/sponsor-ads/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/[id]/route.ts))
exports `GET` and `DELETE` from a single file. Both
handlers share the SAME single-step inline
`!session?.user?.isAdmin` gate, the SAME canonical longer
401 envelope (`'Unauthorized. Admin access required.'`),
and the SAME `{ success: false, error: ... }` envelope
shape — but each diverges on its catch posture, which is
the load-bearing divergence this spec pins:

| Handler  | Service call                                            | Catch posture                                                                                                | Success-payload shape                                                            |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `GET`    | `sponsorAdService.getSponsorAdWithUser(id)` → 404 `'Sponsor ad not found'` if missing | `console.error('Error fetching sponsor ad:', error)` + 500 `'Failed to fetch sponsor ad'`                    | `{ success: true, data: <sponsorAd> }`                                            |
| `DELETE` | `sponsorAdService.deleteSponsorAd(id)` (the service throws `'Sponsor ad not found'` on missing) | **Narrow-match `error.message === 'Sponsor ad not found'`** → 404 echoing the service-thrown sentinel, else `safeErrorResponse(error, 'Failed to delete sponsor ad')` fallback | `{ success: true, message: 'Sponsor ad deleted successfully' }` (NO `data` key)   |

The DELETE handler is the **first admin DELETE smoke**
where the catch chain begins with a narrow-match equality
check on a service-thrown sentinel string (rather than a
`.includes(...)` substring match or a fixed fallback).

## Cross-route GET + DELETE dual-method comparison

This is the **first** GET + DELETE-only dual-method admin
smoke. Every prior dual-method admin smoke combines GET
with PUT (the `admin/roles/[id]/permissions` and
`admin/reports/[id]` routes). Every prior triple-method
admin smoke includes both PUT and DELETE alongside GET.

| Route                                          | Methods        | Catch chain                                                                                                             |
| ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/sponsor-ads/{id}` (this spec)      | `GET` + `DELETE` | GET: `console.error` + 500 `'Failed to fetch'`. DELETE: narrow-match `'Sponsor ad not found'` → 404, else `safeErrorResponse(...)`. |
| `/api/admin/roles/{id}/permissions`            | `GET` + `PUT`  | Both: `console.error` + 500 `'Internal server error'`.                                                                    |
| `/api/admin/reports/{id}`                      | `GET` + `PUT`  | Both: dev-gated `console.error` + 500 `'Internal Server Error'`. PUT additionally maps `error.message.includes(...)` patterns. |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | All three: `safeErrorResponse(error, 'Failed to <verb> item')`.                                                          |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | All three: `console.error` + bare `'Failed to <verb> client'`.                                                            |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | All three: `console.error` + 500 `'Internal server error'`. PUT and DELETE additionally: `error instanceof Error` → 400 `error.message`. |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | All three: `safeErrorResponse(...)`. PUT and DELETE additionally: `error.message.includes('not found' / 'already exists' / 'must be')` patterns. |

## How the spec walks its scenario tree

The spec emits **two method-bulk-loop walks** across id
shapes, **two method-bulk-loop walks** across header
shapes, and a suite of **twelve hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of SPONSOR_AD_IDS) test('GET' / 'DELETE' …)`                                        | Bulk-loop walk of every plausible id shape (~6 ids) × two methods.                                                                                                  |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'DELETE' …)`                        | Bulk-loop walk of every plausible header shape (~17 headers) × two methods.                                                                                         |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                     | Pins the canonical longer 401 envelope for `GET`.                                                                                                                    |
| `test('DELETE … returns 401 with the canonical longer Unauthorized envelope', …)`                  | Pins the canonical longer 401 envelope for `DELETE`.                                                                                                                |
| `test('GET / DELETE … envelope shape has exactly success and error keys', …)`                      | Strict envelope-shape assertion across both methods.                                                                                                                 |
| `test('GET / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`                 | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`             | Negative-property assertion across both methods.                                                                                                                     |
| `test('GET / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`       | Pins the gate-before-post-auth order across four candidate messages.                                                                                                |
| `test('GET / DELETE … has a stable status across distinct id shapes', …)`                          | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('GET / DELETE … does NOT branch on side-channel cookies / headers', …)`                      | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (POST / PUT / PATCH) does NOT 5xx', …)`                                | Method-resolution walk: POST / PUT / PATCH round-trip to `< 500`.                                                                                                    |
| `test('GET / DELETE … service call is NOT entered on the unauth branch', …)`                       | Pins the gate-before-service order.                                                                                                                                 |
| `test('DELETE … narrow-match catch is NOT entered on the unauth branch', …)`                       | Pins the gate-before-narrow-match-catch invariant: the unauth response must NEVER echo the `'Sponsor ad not found'` service-thrown sentinel.                          |
| `test('GET / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)`    | Pins the per-handler catch-message divergence.                                                                                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation and every header × method permutation
   (~~6×2 + 17×2 = ~46 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** for each of `GET` and `DELETE` — exact
   match.
3. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
4. **Cross-method envelope equality**.
5. **Success-branch-key non-disclosure** — `data`,
   `message`, `success: true` must NOT appear in any
   unauth response.
6. **Gate-before-post-auth invariant** — none of
   `'Sponsor ad not found'`, `'Failed to fetch
   sponsor ad'`, `'Failed to delete sponsor ad'`,
   `'Sponsor ad deleted successfully'` must appear in
   any unauth response.
7. **Status invariance across distinct id shapes**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — `POST` / `PUT` /
   `PATCH` round-trip to a `< 500` status.
10. **Gate-before-service invariant**.
11. **Gate-before-narrow-match-catch invariant** — the
    DELETE handler's narrow-match
    `error.message === 'Sponsor ad not found'` → 404
    catch step is NOT entered on the unauth branch, so
    the unauth response must NEVER echo the service-
    thrown sentinel.
12. **Per-handler catch-message divergence** — a
    regression that swapped the two messages would
    surface as the wrong message echoing on the auth
    branch; the unauth branch must NOT echo either.

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the three sponsor-ad action
  smokes
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
  and
  [`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md),
  the canonical-longer-envelope triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  and the dual-method
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md)
  and
  [`admin-reports-id-method-spec.md`](admin-reports-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-sponsor-ad CRUD
  route sits inside.
