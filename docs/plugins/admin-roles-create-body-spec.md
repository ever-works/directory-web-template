---
id: admin-roles-create-body-spec
title: E2E Admin Roles Create Body Spec (apps/web-e2e/tests/api/admin-roles-create-body.spec.ts)
sidebar_label: E2E Admin Roles Create Body Spec
sidebar_position: 544
---

# E2E Admin Roles Create Body Spec — `apps/web-e2e/tests/api/admin-roles-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**non-admin-gated collection-level role-create POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-roles-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-create-body.spec.ts).

This spec documents the **fifth Q-010b-style auth-gate-
divergence finding** in the admin-tree smoke layer — the
route's `POST` handler **does NOT call `auth()` at all**,
so any unauthenticated client can create roles. The
companion
[`admin-roles-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-query.spec.ts)
already documents the same Q-010b finding for the GET
surface; this spec extends that documentation to the
create surface.

## Why this spec is the non-admin-gated collection-level POST smoke

The route under test
([`apps/web/app/api/admin/roles/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/route.ts))
exports `GET` and `POST`. Neither handler calls `auth()`.
With no gate, the unauth client receives the same response
an authenticated client would receive:

| Body shape                                                           | Response status / message                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| No body / empty body                                                 | 400 `'Missing required fields: name, description'`                                     |
| Body with `name` that normalizes to empty (e.g. `'!!!'`)             | 400 `'Unable to derive a valid role ID from name'`                                     |
| `name.length < 3` or `> 100`                                         | 400 `'Role name must be between 3 and 100 characters'`                                  |
| `description.length > 500`                                           | 400 `'Role description must be at most 500 characters'`                                 |
| Duplicate ID (after slug derivation)                                 | 409 `'Role with similar name already exists'`                                            |
| Valid body                                                           | 201 `{ success: true, data: <role>, message: 'Role created successfully' }`             |

## Q-010b auth-gate-divergence findings to date

This is the **fifth** admin route the smoke layer documents
as effectively non-admin-restricted today:

| Route                                          | Method      | Q-010b finding                                                                                                |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/roles` (this route's GET)      | `GET`       | No `auth()` call. Covered by [`admin-roles-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-query.spec.ts). |
| **`POST /api/admin/roles` (this spec)**        | `POST`      | **No `auth()` call. Any unauth client can create roles, including admin roles.**                                |
| `GET /api/admin/roles/active`                  | `GET`       | No `auth()` call. Covered by [`admin-roles-active-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-active-query.spec.ts). |
| `admin/featured-items/[id]`                    | All methods | Two-step `!session?.user?.id` → `!tenantId` gate (no `isAdmin` check). Covered by [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md). |
| Various `admin-by-id.spec.ts` routes           | Multiple    | Coverage of similar tenant-only-gated routes.                                                                  |

The POST handler additionally has these distinguishing
features:

1. **Stable-ID-derivation step** — `roleData.name` is
   normalized via `.normalize('NFKD')`, diacritic
   stripping, lowercasing, and slug-style hyphen
   collapsing. The first POST smoke that walks a slug-
   derivation step.
2. **Soft-delete-aware uniqueness check** —
   `roleRepository.exists(id, { includeDeleted: true })`.
   The first POST smoke that includes soft-deleted
   records in its uniqueness check.
3. **Outer-catch translation** — `'already exists' \|
   'unique constraint' \| 'duplicate key'` → 409 `'Role
   with similar name already exists'` (single fixed
   message, not dynamically interpolated).
4. **Method-resolution surface** — the route exports
   `GET` and `POST`. PUT / PATCH / DELETE must round-
   trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~14
bodies) and **eight hand-written scenarios** that pin the
non-admin-gated finding and the validation chain that's
the route's only "protection".

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_ROLES_CREATE_HEADERS) test(…)`                             | Bulk-loop walk of every plausible header shape (~14 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_ROLES_CREATE_BODIES) test(…)`                                 | Bulk-loop walk of every plausible body shape (~14 bodies covering required-field probes, slug-derivation probes, length-validation probes, and valid bodies).        |
| `test('… unauth no-body response is NOT 401 or 403 (Q-010b finding: no gate)', …)`                 | Pins the auth-gate-divergence finding: the unauth response is NOT 401 or 403 because there's no gate.                                                                |
| `test('… unauth no-body response carries the success: false envelope', …)`                         | Pins the validation envelope shape: the body has a `success` key (false on errors, true on 201).                                                                    |
| `test('… has a stable status across header / body permutations of the same body', …)`              | Pins that header permutations do NOT affect routing.                                                                                                                |
| `test('… side-channel cookies / headers do NOT trigger different routing', …)`                     | Pins that fabricated session cookies and `X-*` headers do NOT escalate privilege.                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies', …)`                                               | Pins the malformed-body invariant: the route does NOT 500 on malformed JSON.                                                                                          |
| `test('… required-field check fires on no-body request (Q-010b: only protection)', …)`             | Pins the route's only "protection" — the required-field check is the FIRST validation that fires.                                                                     |
| `test('… length-validation branches fire deterministically', …)`                                   | Pins the length-validation envelope shapes for too-short / too-long body shapes.                                                                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status.
2. **Q-010b auth-gate-divergence finding** — the
   unauth no-body response is NOT 401 or 403 because
   there's no gate.
3. **Validation envelope shape** — the body carries
   a `success` key (false on errors, true on 201).
4. **Status invariance across header permutations**
   for the same body.
5. **Side-channel isolation** — fabricated session
   cookies and `X-*` headers do NOT escalate
   privilege.
6. **Cross-method invariance** — `PUT` / `PATCH` /
   `DELETE` round-trip to a `< 500` status.
7. **Malformed JSON invariance** — the route does
   NOT 500 on malformed JSON.
8. **Required-field-check first-validation-fires
   invariant** — the required-field check is the
   FIRST validation that fires (the only "protection"
   the route has).
9. **Length-validation deterministic-fire invariant**
   — the length-validation envelope shapes fire
   deterministically for too-short / too-long body
   shapes.

## See also

- The companion query-surface spec
  [`admin-roles-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-query.spec.ts)
  documents the same Q-010b finding for the GET
  surface.
- The full set of sibling per-spec-file references
  under `tests/api/`, including the leaf-`[id]`
  triple-method
  [`admin-roles-id-method-spec.md`](admin-roles-id-method-spec.md)
  spec which DOES have a two-step gate (so the gate
  is on the `[id]` sub-resources but NOT on the
  collection root), the dual-method
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md)
  spec, and the other Q-010b finding
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the roles collection
  route sits inside.
- [`docs/questions.md`](../questions.md) — the Q-010b
  auth-gate-divergence finding (this route is the
  fifth admin route the smoke layer documents as
  effectively non-admin-restricted today).
