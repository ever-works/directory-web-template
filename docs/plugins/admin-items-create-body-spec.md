---
id: admin-items-create-body-spec
title: E2E Admin Items Create Body Spec (apps/web-e2e/tests/api/admin-items-create-body.spec.ts)
sidebar_label: E2E Admin Items Create Body Spec
sidebar_position: 537
---

# E2E Admin Items Create Body Spec — `apps/web-e2e/tests/api/admin-items-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level item-create POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-items-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines a five-field
required-validation chain with two dynamically-
interpolated 409 Conflict pre-create duplicate checks AND
the audit-user-threading + CRM-company-link + Location-
Index side-effect chain on the success branch. The
companion
[`admin-items-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-query.spec.ts)
covers the GET (paginated list) surface of the same route.

## Why this spec is the collection-level POST smoke

The route under test
([`apps/web/app/api/admin/items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/route.ts))
exports `GET` and `POST`. The GET surface is covered by
the companion query spec; this spec covers the POST
surface. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin` gate**
   → 401
   `{ success: false, error: 'Unauthorized. Admin
   access required.' }`. Identical to the GET sibling.
2. **Canonical longer 401 message** + **`success: false`
   envelope key** with strict envelope-shape
   preservation
   `Object.keys(body).sort() === ['error', 'success']`.
3. **JSON body parse via `await request.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch — a
   malformed body would 500 via the outer
   `safeErrorResponse(...)` catch on the auth branch.
4. **Five-field required-validation chain** with a
   single guard expression:
   `if (!id || !name || !slug || !description ||
   !source_url)` → 400 `'Item ID, name, slug,
   description, and source URL are required'`. Distinct
   from every prior multi-step validation chain (one
   single 400 envelope covering ALL FIVE missing-field
   probes).
5. **TWO 409 Conflict pre-create duplicate checks** AFTER
   the required-field validation:
   - (a) `itemRepository.checkDuplicateId(id)` →
     409 `'Item with ID '<id>' already exists'`
     (dynamically-interpolated).
   - (b) `itemRepository.checkDuplicateSlug(slug)`
     → 409 `'Item with slug '<slug>' already exists'`
     (dynamically-interpolated).
6. **Audit-user threading** — `auditUser = { id:
   session.user.id, name: session.user.name ??
   session.user.email ?? undefined }` passed to the
   repository.
7. **`itemRepository.create(...)` call** AFTER all pre-
   create checks pass. Defaults `category = []`,
   `tags = []`, `featured = false`, `status = 'draft'`.
   Threads `submitted_by = session.user.id`.
8. **Optional CRM sync side effect** gated by
   `process.env.TWENTY_CRM_ENABLED === 'true'` (NOTE:
   strict-equals comparison, distinct from
   `admin/items/[id]/route.ts` PUT which uses
   `!== 'false'`), wrapped in its own try/catch. Walks
   a four-step chain: `getOrCreateCompanyFromBrand` →
   `linkItemToCompany` → conditional CRM sync via
   `upsertCompany` if newly linked.
9. **Optional Location Index side effect** gated by
   `getLocationEnabled()`, also wrapped in its own
   try/catch.
10. **Method-resolution surface** — the route exports
    `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
    round-trip to a `< 500` status (typically 405
    Method Not Allowed).

## Cross-route POST comparison

| Route                                          | Required fields | Duplicate checks                                                | Catch posture                                                                                                                                                          |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/admin/items` (this spec)            | 5 (id, name, slug, description, source_url) in single guard | TWO 409 pre-create checks with dynamically-interpolated messages | `safeErrorResponse(...)` (no narrow-match branches)                                                                                                                     |
| `POST /api/admin/collections`                  | 2 (id, name) in single guard | None pre-create (delegates to repository's `'already exists'` throw → 409 in catch) | Outer-catch chain with `'already exists'` → 409 + `'must'` → 400 + `safeErrorResponse(...)` fallback                                                                    |
| `POST /api/admin/items/{id}/review`            | 1 (status enum)             | None                                                            | `safeErrorResponse(error, 'Failed to review item')`                                                                                                                     |
| `POST /api/admin/items/import`                 | 2 (rows, options)           | None                                                            | `safeErrorResponse(error, 'Failed to execute import')`                                                                                                                  |
| `POST /api/admin/items/import/validate`        | Multipart 5-step file/mapping | None                                                            | `safeErrorResponse(error, 'Failed to validate import file')`                                                                                                            |
| `POST /api/admin/items/bulk`                   | 6-step body chain           | None                                                            | `safeErrorResponse(error, 'Failed to process bulk action')`                                                                                                             |
| `POST /api/admin/sponsor-ads/{id}/approve`     | None (forceApprove flag)    | None                                                            | Three-branch catch chain: `'Sponsor ad not found'` → 404, `'PAYMENT_NOT_RECEIVED'` → 400, `'Cannot approve'` → 400, `safeErrorResponse(...)` fallback                    |
| `POST /api/admin/sponsor-ads/{id}/reject`      | Zod `safeParse` (rejectionReason) | None                                                            | Two-branch catch chain: `'Cannot reject'` → 400, `'Sponsor ad not found'` → 404, `safeErrorResponse(...)` fallback                                                       |

This is the **first** POST-only smoke that combines five-
field required validation with two pre-create duplicate
checks AND an audit-user-threading + CRM + Location-Index
side-effect chain.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~19
bodies covering missing-field probes / valid-body
permutations / bypass attempts) and **eleven hand-written
scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_ITEMS_CREATE_HEADERS) test(…)`                             | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_ITEMS_CREATE_BODIES) test(…)`                                 | Bulk-loop walk of every plausible body shape (~19 bodies covering all five missing-field probes plus valid-body variants and bypass shapes).                         |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope.                                                                                                                              |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `item`, `id`, `slug`, `success: true` must NOT appear; status must NOT be 201.                                                  |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across two static post-auth messages plus regex prefix checks for the dynamic `'Item with (ID\|slug) '<...>' already exists'` 409 messages. |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-field validation chain is NOT entered on the unauth branch', …)`                 | Pins the gate-before-required-field-validation order.                                                                                                                |
| `test('… duplicate-id / duplicate-slug 409 branches are NOT entered on the unauth branch', …)`     | Pins the gate-before-duplicate-check order: the unauth response must NEVER match the `/^Item with (ID\|slug) '/` regex prefixes.                                     |
| `test('… create call + audit-user threading is NOT entered on the unauth branch', …)`              | Pins the gate-before-create-call order: the unauth response status must NOT be 201 and must NOT echo a `data` key.                                                    |
| `test('… CRM sync side effect is NOT entered on the unauth branch', …)`                            | Pins the gate-before-CRM-sync order: a body with `brand` does NOT change the unauth status.                                                                          |
| `test('… Location Index side effect is NOT entered on the unauth branch', …)`                      | Pins the gate-before-Location-Index order: a body with `location` does NOT change the unauth status.                                                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~36 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — exact match.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data`,
   `item`, `id`, `slug`, `success: true` keys plus
   the 201 status must NOT appear in any unauth
   response.
5. **Gate-before-post-auth invariant** — the two
   static post-auth messages plus the dynamic
   `'Item with (ID\|slug) '<...>' already exists'` 409
   messages (matched via regex prefix) must NEVER
   appear in any unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — `PUT` / `PATCH` /
   `DELETE` round-trip to a `< 500` status.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-validation invariant**.
11. **Gate-before-duplicate-check invariant**.
12. **Gate-before-create-call invariant** — the
    `itemRepository.create(...)` call is NOT entered
    on the unauth branch.
13. **Gate-before-CRM-sync invariant** — a body with
    `brand` does NOT change the unauth status.
14. **Gate-before-Location-Index invariant** — a body
    with `location` does NOT change the unauth
    status.

## See also

- The companion query-surface spec
  [`admin-items-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the body-validation single-method
  [`admin-items-import-body-spec.md`](admin-items-import-body-spec.md)
  and
  [`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md)
  and
  [`admin-items-bulk-body-spec.md`](admin-items-bulk-body-spec.md)
  and
  [`admin-items-id-review-body-spec.md`](admin-items-id-review-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the items collection route
  sits inside.
