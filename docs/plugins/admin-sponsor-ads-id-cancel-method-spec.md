---
id: admin-sponsor-ads-id-cancel-method-spec
title: E2E Admin Sponsor Ads [id] Cancel Method Spec (apps/web-e2e/tests/api/admin-sponsor-ads-id-cancel-method.spec.ts)
sidebar_label: E2E Admin Sponsor Ads [id] Cancel Method Spec
sidebar_position: 522
---

# E2E Admin Sponsor Ads [id] Cancel Method Spec — `apps/web-e2e/tests/api/admin-sponsor-ads-id-cancel-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin sponsor-ad cancellation method / id / body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-sponsor-ads-id-cancel-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-sponsor-ads-id-cancel-method.spec.ts).
Sits inside the `tests/api/` test subtree alongside the
sibling admin-tree body, query, and method smoke specs and
the **immediately-preceding**
[`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md).

This is the **twenty-second** per-source-file reference the
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
[`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
and
[`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md),
and the **twentieth** under `tests/api/`.

## Why this spec is the optional-Zod-field admin-tree smoke

The route under test
([`apps/web/app/api/admin/sponsor-ads/[id]/cancel/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/[id]/cancel/route.ts))
is the **first** admin-tree route the smoke layer covers
that combines:

- a dynamic-segment `[id]` `POST` handler with a **pure
  single-step `!session?.user?.isAdmin` gate** (NOT the
  compound `!isAdmin || !id` gate of the sibling
  `approve` / `reject` routes), AND
- a Zod-`safeParse(...)` body validation against an
  **optional-only** schema (`cancelReason` has only
  `maxLength: 500` and is NOT required), AND
- a **reverse-ordered two-branch catch chain** that puts
  the not-found 404 branch BEFORE the `Cannot cancel`
  400 branch — distinct from the sibling `reject` route
  which puts `Cannot reject` 400 BEFORE
  `Sponsor ad not found` 404.

The handler shares the SAME canonical longer 401 envelope
(`'Unauthorized. Admin access required.'`) and the SAME
`{ success: false, error: ... }` envelope shape with every
prior canonical-longer-envelope smoke, but pins these
three divergences:

1. **Pure single-step `!session?.user?.isAdmin` gate** — a
   single-step gate that ONLY checks `isAdmin`, distinct
   from the compound `!isAdmin || !id` gate of the sibling
   `approve` / `reject` routes. Observably the same on
   the unauth branch.
2. **Optional-only Zod schema** — `cancelReason` is
   OPTIONAL with a `maxLength: 500` constraint only. A
   missing / undefined / null `cancelReason` would pass
   validation on the auth branch (whereas the sibling
   `reject` route requires `rejectionReason` with
   `minLength: 10`). The unauth branch must NEVER reach
   the validation step regardless. This is the **first
   optional-Zod-field admin-tree smoke** the docs tree
   publishes.
3. **Reverse-ordered two-branch catch chain**:
   - (a) `'Sponsor ad not found'` → 404 — fires FIRST.
   - (b) `error.message.includes('Cannot cancel')` →
     400 — fires SECOND.
   Fallback: `safeErrorResponse(error, 'Failed to cancel
   sponsor ad')`. The unauth branch must NEVER reach the
   catch.

## Cross-route gate-shape comparison

The pure single-step gate, the optional-Zod-field, and the
reverse-ordered catch chain are the load-bearing
divergences this spec pins:

| Route                                          | Method  | Path shape         | Gate steps                                              | Body schema constraint                       | Catch chain order                                                  |
| ---------------------------------------------- | ------- | ------------------ | ------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `/api/admin/sponsor-ads/{id}/cancel` (this)    | `POST`  | Dynamic `[id]`     | Pure `!session?.user?.isAdmin`                          | Zod, `cancelReason` **optional** maxLength 500 | 404 not-found FIRST, then 400 `'Cannot cancel'`, then `safeErrorResponse(...)` |
| `/api/admin/sponsor-ads/{id}/reject`           | `POST`  | Dynamic `[id]`     | Compound `!isAdmin || !id`                              | Zod, `rejectionReason` **required** minLength 10 / maxLength 500 | 400 `'Cannot reject'` FIRST, then 404 not-found, then `safeErrorResponse(...)` |
| `/api/admin/sponsor-ads/{id}/approve`          | `POST`  | Dynamic `[id]`     | Compound `!isAdmin || !id`                              | Manual `body.forceApprove === true`         | 404 not-found, then 400 `'PAYMENT_NOT_RECEIVED'`, then 400 `'Cannot approve'`, then `safeErrorResponse(...)` |
| `/api/admin/items/{id}/review`                 | `POST`  | Dynamic `[id]`     | Pure `!session?.user?.isAdmin`                          | Manual `['approved', 'rejected'].includes(...)` | `safeErrorResponse(error, 'Failed to review item')`                |
| `/api/admin/items/import`                      | `POST`  | Static             | Pure `!session?.user?.isAdmin`                          | Manual two-step body validation              | `safeErrorResponse(error, 'Failed to execute import')`             |

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** + **eleven hand-
written scenarios** under a single top-level
`test.describe('API: /api/admin/sponsor-ads/[id]/cancel method / id / body / header surface', …)`:

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of SPONSOR_AD_IDS) test(…)`                                                         | Bulk-loop walk of every plausible id shape (~6 ids).                                                                                                                |
| `for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_CANCEL_HEADERS) test(…)`                    | Bulk-loop walk of every plausible header shape (~21 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_SPONSOR_ADS_ID_CANCEL_BODIES) test(…)`                        | Bulk-loop walk of every plausible body shape (~14 bodies including optional-Zod-field probes for valid / empty / null / undefined / 501-char-too-long / numeric `cancelReason`). |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope.                                                                                                                              |
| `test('… Unauthorized error envelope echoes the success: false key', …)`                           | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion.                                                                                                                                        |
| `test('… does NOT echo any of the catch-chain or service-fallback messages on the unauth branch', …)` | Pins the gate-before-post-auth order across four candidate bodies.                                                                                                  |
| `test('… has a stable status across header / body permutations', …)`                               | Seven permutations vs the no-body baseline.                                                                                                                          |
| `test('… has a stable status across distinct id shapes', …)`                                       | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                        | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… service call is NOT entered on the unauth branch', …)`                                    | Pins the gate-before-service order.                                                                                                                                 |
| `test('… is invariant to cancelReason length / shape on the unauth branch', …)`                    | Pins the gate-before-Zod-validation order: every `cancelReason` shape (missing + empty + null + valid + 500-char-boundary + 501-char-too-long + numeric) must round-trip to the same 401 status. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id / header /
   body permutation (~41 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — exact match.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data`,
   `message`, `success: true` must NOT appear.
5. **Gate-before-post-auth invariant** — none of
   `'Sponsor ad not found'`, `'Failed to cancel
   sponsor ad'`, `'Sponsor ad cancelled
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
    `cancelReason` shape (missing + empty + null +
    valid + 500-char-boundary + 501-char-too-long +
    numeric) must round-trip to the same 401 status,
    pinning that the
    `cancelSponsorAdSchema.safeParse(...)` is NOT
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
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md),
  and
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md)
  — sibling per-spec-file references (the **first
  nineteen** under `tests/api/`; this spec is the
  **twentieth**).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the sponsor-ad cancellation
  route sits inside.
