---
id: favorites-id-method-spec
title: E2E Favorites [itemSlug] Method Spec (apps/web-e2e/tests/api/favorites-id-method.spec.ts)
sidebar_label: E2E Favorites [itemSlug] Method Spec
sidebar_position: 594
---

# E2E Favorites [itemSlug] Method Spec — `apps/web-e2e/tests/api/favorites-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-favorite remove DELETE dynamic-segment / header
smoke spec** paired with
[`apps/web-e2e/tests/api/favorites-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/favorites-id-method.spec.ts).

This is the **first per-source-file DELETE smoke** the
docs tree publishes that pins a **THREE-field tenant-
scoped IDOR check + SELECT-then-DELETE pattern** on a
non-admin per-item DELETE route.

## What's distinct from EVERY prior DELETE smoke

- **`checkDatabaseAvailability()` as the FIRST gate**
  — returns 503 with the DATABASE_UNAVAILABLE
  envelope when `DATABASE_URL` is missing. The auth
  check fires AFTER the DB-availability check.
- **TWO-key `{ success: false, error: 'Unauthorized'
  }` 401 envelope** + **TWO-key `{ success: false,
  error: 'Tenant not found' }` 403 envelope** — TWO
  distinct gate-failure statuses with the SAME
  envelope shape but DIFFERENT messages (UNIQUE: the
  FIRST per-source-file DELETE smoke pinning a 401
  → 403 → 404 cascade with three distinct messages
  on the same TWO-key envelope shape).
- **THREE-field tenant-scoped IDOR check** — the
  SELECT + DELETE WHERE clauses BOTH match on
  `userId === session.user.id` AND `itemSlug ===
  path.itemSlug` AND `tenantId === currentTenantId`
  (UNIQUE: the FIRST per-source-file DELETE smoke
  pinning a three-field tenant-scoped IDOR check).
- **SELECT-then-DELETE pattern** — the handler runs
  an inline `db.select().from(favorites).where(...).
  limit(1)` BEFORE the DELETE to surface a 404 if
  not found (distinct from single-step DELETE WHERE
  which would silently no-op).
- **TWO-key success payload** `{ success: true,
  message: 'Favorite removed successfully' }` with
  NO `data` field (UNIQUE: most DELETE handlers
  return `data: { ... }` with deletion details).

## Why this spec is the first three-field tenant-scoped IDOR DELETE smoke

The route under test
([`apps/web/app/api/favorites/[itemSlug]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/favorites/[itemSlug]/route.ts))
exports only `DELETE`. The handler combines:

1. **`checkDatabaseAvailability()` gate** — the
   FIRST gate. Returns 503 when `DATABASE_URL` is
   missing.
2. **`auth()` session lookup** — `!session?.user?.id`
   → 401 TWO-key.
3. **`getTenantId()`** — `!tenantId` → 403 TWO-key
   `{ success: false, error: 'Tenant not found' }`.
4. **`{ itemSlug } = await params`** dynamic-
   segment resolution.
5. **SELECT pre-check** — `db.select().from
   (favorites).where(userId + itemSlug + tenantId).
   limit(1)`; empty → 404 TWO-key `{ success:
   false, error: 'Favorite not found' }`.
6. **DELETE WHERE** — same three-field clause.
7. **Success payload** — `{ success: true, message:
   'Favorite removed successfully' }` with status
   200.
8. **Outer catch** — `safeErrorResponse(error,
   'Failed to remove favorite')`.
9. **Method-resolution surface** — the route
   exports ONLY `DELETE`. `GET` / `POST` / `PUT` /
   `PATCH` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~7
headers) and **eight hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                              | ~7 headers including `X-Tenant-Id` and `X-User-Id` side-channel probes.                                                                |
| `test('… returns 401 with the canonical TWO-key Unauthorized envelope', …)`                        | Pins the canonical envelope (401 OR 503 — both pre-IDOR).                                                                              |
| `test('… 401 envelope shape has exactly success and error keys', …)`                               | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across four candidate messages.                                                                   |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk including X-Tenant-Id.                                                                                               |
| `test('… cross-method probe (GET / POST / PUT / PATCH) does NOT 5xx', …)`                          | Method-resolution walk. DELETE is the only exported method.                                                                            |
| `test('… SELECT pre-check + DELETE WHERE are NOT entered on the unauth branch', …)`                | CRITICAL — pins that the load-bearing SELECT pre-check AND the DELETE mutation NEVER run on unauth (no XSS-marker leak from URL).      |
| `test('… catch-branch dispatcher 'Failed to remove favorite' is NOT entered on the unauth branch', …)` | Pins the gate-before-catch-dispatcher order.                                                                                           |
| `test('… cross-permutation status invariance', …)`                                                 | Cross-permutation status invariance.                                                                                                   |
| `test('… cross-itemSlug invariance — different slugs produce IDENTICAL unauth envelope', …)`       | Pins that the auth gate fires BEFORE any per-item-slug branch.                                                                         |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch (or 503
   pre-IDOR).
3. **Strict TWO-key envelope-shape preservation**.
4. **Gate-before-post-auth invariant**.
5. **Side-channel isolation** including X-Tenant-Id.
6. **Cross-method invariance** — DELETE is the only
   exported method.
7. **Gate-before-DB-mutation invariant** (CRITICAL).
8. **Gate-before-catch-dispatcher invariant**.
9. **Cross-permutation status invariance**.
10. **Cross-itemSlug invariance** — different slugs
    produce IDENTICAL unauth envelopes.

## See also

- The companion collection-level POST + GET sibling
  [`favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/favorites.spec.ts)
  covers `apps/web/app/api/favorites/route.ts`.
- The companion engagement / favorites combination
  spec
  [`items-engagement-and-favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items-engagement-and-favorites.spec.ts)
  covers cross-route favorite engagement.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
