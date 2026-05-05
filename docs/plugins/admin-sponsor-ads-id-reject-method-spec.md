---
id: admin-sponsor-ads-id-reject-method-spec
title: E2E Admin Sponsor Ads [id] Reject Method Spec (apps/web-e2e/tests/api/admin-sponsor-ads-id-reject-method.spec.ts)
sidebar_label: E2E Admin Sponsor Ads [id] Reject Method Spec
sidebar_position: 521
---

# E2E Admin Sponsor Ads [id] Reject Method Spec — `apps/web-e2e/tests/api/admin-sponsor-ads-id-reject-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin sponsor-ad rejection method / id / body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-sponsor-ads-id-reject-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-sponsor-ads-id-reject-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md).

This is the **twenty-first** per-source-file reference the
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
[`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md),
and
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
and the **nineteenth** under `tests/api/`.

## Why this spec is the Zod-`safeParse(...)` admin-tree smoke

The route under test
([`apps/web/app/api/admin/sponsor-ads/[id]/reject/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/[id]/reject/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines a dynamic-segment `[id]` `POST` handler with
a **Zod-`safeParse(...)` body validation** AFTER the gate
AND AFTER params resolution AND AFTER the body parse, AND a
**two-branch catch chain** that maps two distinct service-
thrown `Error.message` values to two distinct HTTP
envelopes.

The handler is the sibling of
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md)
— it shares the SAME compound single-`if` gate
(`!session?.user?.isAdmin || !session.user.id`), the SAME
canonical longer 401 envelope, and the SAME
`{ success: false, error: ... }` envelope shape, but
diverges on:

1. **Body validation strategy** — `safeParse(...)` from a
   Zod `rejectSponsorAdSchema` rather than the manual key-
   by-key check the `approve` route uses for the
   `forceApprove` flag. The 400 response echoes
   `validationResult.error.issues[0]?.message ||
   'Invalid request body'` — a **dynamic** error message
   drawn from the Zod schema, distinct from the hand-
   rolled string literals of every prior admin-tree
   smoke. This is the **first Zod-`safeParse(...)`
   admin-tree smoke** the docs tree publishes.
2. **Body parse via `.catch(() => ({}))`** — a single-
   expression Promise-chain catch that returns an empty
   object on parse failure, distinct from the inner
   try/catch block of the `approve` route. The body
   parse is unreachable on the unauth branch.
3. **Two-branch catch chain**:
   - (a) `error.message.includes('Cannot reject')` →
     400 `{ success: false, error: <message> }`.
   - (b) `'Sponsor ad not found'` → 404
     `{ success: false, error: 'Sponsor ad not found' }`.
   Fallback: `safeErrorResponse(error, 'Failed to reject
   sponsor ad')`. The unauth branch must NEVER reach the
   catch.
4. **Schema constraints** — the `rejectionReason` field
   is required, with `minLength: 10` and `maxLength: 500`.
   The schema also threads `id` from `params` through the
   schema (`{ id, rejectionReason: body.rejectionReason }`),
   so the `id` is co-validated with the body — distinct
   from the `approve` route which validates only the
   `forceApprove` flag.

## Cross-route gate-shape comparison

The Zod-`safeParse(...)` body validation surface and the
two-branch catch chain are the load-bearing divergences
this spec pins:

