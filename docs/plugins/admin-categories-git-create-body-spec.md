---
id: admin-categories-git-create-body-spec
title: E2E Admin Categories Git Create Body Spec (apps/web-e2e/tests/api/admin-categories-git-create-body.spec.ts)
sidebar_label: E2E Admin Categories Git Create Body Spec
sidebar_position: 547
---

# E2E Admin Categories Git Create Body Spec — `apps/web-e2e/tests/api/admin-categories-git-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Git-CMS-write category-create POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/admin-categories-git-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-git-create-body.spec.ts).

This is the **first POST-only Git-CMS-write admin-tree
smoke** the docs tree publishes — distinct from the
regular `admin/categories` POST which writes to the DB.
The Git POST commits a new category file to the configured
`DATA_REPOSITORY` GitHub repository via
`createCategoryGitService`. The companion
[`admin-categories-git-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-git-query.spec.ts)
covers the GET surface of the same route.

## Why this spec is the canonical-longer-bare-envelope POST smoke

The route under test
([`apps/web/app/api/admin/categories/git/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/git/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin`
   gate** → 401 `{ error: 'Unauthorized. Admin access
   required.' }` — NOTE: **canonical longer message but
   WITHOUT `success: false` envelope key**. This is a
   UNIQUE envelope shape: the only prior route with the
   canonical longer message uses `success: false`
   (`admin/items/[id]`, `admin/categories/[id]`,
   `admin/items/import`, etc.); the only prior routes
   that use the bare `{ error: ... }` envelope (no
   `success` key) use the SHORT `'Unauthorized'`
   message (`admin/clients/[clientId]`,
   `admin/companies/[id]`, `admin/companies` POST).
   This route mixes the canonical longer message WITH
   the bare envelope.
2. **JSON body parse via `await request.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch.
3. **Two-field required check** — `if (!id || !name)`
   → 400 `{ success: false, error: 'Category ID and
   name are required' }` (NOTE: includes `success:
   false` key — distinct from the 401 envelope which
   lacks it).
4. **DATA_REPOSITORY env-var validation** — if missing,
   500 `'DATA_REPOSITORY not configured. Please set
   DATA_REPOSITORY environment variable.'`.
5. **DATA_REPOSITORY URL format check** — must match
   `/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/` → 500
   `'Invalid DATA_REPOSITORY format. Expected:
   https://github.com/owner/repo'` if malformed.
6. **GH_TOKEN env-var validation** — if missing, 500
   `'GitHub token not configured. Please set GH_TOKEN
   environment variable.'`.
7. **`createCategoryGitService(gitConfig).
   createCategory({ id, name })`** — the load-bearing
   Git-service call. Distinct from prior POST smokes
   which use database repositories.
8. **Success payload** — `{ success: true, category:
   <newCategory>, message: 'Category created and
   committed to Git repository' }` with status 200
   (NOT 201).
9. **Outer catch with two branches**:
   - (a) `error.message.includes('already exists')` →
     409 echoing raw `error.message`.
   - (b) Else: `safeErrorResponse(error, 'Failed to
     create category via Git')`.
10. **Method-resolution surface** — the route exports
    `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
    round-trip to a `< 500` status.

## Cross-route POST envelope/validation matrix (final)

| Route                                          | 401 envelope                                                | Storage              |
| ---------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| `POST /api/admin/categories/git` (this spec)   | **Canonical longer + bare envelope (NO `success` key)**     | **Git repository**   |
| `POST /api/admin/categories`                   | Canonical longer + `success: false` envelope                | DB repository        |
| `POST /api/admin/items`                        | Canonical longer + `success: false` envelope                | DB repository        |
| `POST /api/admin/companies`                    | Bare + NO `success` key                                     | DB query             |
| `POST /api/admin/clients`                      | Bare + NO `success` key                                     | DB query             |
| `POST /api/admin/users`                        | Hybrid `success: false` + bare-`Unauthorized`               | DB repository        |
| `POST /api/admin/tags`                         | Hybrid                                                       | DB repository        |
| `POST /api/admin/collections`                  | Canonical longer + `success: false` envelope                | DB repository        |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~12
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_CATEGORIES_GIT_CREATE_HEADERS) test(…)`                    | Bulk-loop walk of every plausible header shape (~14 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_CATEGORIES_GIT_CREATE_BODIES) test(…)`                        | Bulk-loop walk of every plausible body shape (~12 bodies covering missing-id / missing-name probes plus valid bodies plus bypass shapes).                            |
| `test('… returns 401 with the canonical longer message in a bare envelope (NO success key)', …)`   | Pins the unique mixed envelope shape.                                                                                                                                |
| `test('… unauth envelope has NO success key', …)`                                                  | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `category`, `data`, `success`, `message` must NOT appear.                                                                                |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across six static post-auth messages (including the three env-var validation messages).                                          |
| `test('… has a stable status across header / body permutations', …)`                               | Five body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-field check is NOT entered on the unauth branch', …)`                            | Pins the gate-before-required-field-check order.                                                                                                                    |
| `test('… env-var validation chain is NOT entered on the unauth branch', …)`                        | Pins the gate-before-env-var-validation order: the unauth response must NEVER echo any of the three env-var error messages.                                          |
| `test('… Git service call is NOT entered on the unauth branch', …)`                                | Pins the gate-before-Git-service order: the unauth response must NEVER echo a `category` key from the Git-committed payload.                                          |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **Canonical longer message + bare envelope on the
   unauth branch** — exact match `{ error:
   'Unauthorized. Admin access required.' }` with NO
   `success` key.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — the
   `category`, `data`, `success`, `message` keys must
   NOT appear in any unauth response.
5. **Gate-before-post-auth invariant** — none of the
   six static post-auth messages must appear in any
   unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-check invariant**.
11. **Gate-before-env-var-validation invariant**.
12. **Gate-before-Git-service invariant**.

## See also

- The companion query-surface spec
  [`admin-categories-git-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-git-query.spec.ts)
  covers the GET surface of the same route.
- The DB-write companion
  [`admin-categories-create-body-spec.md`](admin-categories-create-body-spec.md)
  covers the regular `admin/categories` POST.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the categories-git
  collection route sits inside.
