---
id: admin-companies-id-method-spec
title: E2E Admin Companies [id] Method Spec (apps/web-e2e/tests/api/admin-companies-id-method.spec.ts)
sidebar_label: E2E Admin Companies [id] Method Spec
sidebar_position: 532
---

# E2E Admin Companies [id] Method Spec — `apps/web-e2e/tests/api/admin-companies-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-company CRUD GET / PUT / DELETE method /
id / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-companies-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-companies-id-method.spec.ts).

This is the **first triple-method admin-tree smoke** the
docs tree publishes that combines the bare
`{ error: 'Unauthorized' }` 401 envelope (NO `success`
key — matching `admin/clients/[clientId]`) with a
**Zod `parse()` (NOT `safeParse()`) body-validation step**
that emits a `details: [{field, message}]` 400 envelope (a
unique envelope key no prior admin-tree smoke pins) AND
**two 409 Conflict pre-update uniqueness checks** with
dynamically-interpolated messages AND an **outer-catch
unique-constraint translation chain** that maps DB error
messages to one of three 409 envelope variants.

## Why this spec is the Zod-`parse()`-with-`details`-envelope smoke

The route under test
([`apps/web/app/api/admin/companies/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/companies/[id]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME single-step inline
`!session?.user?.isAdmin` gate that returns **401
`{ error: 'Unauthorized' }`** (bare envelope, NO `success`
key — matching the `admin/clients/[clientId]` shape) and
the SAME `console.error` + bare `{ error: '<msg>' }` 500
catch posture (with handler-specific messages).

Each handler diverges on its post-gate surface:

| Handler  | Pre-update existence check | Body parse                              | Validation chain                                                                                              | Service call                                | Pre-update uniqueness checks                                                                                                                                                  | Outer catch                                                                                                                          | Success-payload shape                                                            |
| -------- | -------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `GET`    | None                       | None                                    | None                                                                                                          | `getCompanyById(id)` → 404 `'Company not found'` | None                                                                                                                                                                          | `console.error` + 500 `'Failed to fetch company'`                                                                                    | `{ success: true, data: <company> }`                                              |
| `PUT`    | `getCompanyById(id)` → 404 (BEFORE the body parse) | `await request.json()`                  | **Zod `parse()` (NOT `safeParse()`)** wrapped in inline try/catch → 400 `{ error: 'Validation error', details: [{field, message}] }` (a UNIQUE envelope key no prior admin-tree smoke pins) | `updateCompany(id, updateData)`             | TWO 409 pre-update checks: `getCompanyByDomain(...)` → 409 `'Company with domain '<domain>' already exists'` (dynamic interpolation); `getCompanyBySlug(...)` → 409 `'Company with slug '<slug>' already exists'` (dynamic interpolation) | Outer-catch unique-constraint translation chain: `error.message.includes('unique constraint' \| 'duplicate key')` → 409 with three distinct message variants based on `domain` / `slug` substring | `{ success: true, data: <company> }`                                              |
| `DELETE` | None                       | None                                    | None                                                                                                          | `deleteCompany(id)` returns boolean → 404 if `false` | None                                                                                                                                                                          | `console.error` + 500 `'Failed to delete company'`                                                                                   | `{ success: true, message: 'Company deleted successfully' }` (NO `data` key)      |

## Cross-route triple-method comparison

| Route                                          | Methods                  | 401 envelope                                                | PUT body-validation strategy                                  |
| ---------------------------------------------- | ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `/api/admin/companies/{id}` (this spec)        | `GET` + `PUT` + `DELETE` | Bare `{ error: 'Unauthorized' }` (no `success` key)         | **Zod `parse()` (NOT `safeParse()`)** + `details: [...]` envelope |
| `/api/admin/sponsor-ads/{id}/reject`           | `POST` (single-method)   | Canonical longer                                            | Zod `safeParse(...)` + flat `error` string                     |
| `/api/admin/sponsor-ads/{id}/cancel`           | `POST` (single-method)   | Canonical longer                                            | Zod `safeParse(...)` + flat `error` string                     |
| `/api/admin/items/{id}`                        | `GET` + `PUT` + `DELETE` | Canonical longer                                            | None (body forwarded to repository)                            |
| `/api/admin/clients/{clientId}`                | `GET` + `PUT` + `DELETE` | Bare `{ error: 'Unauthorized' }` (no `success` key)         | None (body forwarded to query function)                        |
| `/api/admin/users/{id}`                        | `GET` + `PUT` + `DELETE` | Hybrid `{ success: false, error: 'Unauthorized' }`          | Eight-step manual chain                                        |
| `/api/admin/categories/{id}`                   | `GET` + `PUT` + `DELETE` | Canonical longer                                            | Manual + DB-lookup chain                                       |
| `/api/admin/comments/{id}`                     | `GET` + `PUT` + `DELETE` | 403 `{ success: false, error: 'Forbidden' }`                | Inline content-trim only                                       |
| `/api/admin/reports/{id}`                      | `GET` + `PUT`            | 403 `{ success: false, error: 'Forbidden' }`                | Manual enum validation + dynamic 400 messages                  |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across id
shapes, **three method-bulk-loop walks** across header
shapes, **one body-bulk-loop walk** for `PUT` (~16 PUT
bodies covering Zod-valid / Zod-invalid / uniqueness-
trigger / bypass shapes), and a suite of **sixteen hand-
written scenarios**.

| Block                                                                                                  | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const id of COMPANY_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                       | Bulk-loop walk of every plausible id shape (~6 ids) × three methods.                                                                                                |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                    | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                              | Bulk-loop walk of every plausible PUT body shape (~16 bodies, including Zod-valid name / website / domain / slug / status updates, Zod-invalid probes for invalid slug pattern / website URI / too-long name / invalid status enum, plus bypass shapes). |
| `test('GET … returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`              | Pins the bare 401 envelope for `GET` and the divergence vs the canonical longer envelope.                                                                            |
| `test('PUT … returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`              | Pins the bare 401 envelope for `PUT`.                                                                                                                                |
| `test('DELETE … returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`           | Pins the bare 401 envelope for `DELETE`.                                                                                                                              |
| `test('GET / PUT / DELETE … unauth envelope has NO success key', …)`                                   | Strict envelope-shape assertion across all three methods.                                                                                                            |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`               | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`           | Negative-property assertion: `data`, `details`, `message`, `success: true` must NOT appear.                                                                          |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`     | Pins the gate-before-post-auth order across nine static messages plus regex prefix checks for the dynamic `'Company with domain\|slug '<...>' already exists'` 409 messages. |
| `test('GET / PUT / DELETE … has a stable status across distinct id shapes', …)`                        | Pins the gate-before-params-resolution order.                                                                                                                       |
| `test('PUT … has a stable status across body permutations', …)`                                        | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                    | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                          | Method-resolution walk.                                                                                                                                              |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service / DB call is NOT entered on the unauth branch', …)`                | Pins the gate-before-service order across all five DB-query calls.                                                                                                   |
| `test('PUT … Zod validation chain is NOT entered on the unauth branch', …)`                            | Pins the gate-before-Zod-validation invariant: every Zod-invalid body shape must round-trip to the same 401 status with NO `details` key in the response.            |
| `test('PUT … uniqueness-check 409 branch is NOT entered on the unauth branch', …)`                     | Pins the gate-before-uniqueness-check invariant: the unauth response must NEVER match the dynamic `/^Company with (domain\|slug) '/` regex prefixes.                  |
| `test('PUT … unique-constraint outer-catch chain is NOT entered on the unauth branch', …)`             | Pins the gate-before-outer-catch invariant: the unauth response must NEVER echo any of the three static unique-constraint translation messages.                       |
| `test('GET / PUT / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)`  | Pins the per-handler catch-message divergence.                                                                                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every id × method
   permutation, every header × method permutation, and
   every PUT body permutation (~~6×3 + 17×3 + 16 = ~85
   total) must round-trip to a `< 500` status.
2. **Bare 401 envelope on the unauth branch** for each
   of `GET`, `PUT`, and `DELETE` — exact match
   `{ error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation** —
   `Object.keys(body) === ['error']`, no `success` key.
4. **Cross-method envelope equality**.
5. **Success-branch-key non-disclosure** — the route-
   specific `data`, `details`, `message` keys plus
   `success: true` must NOT appear in any unauth
   response.
6. **Gate-before-post-auth invariant** — none of nine
   static post-auth messages plus none of the dynamic
   `'Company with domain\|slug '<...>' already exists'`
   409 messages (matched via regex prefix) must appear
   in any unauth response.
7. **Status invariance across distinct id shapes**.
8. **Status invariance across PUT body permutations**.
9. **Side-channel isolation**.
10. **Cross-method invariance** — `POST` / `PATCH`
    round-trip to a `< 500` status.
11. **Gate-before-body-parse invariant**.
12. **Gate-before-service invariant** across all five
    DB-query calls (`getCompanyById` /
    `getCompanyByDomain` / `getCompanyBySlug` /
    `updateCompany` / `deleteCompany`).
13. **Gate-before-Zod-validation invariant** — every
    Zod-invalid body shape must round-trip to the same
    401 status with NO `details` key in the response.
14. **Gate-before-uniqueness-check invariant** — the
    unauth response must NEVER match the dynamic
    `/^Company with (domain\|slug) '/` regex prefixes.
15. **Gate-before-outer-catch invariant** — the unauth
    response must NEVER echo any of the three static
    unique-constraint translation messages.
16. **Per-handler catch-message divergence** — the
    unauth response must NOT echo any of the three
    distinct catch messages.

## See also

- The full set of sibling per-spec-file references under
  `tests/api/`, including the bare-envelope triple-method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
  the canonical-longer-envelope triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the hybrid-envelope triple-method
  [`admin-users-id-method-spec.md`](admin-users-id-method-spec.md),
  the 403-on-unauth triple-method
  [`admin-comments-id-method-spec.md`](admin-comments-id-method-spec.md),
  the categories-CRUD triple-method
  [`admin-categories-id-method-spec.md`](admin-categories-id-method-spec.md),
  and the Zod-`safeParse(...)` single-method
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md)
  and
  [`admin-sponsor-ads-id-cancel-method-spec.md`](admin-sponsor-ads-id-cancel-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-company CRUD route
  sits inside.
