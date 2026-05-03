---
id: admin-collections-id-items-method-spec
title: E2E Admin Collections [id] Items Method Spec (apps/web-e2e/tests/api/admin-collections-id-items-method.spec.ts)
sidebar_label: E2E Admin Collections [id] Items Method Spec
sidebar_position: 527
---

# E2E Admin Collections [id] Items Method Spec — `apps/web-e2e/tests/api/admin-collections-id-items-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-items GET / POST nested-dynamic-id /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-collections-id-items-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-id-items-method.spec.ts).

This is the **first nested-dynamic-segment admin-tree
smoke** the docs tree publishes — every prior dynamic-
segment admin smoke uses `[id]` as the LEAF segment of the
path; this is the first that uses `[id]` as a NON-LEAF
segment with a static `/items` suffix.

## Why this spec is the nested-dynamic-segment admin-tree smoke

The route under test
([`apps/web/app/api/admin/collections/[id]/items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/collections/[id]/items/route.ts))
exports `GET` and `POST` from a nested dynamic-segment
path. The `[id]` segment is the parent collection's id,
with a sub-resource `/items` appended. Both handlers share
the SAME single-step inline `!session?.user?.isAdmin` gate
and the SAME canonical longer 401 envelope, but each has
its own divergent post-gate surface:

| Handler  | Body parse                                | Validation                           | Service call                                              | Side effects                                                                  | Success-payload shape                                                            |
| -------- | ----------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET`    | None                                      | None                                 | `collectionRepository.getAssignedItems(id)`               | None                                                                          | `{ success: true, items: [...] }` (success key is `items`, NOT `data`)            |
| `POST`   | `await request.json()` AFTER the gate     | `Array.isArray(body.itemIds)` → 400 `'itemIds array is required'` | `collectionRepository.assignItems(id, body.itemIds)`      | `invalidateContentCaches()` + two `revalidatePath(...)` calls                 | `{ success: true, collection, updatedItems, message: 'Collection items updated successfully' }` |

Both handlers wrap their happy paths in
`safeErrorResponse(error, '<handler-specific-message>')`
catches with handler-specific messages
(`'Failed to fetch collection items'` /
`'Failed to assign collection items'`).

## Cross-route nested-vs-leaf comparison

The nested `[id]/items` path shape is the load-bearing
divergence this spec pins. Every prior dynamic-segment
admin smoke uses `[id]` as the LEAF segment:

| Route                                                          | Path shape                       | `[id]` position |
| -------------------------------------------------------------- | -------------------------------- | --------------- |
| `/api/admin/collections/{id}/items` (this spec)                | Nested `[id]/items`              | Non-leaf        |
| `/api/admin/items/{id}`                                        | Leaf `[id]`                      | Leaf            |
| `/api/admin/clients/{clientId}`                                | Leaf `[clientId]`                | Leaf            |
| `/api/admin/users/{id}`                                        | Leaf `[id]`                      | Leaf            |
| `/api/admin/items/{id}/review`                                 | Nested `[id]/review`             | Non-leaf (but covered as POST-only)        |
| `/api/admin/items/{id}/history`                                | Nested `[id]/history`            | Non-leaf (but covered as GET-only)         |
| `/api/admin/notifications/{id}/read`                           | Nested `[id]/read`               | Non-leaf (but covered as PATCH-only)       |
| `/api/admin/sponsor-ads/{id}/approve`                          | Nested `[id]/approve`            | Non-leaf (but covered as POST-only)        |
| `/api/admin/sponsor-ads/{id}/reject`                           | Nested `[id]/reject`             | Non-leaf (but covered as POST-only)        |
| `/api/admin/sponsor-ads/{id}/cancel`                           | Nested `[id]/cancel`             | Non-leaf (but covered as POST-only)        |
| `/api/admin/roles/{id}/permissions`                            | Nested `[id]/permissions`        | Non-leaf (covered as GET + PUT)            |

This route is the **first** the smoke layer covers as a
**nested-`[id]/<sub-resource>` dual-method** export
(`GET` + `POST`).

## How the spec walks its scenario tree

The spec emits **two method-bulk-loop walks** across id
shapes, **two method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `POST`, and a
suite of **fourteen hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of COLLECTION_IDS) test('GET' / 'POST' …)`                                          | Bulk-loop walk of every plausible parent-collection id shape (~6 ids) × two methods.                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'POST' …)`                          | Bulk-loop walk of every plausible header shape (~17 headers) × two methods.                                                                                         |
| `for (const { data, label } of POST_BODIES) test('POST' …)`                                        | Bulk-loop walk of every plausible POST body shape (~16 bodies, including itemIds-shape probes for valid array / empty array / string / numeric / null / object / undefined / missing).                                  |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                     | Pins the canonical longer 401 envelope for `GET`.                                                                                                                   |
| `test('POST … returns 401 with the canonical longer Unauthorized envelope', …)`                    | Pins the canonical longer 401 envelope for `POST`.                                                                                                                  |
| `test('GET / POST … share the SAME 401 envelope shape on the unauth branch', …)`                   | Cross-method envelope-equality assertion + strict envelope-shape check.                                                                                              |
| `test('GET / POST … does NOT echo the success-branch keys on the unauth branch', …)`               | Negative-property assertion: `items`, `collection`, `updatedItems`, `message`, `success: true` must NOT appear.                                                      |
| `test('GET / POST … does NOT echo any of the post-auth messages on the unauth branch', …)`         | Pins the gate-before-post-auth order across four candidate messages.                                                                                                |
| `test('GET / POST … has a stable status across distinct nested-id shapes', …)`                     | Pins the gate-before-params-resolution order for the nested `[id]` segment.                                                                                          |
| `test('POST … has a stable status across body permutations', …)`                                   | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / POST … does NOT branch on side-channel cookies / headers', …)`                        | Side-channel walk across both methods.                                                                                                                              |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk: PUT / PATCH / DELETE round-trip to `< 500`.                                                                                                  |
| `test('POST … is invariant to malformed JSON bodies on the unauth branch', …)`                     | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / POST … service call is NOT entered on the unauth branch', …)`                         | Pins the gate-before-service order.                                                                                                                                 |
| `test('POST … side-effects (cache-invalidation / revalidatePath) are NOT entered on the unauth branch', …) ` | Pins the gate-before-side-effect order: every body shape (varying `itemIds` lengths) round-trips to the same 401 status as the no-body baseline, so the side-effects are unreachable. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every POST body permutation (~~6×2 + 17×2 + 16 = ~62
   total) must round-trip to a `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** for each of `GET` and `POST` — exact
   match.
3. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`.
4. **Cross-method envelope equality**.
5. **Success-branch-key non-disclosure** — the
   nested-route-specific `items`, `collection`,
   `updatedItems` keys (plus `message` and
   `success: true`) must NOT appear in any unauth
   response.
6. **Gate-before-post-auth invariant** — none of the
   four post-auth messages (`'itemIds array is
   required'`, `'Failed to fetch collection items'`,
   `'Failed to assign collection items'`,
   `'Collection items updated successfully'`) must
   appear in any unauth response.
7. **Status invariance across distinct nested-id
   shapes**.
8. **Status invariance across POST body permutations**.
9. **Side-channel isolation** across both methods.
10. **Cross-method invariance** — `PUT` / `PATCH` /
    `DELETE` round-trip to a `< 500` status.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-service invariant** —
    `getAssignedItems(...)` and `assignItems(...)` are
    NOT entered on the unauth branch.
13. **Gate-before-side-effect invariant** — the
    `invalidateContentCaches()` + `revalidatePath(...)`
    side effects are unreachable on the unauth branch.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the bare-envelope triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  the hybrid-envelope triple-method
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md),
  and the dual-method
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the collection-items route
  sits inside.
