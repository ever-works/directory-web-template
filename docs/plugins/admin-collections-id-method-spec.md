---
id: admin-collections-id-method-spec
title: E2E Admin Collections [id] Method Spec (apps/web-e2e/tests/api/admin-collections-id-method.spec.ts)
sidebar_label: E2E Admin Collections [id] Method Spec
sidebar_position: 534
---

# E2E Admin Collections [id] Method Spec — `apps/web-e2e/tests/api/admin-collections-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-collection CRUD GET / PUT / DELETE
method / id / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-collections-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-collections-id-method.spec.ts).

This is the **first triple-method admin-tree smoke** the
docs tree publishes that combines a canonical longer
`'Unauthorized. Admin access required.'` 401 envelope with
a **Zod `safeParse(...).error.flatten()` 400 envelope**
posture — distinct from every prior triple-method admin
smoke (which use either an inline-untyped destructure with
no Zod, an inline-untyped destructure with a DELETE-only
`?hard=true` query branch, a Zod `parse()` (THROWS) with
`details: ZodError.errors`-style catch envelope, or a
validation-less PUT with seven body fields shoved straight
into `db.update(...)`).

## Why this spec is the Zod-`safeParse`-with-`flatten()`-envelope triple-method smoke

The route under test
([`apps/web/app/api/admin/collections/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/collections/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. It
is the **first** admin-tree route to use Zod
`safeParse(...)` followed by an in-line
`error.flatten()` envelope on the 400 branch —
`parsed.error.flatten()` returns the canonical
`{ formErrors: string[], fieldErrors: Record<string,
string[]> }` shape (DIFFERENT from the `error.errors`
array a `parse()`-then-catch route would emit, and
DIFFERENT from the bare-message branch that the
`'must be'` / `'already exists'` catches use).

All three handlers share:

1. **Inline `!session?.user?.isAdmin` gate** — pure
   single-step `await auth()` + `isAdmin` predicate.
   NOT delegated to a `checkAdminAuth()` helper.
   Identical across the three handlers.
2. **Canonical longer 401 message**
   `'Unauthorized. Admin access required.'` and
   `success: false` envelope key — matching every
   single-step-gated admin smoke (`admin/items/[id]`,
   `admin/categories/[id]`, `admin/companies/[id]`).
3. **Params-resolution-after-the-gate posture** — each
   handler resolves `await params` AFTER the gate.
4. **`safeErrorResponse(...)` outer-catch fallback** with
   handler-specific messages (`'Failed to fetch
   collection'`, `'Failed to update collection'`,
   `'Failed to delete collection'`).
5. **404 pre-action `findById` check** for both PUT and
   DELETE — both handlers fetch the collection BEFORE
   running any mutation, returning 404
   `'Collection not found'` if the row is missing
   (distinct from `admin/categories/[id]` PUT which lets
   the service throw, and distinct from
   `admin/featured-items/[id]` PUT which uses the
   `.returning()` length-zero check).
6. **`revalidatePath(...)` cache invalidation** — both
   PUT and DELETE call `revalidatePath` AFTER the
   repository call AND `await invalidateContentCaches()`
   is called in addition. The unauth branch must NOT
   enter that side-effect.

Each handler diverges on its post-gate surface:

| Handler  | Body parse                              | Validation                                                                                                                                                                                             | Service call                                                                                              | Success-payload shape                                                                  |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET`    | None                                    | None                                                                                                                                                                                                   | `collectionRepository.findById(id)` → 404 `'Collection not found'` if missing                              | `{ success: true, data: <collection> }`                                                |
| `PUT`    | `await request.json()` AFTER the gate   | Zod `safeParse(updateCollectionSchema)` → 400 `{ success: false, error: 'Invalid collection payload', details: parsed.error.flatten() }` (UNIQUE `flatten()`-shaped `details`); `name` / `slug` have min/max length constraints | Pre-update `findById` → 404 if missing, then `collectionRepository.update(updateData)`                     | `{ success: true, data: <updated>, message: 'Collection updated successfully' }`        |
| `DELETE` | None                                    | None                                                                                                                                                                                                   | Pre-delete `findById` → 404 if missing, then `collectionRepository.delete(id)`                              | `{ success: true, message: 'Collection deleted successfully' }` (NO `data` key)         |

## Cross-route triple-method comparison

| Route                                          | Methods                  | PUT validation                                | PUT 400 envelope shape                                                  |
| ---------------------------------------------- | ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------- |
| `/api/admin/collections/{id}` (this spec)      | `GET` + `PUT` + `DELETE` | Zod `safeParse(...)`                          | `{ success: false, error: 'Invalid collection payload', details: <flatten()> }` |
| `/api/admin/companies/{id}`                    | `GET` + `PUT` + `DELETE` | Zod `parse(...)` (throws) + caught with `error.errors` | `{ success: false, error: <msg>, details: <ZodError.errors> }`           |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Inline untyped destructure (no Zod)            | No 400 (untyped destructure)                                              |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | Inline untyped destructure (no Zod)            | No 400 from validator (only `'must be'` bare-message catches)           |
| `/api/admin/comments/{id}`                     | `GET` + `PUT` + `DELETE` | Untyped `request.json()` destructure (no Zod)   | No 400 from validator                                                    |
| `/api/admin/featured-items/{id}`               | `GET` + `PUT` + `DELETE` | **NO validation** — seven fields shoved straight into `db.update(...)` | No 400                                                                  |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Inline untyped destructure (no Zod)            | No 400                                                                  |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | Inline untyped destructure (no Zod)            | No 400                                                                  |

This is the **first** triple-method admin smoke where the
PUT validation uses Zod `safeParse(...)` with the
`flatten()`-shaped `details` envelope.

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes (~6 ids × three methods), **three method-bulk-loop
walks** across header shapes (~16 headers × three
methods), **one body-bulk-loop walk** for `PUT` (~21 PUT
bodies covering plausible updates, Zod-violation shapes,
and bypass shapes), and a suite of **fifteen hand-written
scenarios**.

| Block                                                                                                | Purpose                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of COLLECTION_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                  | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                  | Bulk-loop walk of every plausible header shape (~16 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                            | Bulk-loop walk of every plausible PUT body shape (~21 bodies covering plausible updates, all five Zod-violation classes — empty `name`, too-long `name`, empty `slug`, too-long `slug`, non-boolean `isActive`, non-string `name` — and bypass shapes).                                                            |
| `test('GET … returns 401 with the canonical longer Unauthorized envelope', …)`                       | Pins the canonical-401 envelope for `GET`.                                                                                                                          |
| `test('PUT … returns 401 with the canonical longer Unauthorized envelope', …)`                       | Pins the canonical-401 envelope for `PUT`.                                                                                                                          |
| `test('DELETE … returns 401 with the canonical longer Unauthorized envelope', …)`                    | Pins the canonical-401 envelope for `DELETE`.                                                                                                                       |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`             | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`         | Negative-property assertion across all three methods.                                                                                                                |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`   | Pins the gate-before-post-auth order across seven candidate messages (the four catch / 404 messages, the two success messages, AND the Zod safeParse 400 envelope's fixed `'Invalid collection payload'` error string).                                  |
| `test('PUT … unauth branch does NOT echo the Zod flatten() details envelope', …)`                    | Pins the gate-before-Zod-safeParse order: NEVER emits `details` / `formErrors` / `fieldErrors` keys for unauth clients.                                              |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                      | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                      | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                  | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                        | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                        | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … repository call is NOT entered on the unauth branch', …)`                | Pins the gate-before-repository-call order across all three handlers.                                                                                                |
| `test('PUT / DELETE … cache-invalidation side-effect is NOT entered on the unauth branch', …)`       | Pins the gate-before-`invalidateContentCaches` / `revalidatePath` order across PUT + DELETE.                                                                          |
| `test('GET / PUT / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)` | Pins the per-handler-catch-message non-disclosure: the three distinct `safeErrorResponse(...)` fallback strings must NEVER appear in the unauth response body.        |
| `test('PUT … unauth branch does NOT echo the 409 / 400-bare-message catch messages', …)`             | Pins the gate-before-409/`'must'`-400-catch order: the unauth status MUST be 401 (NOT 400 / 409), and the envelope MUST be the canonical 401 envelope.                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope** for each of `GET`,
   `PUT`, and `DELETE` — exact match
   `{ success: false, error: 'Unauthorized. Admin access
   required.' }`.
3. **Strict envelope-shape preservation**
   (`Object.keys(body).sort() === ['error', 'success']`).
4. **Cross-method envelope equality** — all three
   methods echo the same 401 envelope.
5. **Success-branch-key non-disclosure** across all
   three methods (no `data`, no `success: true`, no
   `message`).
6. **Gate-before-post-auth invariant** — none of the
   seven post-auth messages must appear in any unauth
   response.
7. **Gate-before-Zod-safeParse invariant** — the unauth
   response must NEVER carry the Zod `flatten()`-shaped
   `details` / `formErrors` / `fieldErrors` keys, even
   when the body would have failed Zod validation.
8. **Status invariance across distinct id shapes**.
9. **Status invariance across PUT body permutations**.
10. **Side-channel isolation** — cookies / headers do
    NOT alter the unauth response.
11. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
12. **Gate-before-body-parse invariant** — malformed
    JSON bodies still round-trip to `< 500`.
13. **Gate-before-repository-call invariant** across
    all three handlers (the four `findById` / `update`
    / `delete` repository calls are NOT entered on the
    unauth branch).
14. **Gate-before-cache-invalidation invariant** across
    PUT + DELETE (`invalidateContentCaches` /
    `revalidatePath` are NOT entered on the unauth
    branch).
15. **Per-handler-catch-message non-disclosure** — the
    three distinct `safeErrorResponse(...)` fallback
    strings (`'Failed to fetch | update | delete
    collection'`) must NEVER appear in the unauth
    response body.
16. **Gate-before-409-/-`'must'`-400-catch invariant**
    — the unauth status MUST be 401 (NOT 400 / 409),
    and the envelope MUST be the canonical 401 envelope
    (the PUT auth branch's two bare-message catches
    `'already exists'` → 409 and `'must'` → 400 must
    NEVER fire on the unauth branch).

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the bare-envelope triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  the hybrid-envelope triple-method
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md),
  the categories-CRUD triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md),
  the 403-on-unauth triple-method
  [`admin-comments-id-method-spec.md`](admin-comments-id-method-spec.md),
  the Zod-`parse()`-with-`details`-envelope triple-
  method
  [`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md),
  and the validation-less / non-admin-gated /
  soft-delete-DELETE triple-method
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md).
- The companion nested-dual-method spec for collections,
  [`admin-collections-id-items-method-spec.md`](admin-collections-id-items-method-spec.md),
  which walks `GET` + `POST` on `/api/admin/collections/
  {id}/items` (the items-of-a-collection sub-resource).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-collection CRUD
  route sits inside.
- [`docs/questions.md`](../questions.md) — the `details:
  flatten()` envelope shape is the load-bearing
  divergence noted in the smoke layer's spec-vs-actual
  envelope comparison.
