---
id: admin-companies-create-body-spec
title: E2E Admin Companies Create Body Spec (apps/web-e2e/tests/api/admin-companies-create-body.spec.ts)
sidebar_label: E2E Admin Companies Create Body Spec
sidebar_position: 542
---

# E2E Admin Companies Create Body Spec — `apps/web-e2e/tests/api/admin-companies-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level company-create POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-companies-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-companies-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines the **bare
`{ error: 'Unauthorized' }` envelope** (NO `success` key)
with a **Zod `parse()` (NOT `safeParse()`) body validation
emitting a `details: [{field, message}]` 400 envelope**
AND **two dynamically-interpolated 409 pre-create
uniqueness checks** (`getCompanyByDomain` /
`getCompanyBySlug`) AND an **outer-catch unique-constraint
translation chain** that maps DB errors to one of three
409 envelope variants. The companion
[`admin-companies-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-companies-query.spec.ts)
covers the GET (paginated list) surface of the same
route.

## Why this spec is the bare-envelope-Zod-`parse()` collection-level POST smoke

The route under test
([`apps/web/app/api/admin/companies/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/companies/route.ts))
exports `GET` and `POST`. The POST handler is the sibling
of the
[`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md)
PUT handler — they share the SAME bare envelope, the SAME
Zod-`parse()`-with-`details`-envelope validation chain,
the SAME TWO 409 pre-create/-update uniqueness checks
(with dynamically-interpolated messages), and the SAME
outer-catch unique-constraint translation chain. The POST
diverges from the PUT on:

1. **NO existence check** — distinct from the PUT which
   checks the existing company FIRST.
2. **`createCompany(validatedData)` call** instead of
   `updateCompany(id, ...)`.
3. **Status 201 success branch** with `{ success:
   true, data: <company> }`.

All other invariants match the PUT smoke — the route
shares the SAME single-step inline
`!session?.user?.isAdmin` gate, the SAME bare 401
envelope, and the SAME `console.error` + bare 500 catch
posture.

## Cross-route POST envelope/validation matrix (extended)

| Route                                          | 401 envelope                                                | Body validation                                            | Pre-create check  | Outer catch                                                                |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `POST /api/admin/companies` (this spec)        | **Bare** `{ error: 'Unauthorized' }`                          | **Zod `parse()`** + `details: [...]` envelope              | TWO 409 dynamic   | Unique-constraint translation chain (3 variants) + 500 fallback             |
| `POST /api/admin/clients`                      | Bare                                                         | None (single email check)                                  | None              | 500 fallback                                                                |
| `POST /api/admin/items`                        | Canonical longer                                             | Manual 5-field guard                                       | TWO 409 dynamic   | `safeErrorResponse(...)`                                                     |
| `POST /api/admin/users`                        | Hybrid                                                       | Manual 8-step                                              | None              | `error.message`-pass-through                                                  |
| `POST /api/admin/categories`                   | Canonical longer                                             | Manual 1-field guard                                       | None              | 3-branch (`'already exists'` / `'must be'` / `safeErrorResponse(...)`)      |
| `POST /api/admin/tags`                         | Hybrid                                                       | Manual 2-field guard                                       | None              | 3-branch (`'already exists'` / `'required'\|'must be'` / fixed-500)         |
| `POST /api/admin/collections`                  | Canonical longer                                             | Manual 2-field guard                                       | None              | 2-branch + `safeErrorResponse(...)`                                          |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~14
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_COMPANIES_CREATE_HEADERS) test(…)`                         | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_COMPANIES_CREATE_BODIES) test(…)`                             | Bulk-loop walk of every plausible body shape (~14 bodies covering Zod-valid / Zod-invalid / uniqueness-trigger / bypass shapes).                                     |
| `test('… returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`              | Pins the bare 401 envelope.                                                                                                                                          |
| `test('… unauth envelope has NO success key', …)`                                                  | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `details`, `success` must NOT appear.                                                                                          |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across five static post-auth messages plus regex prefix checks for the dynamic 409 messages.                                    |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… Zod validation chain is NOT entered on the unauth branch', …)`                            | Pins the gate-before-Zod-validation order.                                                                                                                          |
| `test('… uniqueness-check 409 branch is NOT entered on the unauth branch', …)`                     | Pins the gate-before-uniqueness-check order.                                                                                                                        |
| `test('… createCompany call is NOT entered on the unauth branch', …)`                              | Pins the gate-before-create-call order.                                                                                                                              |
| `test('… unique-constraint outer-catch chain is NOT entered on the unauth branch', …)`             | Pins the gate-before-outer-catch order.                                                                                                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~31 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** —
   exact match `{ error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — the
   `data`, `details`, `success` keys must NOT appear
   in any unauth response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-Zod-validation invariant**.
11. **Gate-before-uniqueness-check invariant**.
12. **Gate-before-create-call invariant**.
13. **Gate-before-outer-catch invariant**.

## See also

- The companion query-surface spec
  [`admin-companies-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-companies-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[id]` triple-method
  [`admin-companies-id-method-spec.md`](admin-companies-id-method-spec.md)
  spec covering the same Zod-`parse()`-with-`details`-
  envelope validation chain on PUT updates, the
  collection-level POST companions
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md),
  [`admin-users-create-body-spec.md`](admin-users-create-body-spec.md),
  [`admin-categories-create-body-spec.md`](admin-categories-create-body-spec.md),
  [`admin-tags-create-body-spec.md`](admin-tags-create-body-spec.md),
  and
  [`admin-clients-create-body-spec.md`](admin-clients-create-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the companies collection
  route sits inside.
