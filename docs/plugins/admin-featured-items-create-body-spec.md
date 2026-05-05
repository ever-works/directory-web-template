---
id: admin-featured-items-create-body-spec
title: E2E Admin Featured Items Create Body Spec (apps/web-e2e/tests/api/admin-featured-items-create-body.spec.ts)
sidebar_label: E2E Admin Featured Items Create Body Spec
sidebar_position: 546
---

# E2E Admin Featured Items Create Body Spec — `apps/web-e2e/tests/api/admin-featured-items-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**non-admin-gated collection-level featured-items-create
POST body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-featured-items-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-featured-items-create-body.spec.ts).

This spec documents the **seventh Q-010b-style auth-gate-
divergence finding** in the admin-tree smoke layer — the
route's `POST` handler **does NOT call `!isAdmin` at any
point**. It DOES require an authenticated user
(`!session?.user?.id` → 401) and a tenant (`!tenantId` →
403), so the route is tenant-scoped to authenticated users
but is effectively non-admin-restricted.

## Why this spec is the tenant-first-gate POST smoke

The route under test
([`apps/web/app/api/admin/featured-items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/featured-items/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Two-step gate** — `!session?.user?.id` → 401, then
   `!tenantId` (after `getTenantId()` BEFORE body parse)
   → 403 `'Tenant not found'`. Distinct from
   `admin/notifications` POST which runs `getTenantId()`
   AFTER body parse.
2. **Hybrid bare-`Unauthorized` + `success: false`
   envelope**.
3. **JSON body parse via `await request.json()`** AFTER
   both gate steps.
4. **Two-field required check** — `if (!itemSlug ||
   !itemName)` → 400 `'Item slug and name are
   required'`.
5. **Already-featured check** — inline Drizzle `select`
   from `featuredItems` with `eq(itemSlug)` +
   `eq(isActive, true)` + tenant scoping → 400 `'Item
   is already featured'` if `result.length > 0`. The
   first POST smoke that uses a 400 (NOT 409) for an
   already-exists check.
6. **Inline Drizzle insert** with `featuredUntil`
   parsed as `new Date()` if provided, `featuredBy =
   session.user.id`, `featuredOrder` defaults to `0`
   via destructure default.
7. **Success payload** — `{ success: true, data:
   <featuredItem>, message: 'Item featured
   successfully' }` with status 200.
8. **`console.error` + 500 `'Failed to create
   featured item'` catch**.
9. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Q-010b auth-gate-divergence findings to date (extended)

| Route                                          | Method      | Gate ordering                                                                                                     |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/roles`                         | `GET`       | No `auth()` call.                                                                                                  |
| `POST /api/admin/roles`                        | `POST`      | No `auth()` call.                                                                                                  |
| `GET /api/admin/roles/active`                  | `GET`       | No `auth()` call.                                                                                                  |
| `admin/featured-items/[id]` all methods        | `GET/PUT/DELETE` | Two-step `!session?.user?.id` → `!tenantId`.                                                                        |
| `POST /api/admin/notifications`                | `POST`      | Two-step with **interleaved** tenant resolution (AFTER body parse + required-fields check).                          |
| **`POST /api/admin/featured-items` (this spec)** | `POST`    | **Two-step with tenant-first ordering (BEFORE body parse).**                                                          |
| Various `admin-by-id.spec.ts` routes           | Multiple    | Coverage of similar tenant-only-gated routes.                                                                      |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~16 headers + ~13
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_FEATURED_ITEMS_CREATE_HEADERS) test(…)`                    | Bulk-loop walk of every plausible header shape (~16 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_FEATURED_ITEMS_CREATE_BODIES) test(…)`                        | Bulk-loop walk of every plausible body shape (~13 bodies covering missing-field probes, valid bodies with optional `featuredUntil` / `featuredOrder`, plus bypass shapes). |
| `test('… returns 401 with the hybrid bare-message + success: false envelope', …)`                  | Pins the hybrid 401 envelope.                                                                                                                                        |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… unauth branch lands on 401 (NOT 403)', …)`                                                | Pins the FIRST gate step fires.                                                                                                                                      |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion.                                                                                                                                          |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across five candidate static messages.                                                                                          |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-fields check is NOT entered on the unauth branch', …)`                           | Pins the gate-before-required-field-check order.                                                                                                                    |
| `test('… already-featured check is NOT entered on the unauth branch', …)`                          | Pins the gate-before-already-featured-check order.                                                                                                                  |
| `test('… Drizzle insert is NOT entered on the unauth branch', …)`                                  | Pins the gate-before-Drizzle-insert order.                                                                                                                          |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~29 total) must round-trip to a
   `< 500` status.
2. **Hybrid 401 envelope on the unauth branch**.
3. **Strict envelope-shape preservation**.
4. **Unauth-lands-on-401-not-403 invariant**.
5. **Success-branch-key non-disclosure**.
6. **Gate-before-post-auth invariant** — none of the
   five static post-auth messages must appear in any
   unauth response.
7. **Status invariance across header / body
   permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance**.
10. **Gate-before-body-parse invariant**.
11. **Gate-before-required-field-check invariant**.
12. **Gate-before-already-featured-check invariant**.
13. **Gate-before-Drizzle-insert invariant**.

## See also

- The leaf-`[id]` triple-method
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md)
  spec covering the same tenant-only-gated
  `/api/admin/featured-items/[id]` route on
  GET / PUT / DELETE.
- The other Q-010b findings:
  [`admin-roles-create-body-spec.md`](admin-roles-create-body-spec.md)
  (no auth at all),
  [`admin-notifications-create-body-spec.md`](admin-notifications-create-body-spec.md)
  (also tenant-only-gated, but with interleaved tenant
  resolution).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the featured-items collection
  route sits inside.
- [`docs/questions.md`](../questions.md) — the Q-010b
  auth-gate-divergence finding (this route is the
  seventh admin route the smoke layer documents as
  effectively non-admin-restricted today).
