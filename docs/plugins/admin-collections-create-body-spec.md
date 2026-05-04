---
id: admin-collections-create-body-spec
title: E2E Admin Collections Create Body Spec (apps/web-e2e/tests/api/admin-collections-create-body.spec.ts)
sidebar_label: E2E Admin Collections Create Body Spec
sidebar_position: 543
---

# E2E Admin Collections Create Body Spec — `apps/web-e2e/tests/api/admin-collections-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level collection-create POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-collections-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines a **per-call
inline `try { body = await request.json() } catch
(jsonError) { ... }`** wrapper emitting an `'Invalid JSON
in request body'` 400 envelope with a **manual TWO-field
required check** (`!createData.id || !createData.name`)
plus a **two-`revalidatePath` cache-invalidation chain**
on the success branch (`/collections` PLUS
`/collections/${slug}`) — a complementary surface that no
prior admin-tree smoke spec covers. The companion
[`admin-collections-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-query.spec.ts)
covers the GET (paginated list) surface of the same
route.

## Why this spec is the per-call-JSON-try/catch + two-revalidatePath collection-level POST smoke

The route under test
([`apps/web/app/api/admin/collections/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/collections/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin`
   gate** → 401
   `{ success: false, error: 'Unauthorized. Admin
   access required.' }`.
2. **Canonical longer 401 envelope** with strict
   envelope-shape preservation
   `Object.keys(body).sort() === ['error', 'success']`.
   Matches `admin/categories` POST and the GET / PUT /
   DELETE handlers under
   `admin/collections/[id]/route.ts`.
3. **Per-call inline `try { body = await
   request.json() } catch (jsonError) { ... return
   NextResponse.json({ success: false, error: 'Invalid
   JSON in request body' }, { status: 400 }) }`
   wrapper** AFTER the gate — the FIRST collection-level
   admin POST route the smoke layer covers that wraps
   the `request.json()` call in its own try/catch. Every
   prior collection-level POST smoke
   (`admin/items`, `admin/users`, `admin/categories`,
   `admin/tags`, `admin/companies`, `admin/clients`)
   uses the bare `await request.json()` form. The
   `console.error('Invalid JSON in request body',
   jsonError)` log inside the catch is also distinct.
4. **Manual TWO-field required check** —
   `if (!createData.id || !createData.name)` → 400
   `{ success: false, error: 'Collection ID and name
   are required' }`. Distinct from
   `admin/categories` POST single-field check (only
   `name`) and from `admin/tags` POST two-field check
   (different fields).
5. **`collectionRepository.create(createData)` call**
   AFTER the required-field check. The repository may
   throw `'... already exists'` or `'must ...'` errors
   that the outer catch translates.
6. **`await invalidateContentCaches()` PLUS TWO
   `revalidatePath` calls** on the success branch —
   `revalidatePath('/collections')` AND
   `revalidatePath(\`/collections/\${newCollection.slug}\`)`
   (slug-aware). Distinct from `admin/categories` POST
   which calls only `await invalidateContentCaches()`
   without any `revalidatePath`.
7. **Three-branch outer catch chain**:
   - (a) `error.message.includes('already exists')` →
     409 echoing raw `error.message`.
   - (b) `error.message.includes('must')` → 400
     echoing raw `error.message`.
   - (c) `safeErrorResponse(error, 'Failed to create
     collection')` fallback.
   Identical in shape to the `admin/categories` POST
   three-branch outer catch (`'already exists'` /
   `'must be'` / `safeErrorResponse(...)`). Distinct
   from the `admin/users` POST `error.message`-pass-
   through catch (which always returns 400 for
   `Error` instances).
8. **Success payload** with **`collection`
   success-key (NOT `data`)** — `{ success: true,
   collection: <collection>, message: 'Collection
   created successfully' }` with status 201. Matches
   the sibling `admin/categories` POST which uses
   `category` (not `data`).
9. **Method-resolution surface** — the route exports
   `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status (typically 405
   Method Not Allowed).

## Cross-route POST JSON-parse / cache-invalidation matrix

| Route                                          | JSON parse                                                              | Cache invalidation                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /api/admin/collections` (this spec)      | **Per-call try/catch** + `'Invalid JSON in request body'` 400 envelope | `await invalidateContentCaches()` + `revalidatePath('/collections')` + slug-aware `revalidatePath` |
| `POST /api/admin/categories`                   | Bare `await request.json()`                                             | `await invalidateContentCaches()` (no `revalidatePath`)                                         |
| `POST /api/admin/items`                        | Bare `await request.json()`                                             | `await invalidateContentCaches()` (no `revalidatePath`)                                         |
| `POST /api/admin/users`                        | Bare `await request.json()`                                             | None                                                                                            |
| `POST /api/admin/tags`                         | Bare `await request.json()`                                             | `await invalidateContentCaches()` (no `revalidatePath`)                                         |
| `POST /api/admin/companies`                    | Bare `await request.json()`                                             | None                                                                                            |
| `POST /api/admin/clients`                      | Bare `await request.json()`                                             | None                                                                                            |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~15
bodies) and **twelve hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_COLLECTIONS_CREATE_HEADERS) test(…)`                       | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_COLLECTIONS_CREATE_BODIES) test(…)`                           | Bulk-loop walk of every plausible body shape (~15 bodies covering required-field probes, valid bodies, and bypass shapes).                                          |
| `test('… returns 401 with the canonical longer Unauthorized envelope (NOT bare)', …)`              | Pins the canonical longer 401 envelope and confirms divergence from the bare-envelope sibling routes (`admin/companies`, `admin/clients`).                            |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `collection`, `data`, `message`, `success: true` must NOT appear; status must NOT be 201.                                                |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across four candidate static messages plus a malformed-body probe.                                                              |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… per-call request.json try/catch is NOT entered on the unauth branch', …)`                 | Pins the gate-before-body-parse order: the `'Invalid JSON in request body'` 400 envelope must NEVER appear on the unauth branch.                                       |
| `test('… required-field check is NOT entered on the unauth branch', …)`                            | Pins the gate-before-required-field-check order: the unauth response must NEVER echo `'Collection ID and name are required'`.                                          |
| `test('… create call + cache invalidation are NOT entered on the unauth branch', …)`               | Pins the gate-before-create-call order: the unauth response status must NOT be 201, must NOT contain a `collection` key, and must NOT echo `'Collection created successfully'`. |
| `test('… three-branch outer catch is NOT entered on the unauth branch', …)`                        | Pins the gate-before-outer-catch order: the unauth response must echo the canonical 401 envelope, not any branch of the outer catch chain.                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~32 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope on the unauth
   branch** — exact match
   `{ success: false, error: 'Unauthorized. Admin
   access required.' }`.