| Route                                          | Method  | Path shape         | Body validation strategy                       | Catch posture                                                      | 401 envelope shape                          |
| ---------------------------------------------- | ------- | ------------------ | ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| `/api/admin/sponsor-ads/{id}/reject` (this)    | `POST`  | Dynamic `[id]`     | Zod `rejectSponsorAdSchema.safeParse(...)`     | Two-branch catch chain + `safeErrorResponse(...)` fallback         | `{ success: false, error: ... }`            |
| `/api/admin/sponsor-ads/{id}/approve`          | `POST`  | Dynamic `[id]`     | Manual `body.forceApprove === true` check      | Three-branch catch chain + `safeErrorResponse(...)` fallback       | Same                                        |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Manual `['approved', 'rejected'].includes(...)` | `safeErrorResponse(error, 'Failed to review item')`                | Same                                        |
| `/api/admin/items/import`                      | `POST`  | Static             | Manual two-step body validation                | `safeErrorResponse(error, 'Failed to execute import')`             | Same                                        |
| `/api/admin/items/import/validate`             | `POST`  | Static             | Manual five-step file/mapping validation       | `safeErrorResponse(error, 'Failed to validate import file')`       | Same                                        |
| `/api/admin/items/bulk`                        | `POST`  | Static             | Manual six-step body validation                | `safeErrorResponse(error, 'Failed to process bulk action')`        | Same                                        |
| `/api/admin/categories/reorder`                | `PUT`   | Static             | Manual three-step body validation              | `safeErrorResponse(error, 'Failed to reorder categories')`         | Same                                        |
| `/api/admin/users/check-email`                 | `POST`  | Static             | Manual single-step body validation             | `console.error` + bare `'Internal server error'`                   | Same                                        |
| `/api/admin/users/check-username`              | `POST`  | Static             | Manual single-step body validation             | Same                                                               | Same                                        |
| `/api/admin/notifications/{id}/read`           | `PATCH` | Dynamic `[id]`     | n/a (no body parse)                            | Same                                                               | `{ error: ... }` (no `success` key)         |
| `/api/admin/notifications/mark-all-read`       | `PATCH` | Static             | n/a (no body parse)                            | Same                                                               | Same                                        |

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/sponsor-ads/[id]/reject method / id / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of SPONSOR_AD_IDS) test(…)`                                                         | Bulk-loop walk of every plausible id shape (~6 ids). Asserts the `< 500` no-server-error invariant.                                                                |
| `for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_REJECT_HEADERS) test(…)`                    | Bulk-loop walk of every plausible header shape (~21 headers). Asserts the `< 500` no-server-error invariant.                                                       |
| `for (const { data, label } of ADMIN_SPONSOR_ADS_ID_REJECT_BODIES) test(…)`                        | Bulk-loop walk of every plausible body shape (~15 bodies including Zod-schema probes for too-short / too-long / empty / null / numeric / missing `rejectionReason`). Asserts the `< 500` no-server-error invariant. |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope.                                                                                                                              |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                           | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `message`, `success: true` must NOT appear.                                                                                    |
| `test('… does NOT echo any of the catch-chain or service-fallback messages on the unauth branch', …)` | Pins the gate-before-post-auth order across four candidate bodies.                                                                                                  |
| `test('… has a stable status across header / body permutations', …)`                               | Eight permutations vs the no-body baseline.                                                                                                                          |
| `test('… has a stable status across distinct id shapes', …)`                                       | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… service call is NOT entered on the unauth branch', …)`                                    | Pins the gate-before-service order.                                                                                                                                 |
| `test('… is invariant to rejectionReason length / shape on the unauth branch', …)`                 | Pins the gate-before-Zod-validation order: every `rejectionReason` shape (valid 70-char + 10-char-min boundary + 5-char-too-short + empty + null + numeric + 501-char-too-long + missing) must round-trip to the same 401 status. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id / header /
   body permutation (~42 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — exact match.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data`,
   `message`, `success: true` must NOT appear.
5. **Gate-before-post-auth invariant** — none of
   `'Sponsor ad not found'`, `'Failed to reject
   sponsor ad'`, `'Sponsor ad rejected
   successfully'`, `'Invalid request body'` must
   appear in the unauth response body.
6. **Status invariance across header / body
   permutations**.
7. **Status invariance across distinct id shapes**.
8. **Side-channel isolation**.
9. **Cross-method invariance**.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-service invariant**.
12. **Gate-before-Zod-validation invariant** — every
    `rejectionReason` shape (valid + boundary + too-
    short + too-long + empty + null + numeric +
    missing) must round-trip to the same 401 status,
    pinning that the
    `rejectSponsorAdSchema.safeParse(...)` is NOT
    evaluated on the unauth branch.

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
  [`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md),
  and
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md)
  — sibling per-spec-file references (the **first
  eighteen** under `tests/api/`; this spec is the
  **nineteenth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the sponsor-ad rejection route
  sits inside.
