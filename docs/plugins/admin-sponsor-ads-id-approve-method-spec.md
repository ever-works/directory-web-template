---
id: admin-sponsor-ads-id-approve-method-spec
title: E2E Admin Sponsor Ads [id] Approve Method Spec (apps/web-e2e/tests/api/admin-sponsor-ads-id-approve-method.spec.ts)
sidebar_label: E2E Admin Sponsor Ads [id] Approve Method Spec
sidebar_position: 520
---

# E2E Admin Sponsor Ads [id] Approve Method Spec — `apps/web-e2e/tests/api/admin-sponsor-ads-id-approve-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin sponsor-ad approval method / id / body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-sponsor-ads-id-approve-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-sponsor-ads-id-approve-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md).

This is the **twentieth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout opened by
[`smoke-health-spec.md`](smoke-health-spec.md),
[`smoke-navigation-spec.md`](smoke-navigation-spec.md),
[`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
[`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
[`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
[`admin-roles-query-spec.md`](admin-roles-query-spec.md),
[`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
[`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
[`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
[`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
[`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md),
[`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
[`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
[`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
[`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
[`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
[`admin-items-import-body-spec.md`](admin-items-import-body-spec.md),
[`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
and
[`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md),
and the **eighteenth** under `tests/api/`.

## Why this spec is the multi-error-code-catch admin-tree smoke

The route under test
([`apps/web/app/api/admin/sponsor-ads/[id]/approve/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/[id]/approve/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a dynamic-segment `[id]` `POST` handler with
a **forgiving body parse inside its own try/catch** AFTER
the gate and AFTER params resolution, AND a **multi-error-
code catch chain** that maps three distinct service-thrown
`Error.message` values to three distinct HTTP envelopes.

1. **`POST` handler with a dynamic `[id]` path
   parameter** — sibling of `admin/items/[id]/review`
   (also a dynamic-segment `POST` handler) but with a
   different gate / body / catch posture.
2. **Compound single-`if` gate**:
   `if (!session?.user?.isAdmin || !session.user.id)` →
   401
   `{ success: false, error: 'Unauthorized. Admin access required.' }`.
   A single-step gate that ANDs the canonical `isAdmin`
   predicate with a `!session.user.id` falsity probe —
   distinct from the pure single-step
   `!session?.user?.isAdmin` of `admin/items/import` /
   `admin/items/bulk` etc., and distinct from the two-step
   `!session?.user` → `!session.user.isAdmin` /
   `!session?.user?.id` → `!tenantId` gates of the bare-
   envelope routes. The compound predicate is observably
   equivalent to the single-step gate from the unauth
   client's perspective.
3. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` — matching
   the canonical-longer-envelope family.
4. **`success: false` envelope key on the 401 branch** —
   matching the same family.
5. **Params resolution AFTER the gate** — the
   `await params` is called AFTER the gate, so every id
   shape must round-trip to the same 401 status as the
   canonical id baseline.
6. **Body parse inside its own try/catch** AFTER params
   AND AFTER the gate — the `forceApprove` flag defaults
   to `false` if the body is missing, malformed, or
   omits the key. The unauth branch must NEVER reach the
   body parse.
7. **Service-call surface** AFTER both the gate AND the
   body parse — the handler calls
   `sponsorAdService.approveSponsorAd(id,
   session.user.id, forceApprove)`. The success-branch
   payload shape is
   `{ success: true, data: <ad>, message: 'Sponsor ad
   approved and activated successfully' }`. The unauth
   branch must NEVER reach the service.
8. **Multi-error-code catch chain** that maps three
   distinct `Error.message` values to three distinct
   HTTP envelopes:
   - (a) `'Sponsor ad not found'` → 404.
   - (b) `'PAYMENT_NOT_RECEIVED'` → 400.
   - (c) `error.message.includes('Cannot approve')` →
     400.
   Fallback: `safeErrorResponse(error, 'Failed to
   approve sponsor ad')`. The unauth branch must NEVER
   reach the catch.
9. **Service-zero-rows fallback** — if
   `approveSponsorAd(...)` returns falsy, the route
   returns 500
   `{ success: false, error: 'Failed to approve sponsor
   ad' }`. The unauth branch must NEVER reach this
   fallback.
10. **Method-resolution surface** — the route exports
    ONLY `POST`. Every other method (`GET` / `PUT` /
    `PATCH` / `DELETE`) must round-trip to a `< 500`
    status (typically 405 Method Not Allowed).

## Cross-route gate-shape comparison

The compound single-`if` gate, the forgiving body parse,
and the multi-error-code catch chain are the load-bearing
divergences this spec pins:

| Route                                          | Method  | Path shape         | Body shape | Gate steps                                                  | Body parse posture                          | Catch posture                                                      | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | ---------- | ----------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| `/api/admin/sponsor-ads/{id}/approve` (this)   | `POST`  | Dynamic `[id]`     | JSON       | Compound `!isAdmin || !id` (single `if`)                    | Inner try/catch swallows malformed bodies   | Three-branch catch chain + `safeErrorResponse(...)` fallback       | `{ success: false, error: ... }`            |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | JSON       | Single-step `!isAdmin`                                      | Outer try/catch                             | `safeErrorResponse(error, 'Failed to review item')`                | Same                                        |
| `/api/admin/items/{id}/history`                | `GET`   | Dynamic `[id]`     | n/a        | Single-step `!isAdmin`                                      | n/a (query-param)                           | `safeErrorResponse(error, 'Failed to fetch item history')`         | Same                                        |
| `/api/admin/items/import`                      | `POST`  | Static             | JSON       | Single-step `!isAdmin`                                      | Outer try/catch                             | `safeErrorResponse(error, 'Failed to execute import')`             | Same                                        |
| `/api/admin/items/import/validate`             | `POST`  | Static             | multipart  | Single-step `!isAdmin`                                      | Outer try/catch                             | `safeErrorResponse(error, 'Failed to validate import file')`       | Same                                        |
| `/api/admin/items/bulk`                        | `POST`  | Static             | JSON       | Single-step `!isAdmin`                                      | Outer try/catch                             | `safeErrorResponse(error, 'Failed to process bulk action')`        | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | JSON       | Single-step `!isAdmin`                                      | Outer try/catch                             | `safeErrorResponse(error, 'Failed to reorder categories')`         | Same                                        |
| `/api/admin/notifications/{id}/read`           | `PATCH` | Dynamic `[id]`     | n/a        | Two-step `!session?.user?.id` → `!tenantId`                 | n/a (no body parse)                         | `console.error` + bare `'Internal server error'`                   | `{ error: ... }` (no `success` key)         |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | n/a        | Same                                                        | n/a (no body parse)                         | Same                                                               | Same                                        |
| `/api/admin/users/check-email`                 | `POST`  | Static             | JSON       | Two-step `!session?.user` → `!session.user.isAdmin`         | Outer try/catch                             | `console.error` + bare `'Internal server error'`                   | Same                                        |
| `/api/admin/clients/bulk`                      | `POST`  | Static             | JSON       | Same                                                        | Body forwarded to service                   | Same                                                               | Same                                        |

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/sponsor-ads/[id]/approve method / id / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of SPONSOR_AD_IDS) test(…)`                                                         | Bulk-loop walk of every plausible id shape (~6 ids). Asserts the `< 500` no-server-error invariant.                                                                |
| `for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_APPROVE_HEADERS) test(…)`                   | Bulk-loop walk of every plausible header shape (~21 headers). Asserts the `< 500` no-server-error invariant.                                                       |
| `for (const { data, label } of ADMIN_SPONSOR_ADS_ID_APPROVE_BODIES) test(…)`                       | Bulk-loop walk of every plausible body shape (~14 bodies). Asserts the `< 500` no-server-error invariant.                                                          |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope: `{ success: false, error: 'Unauthorized. Admin access required.' }`.                                                        |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                           | Strict envelope-shape assertion: `Object.keys(body).sort() === ['error', 'success']`.                                                                                |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: the unauth response body must NOT contain `data`, `message`, or `success: true`.                                                       |
| `test('… does NOT echo any of the catch-chain or service-fallback messages on the unauth branch', …)` | Pins the gate-before-post-auth order: `'Sponsor ad not found'`, `'PAYMENT_NOT_RECEIVED'`, `'Failed to approve sponsor ad'`, and `'Sponsor ad approved and activated successfully'` must NEVER appear in the unauth response body. |
| `test('… has a stable status across header / body permutations', …)`                               | Compares eight different parameterised header / body permutations against the no-body baseline status.                                                              |
| `test('… has a stable status across distinct id shapes', …)`                                       | Pins the gate-before-params-resolution order: every id shape must round-trip to the same 401 status as the canonical baseline.                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order: malformed JSON bodies must NOT 400 with a JSON-parse error before the gate fires.                                            |
| `test('… service call is NOT entered on the unauth branch', …)`                                    | Pins the gate-before-service order: the unauth response must NOT contain a `data` key.                                                                              |
| `test('… is invariant to forceApprove enum shapes on the unauth branch', …)`                       | Pins the gate-before-flag-evaluation order: every `forceApprove` shape (true/false/string/numeric/null/missing) must round-trip to the same 401 status.              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id / header /
   body permutation (~41 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — the body must echo
   `{ success: false, error: 'Unauthorized. Admin access required.' }`
   exactly.
3. **Strict envelope-shape preservation** — the error
   response body has exactly two keys
   (`error`, `success`).
4. **Success-branch-key non-disclosure** — the
   `data` and `message` keys (the service-call payload
   and success message) and the `success: true` key
   must NOT appear in the unauth response.
5. **Gate-before-post-auth invariant** — none of the
   four post-gate messages (`'Sponsor ad not found'`,
   `'PAYMENT_NOT_RECEIVED'`, `'Failed to approve
   sponsor ad'`, `'Sponsor ad approved and activated
   successfully'`) must appear in the unauth response
   body.
6. **Status invariance across header / body
   permutations** — any combination must round-trip to
   the same status as the no-body baseline.
7. **Status invariance across distinct id shapes** —
   every id shape must round-trip to the same status
   as the canonical id baseline.
8. **Side-channel isolation** — fabricated session-
   token cookies and `X-*` headers do NOT 5xx and do
   NOT bypass the gate.
9. **Cross-method invariance** — `GET` / `PUT` /
   `PATCH` / `DELETE` round-trip to a `< 500` status.
10. **Gate-before-body-parse invariant** — malformed
    JSON bodies do NOT 400 with a JSON-parse error
    before the gate fires (and would not 400 even on
    the auth branch because of the inner try/catch).
11. **Gate-before-service invariant** — the
    `sponsorAdService.approveSponsorAd(...)` call is
    NOT entered on the unauth branch.
12. **Gate-before-flag-evaluation invariant** — every
    `forceApprove` shape (true/false/string/numeric/
    null/missing) must round-trip to the same 401
    status.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
  [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
  [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
  [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
  [`admin-items-export-query-spec.md`](admin-items-export-query-spec.md),
  [`admin-users-check-email-body-spec.md`](admin-users-check-email-body-spec.md),
  [`admin-users-check-username-body-spec.md`](admin-users-check-username-body-spec.md),
  [`admin-notifications-mark-all-read-method-spec.md`](admin-notifications-mark-all-read-method-spec.md),
  [`admin-categories-reorder-method-spec.md`](admin-categories-reorder-method-spec.md),
  [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md),
  [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md),
  [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
  [`admin-items-id-history-query-spec.md`](admin-items-id-history-query-spec.md),
  [`admin-items-import-body-spec.md`](admin-items-import-body-spec.md),
  [`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
  and
  [`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md)
  — sibling per-spec-file references (the **first
  seventeen** under `tests/api/`; this spec is the
  **eighteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the sponsor-ad approval route
  sits inside.