3. **Strict envelope-shape preservation** —
   `Object.keys(body).sort() === ['error', 'success']`
   AND `body.success === false`.
4. **Success-branch-key non-disclosure** — the
   `collection`, `data`, `message` keys plus
   `success: true` and the 201 status must NOT
   appear in any unauth response.
5. **Gate-before-post-auth invariant** — none of the
   four static post-auth messages
   (`'Invalid JSON in request body'`, `'Collection ID
   and name are required'`, `'Failed to create
   collection'`, `'Collection created successfully'`)
   must appear in any unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — `PUT` / `PATCH` /
   `DELETE` round-trip to a `< 500` status.
9. **Gate-before-body-parse invariant** — the per-
   call `request.json()` try/catch is NEVER entered
   on the unauth branch.
10. **Gate-before-required-field-check invariant** —
    the manual TWO-field required check is NEVER
    entered on the unauth branch.
11. **Gate-before-create-call invariant** — the
    `collectionRepository.create(...)` call AND the
    cache invalidation (including TWO `revalidatePath`
    calls) are NOT entered on the unauth branch.
12. **Gate-before-outer-catch invariant** — the
    unauth response must echo the canonical 401
    envelope, not any branch of the three-branch
    outer catch chain.

## See also

- The companion query-surface spec
  [`admin-collections-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-query.spec.ts)
  covers the GET (paginated list) surface of the same
  route.
- The leaf-`[id]` triple-method
  [`admin-collections-id-method-spec.md`](admin-collections-id-method-spec.md)
  spec covers the GET / PUT / DELETE surface on the
  `/api/admin/collections/[id]/route.ts` route — it
  uses the same canonical-longer 401 envelope and the
  same `collection` success-payload key, but a
  different validation chain (Zod `safeParse(...).
  error.flatten()` 400 envelope on PUT).
- The leaf-`[id]/items` dual-method
  [`admin-collections-id-items-method-spec.md`](admin-collections-id-items-method-spec.md)
  spec covers the GET / POST surface on the
  `/api/admin/collections/[id]/items/route.ts` nested
  route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the collection-level POST
  companions
  [`admin-categories-create-body-spec.md`](admin-categories-create-body-spec.md)
  (the closest sibling — same canonical-longer 401
  envelope, same three-branch outer catch chain, same
  non-`data` success-payload key),
  [`admin-tags-create-body-spec.md`](admin-tags-create-body-spec.md),
  [`admin-companies-create-body-spec.md`](admin-companies-create-body-spec.md),
  [`admin-clients-create-body-spec.md`](admin-clients-create-body-spec.md),
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md),
  and
  [`admin-users-create-body-spec.md`](admin-users-create-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the collections collection
  route sits inside.
