---
id: admin-categories-git-query-spec
title: E2E Admin Categories Git Query Spec (apps/web-e2e/tests/api/admin-categories-git-query.spec.ts)
sidebar_label: E2E Admin Categories Git Query Spec
sidebar_position: 550
---

# E2E Admin Categories Git Query Spec — `apps/web-e2e/tests/api/admin-categories-git-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Git-repository-status / categories GET smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-categories-git-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-git-query.spec.ts).

This is the **fiftieth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/` and the **forty-eighth** under
`apps/web-e2e/tests/api/`. It is the **GET-companion** of
the recently-landed
[`admin-categories-git-create-body-spec.md`](./admin-categories-git-create-body-spec.md)
covering the **POST** export of the same route. Where the
POST handler **commits** a new category file to the
configured `DATA_REPOSITORY` GitHub repository, the GET
handler **reads** Git repository status and categories
from the same repository via the GitHub API.

## Why this spec is the zero-arg-handler GitHub-API GET smoke

The route under test
([`apps/web/app/api/admin/categories/git/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/git/route.ts))
exports `GET` and `POST`. The **GET handler** combines a
unique combination of FOUR distinct contracts:

1. **Zero-argument `GET()` handler signature** — the
   route does not take a `NextRequest` argument and
   reads no `searchParams` at all today. Distinct from
   every other admin-tree route's
   `GET(request: NextRequest)` posture (and from the
   bare `Request`-typed reports route's posture). Same
   posture as the notifications route.
2. **Bare `{ error: '...' }` envelope** (NOT the
   `{ success: false, error: '...' }` shape every
   other admin-gated route emits) — a single-key
   envelope without the `success` discriminant. The
   ONLY admin-tree GET route that combines the
   bare-envelope shape with a role-context-specific
   `'Unauthorized. Admin access required.'` message
   (the
   [`admin-settings-update-method-spec.md`](./admin-settings-update-method-spec.md)
   PATCH route uses the bare envelope with a bare
   `'Unauthorized'` message; the
   [`admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
   route uses the canonical envelope with the bare
   `'Unauthorized'` message).
3. **GitHub-API-backed service** via
   `createCategoryGitService(gitConfig)` — distinct
   from every other admin-tree route's drizzle / DB
   posture and from the
   [`admin-tags-all-query-spec.md`](./admin-tags-all-query-spec.md)
   / `admin-categories-all-query.spec.ts` routes' Git-CMS
   file-system reader posture. The service makes live
   HTTPS calls to the GitHub API using the configured
   `GITHUB_TOKEN` / `DATA_REPOSITORY` environment
   variables.
4. **Three distinct configuration-error 500 envelopes**
   after the gate — one for each of the three
   configuration prerequisites (`DATA_REPOSITORY` not
   set, invalid `DATA_REPOSITORY` format,
   `GITHUB_TOKEN` not set). Each emits the canonical
   `{ success: false, error: '...' }` envelope (NOT
   the bare envelope) — a deliberate inconsistency
   between the unauth-branch and the post-auth
   configuration-error branches that the route's
   handler structure makes invariant. Out of scope for
   the unauth-branch contract this spec pins.

## Cross-route GET envelope/backend matrix

| Route                                          | 401 envelope                                                        | Backend                  | Handler signature        |
| ---------------------------------------------- | ------------------------------------------------------------------- | ------------------------ | ------------------------ |
| `GET /api/admin/categories/git` (this spec)    | **`{ error: 'Unauthorized. Admin access required.' }` (bare)**      | **GitHub API (HTTPS)**   | **`GET()` (zero-arg)**   |
| `POST /api/admin/categories/git`               | `{ error: 'Unauthorized. Admin access required.' }` (bare)          | GitHub API (HTTPS)       | `POST(request: NextRequest)` |
| `GET /api/admin/categories/all`                | `{ success: false, error: 'Unauthorized' }`                         | Git-CMS file-system      | `GET(request: NextRequest)` |
| `GET /api/admin/tags/all`                      | `{ success: false, error: 'Unauthorized' }`                         | Git-CMS file-system      | `GET(request: NextRequest)` |
| `GET /api/admin/categories`                    | `{ success: false, error: 'Unauthorized' }`                         | DB repository            | `GET(request: NextRequest)` |
| `PATCH /api/admin/settings`                    | `{ error: 'Unauthorized' }` (bare)                                  | config.yml file          | `PATCH(req)`             |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const path of ADMIN_CATEGORIES_GIT_QUERIES) test(…)`                                         | Bulk-loop walk of every plausible query-param permutation (~50 paths covering Git-service-configuration override keys, impersonation, magic-token bypass, admin-override, multi-tenancy, path-traversal, repeated keys, and bogus / typo'd keys). |
| `test('… returns a 401 with the bare { error } envelope on the unauth branch', …)`                 | Pins the bare 401 envelope with the canonical longer message — distinct from every prior admin-tree GET smoke spec's canonical-envelope posture.                     |
| `test('… unauth envelope has NO success key', …)`                                                  | Strict envelope-shape assertion: `body.success` must be `undefined`.                                                                                                |
| `test('… unauth message is the canonical longer (NOT bare Unauthorized / NOT Forbidden)', …)`      | Negative-message assertions: `body.error` must NOT be `'Unauthorized'` or `'Forbidden'`.                                                                            |
| `test('… has a stable status across query permutations', …)`                                       | Parameterised-vs-baseline status-stability comparison.                                                                                                              |
| `test('… ?userId=… does NOT bypass the admin gate', …)`                                            | Per-key isolation walk for impersonation keys.                                                                                                                       |
| `test('… ?token=… does NOT bypass the admin gate', …)`                                             | Per-key isolation walk for magic-token bypass keys (notable here because the route's GitHub-API service uses `GITHUB_TOKEN` from the environment).                  |
| `test('… ?bypass=… does NOT bypass the admin gate', …)`                                            | Per-key isolation walk for admin-override keys.                                                                                                                      |
| `test('… ?repo=…&branch=…&owner=… does NOT introduce a Git-service-config bypass', …)`             | Per-key isolation walk for Git-service-config keys (security-sensitive vector for a future contributor who exposes per-tenant or per-branch overrides).             |
| `test('… ?path=… does NOT introduce a path-traversal bypass', …)`                                  | Per-key isolation walk for path-traversal payloads (`../../etc/passwd`, `%00`).                                                                                     |
| `test('… does NOT branch on Accept header', …)`                                                    | Side-channel walk for `Accept` header.                                                                                                                              |
| `test('… repeated query keys do NOT bypass the gate', …)`                                          | Repeated-key walk.                                                                                                                                                  |
| `test('… keeps a zero-arg handler signature stable under cookie / IP side channels', …)`           | Side-channel walk for fabricated session cookies and `X-Forwarded-For` / `X-Real-IP` headers.                                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation (~50 total) must round-trip to a `< 500`
   status.
2. **Bare 401 envelope on the unauth branch** — exact
   match `{ error: 'Unauthorized. Admin access required.' }`
   with NO `success` key.
3. **Strict envelope-shape preservation** —
   `body.success` is `undefined`; `body.error` is the
   canonical longer message.
4. **Status invariance across query permutations**.
5. **Per-key isolation** for the `?userId=`,
   `?token=`, `?bypass=`, `?repo=&branch=&owner=`, and
   `?path=` key families.
6. **Side-channel isolation** across `Accept` header
   and fabricated session cookies.
7. **Gate-before-config-validation invariant** — the
   three configuration-error 500 envelopes
   (`DATA_REPOSITORY` not set, invalid format,
   `GITHUB_TOKEN` not set) must NEVER fire on the
   unauth branch.
8. **Gate-before-Git-service invariant** — the
   `createCategoryGitService(gitConfig)` GitHub-API
   service must NEVER be entered on the unauth branch
   (otherwise live HTTPS calls would leak from the
   smoke harness).

## What this spec does NOT cover

- The 200 success branch. Authenticated-admin callers
  with valid configuration must be covered by a
  follow-up admin-tree page-object spec (the admin
  categories management UI shell at `/admin/categories`
  consumes this route via React Query).
- The three 500 configuration-error branches
  (`DATA_REPOSITORY` not set, invalid format,
  `GITHUB_TOKEN` not set), which require post-auth
  reachability and environment manipulation that is
  out of scope for the smoke layer.
- The `safeErrorResponse(...)` outer-catch branch,
  which requires a live GitHub API failure to fire and
  is out of scope for the smoke layer.

## See also

- The **POST companion**
  [`admin-categories-git-create-body-spec.md`](./admin-categories-git-create-body-spec.md)
  covers the create-and-commit surface of the same
  route.
- The DB-backed sibling
  [`admin-categories-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-query.spec.ts)
  covers the database-backed `/api/admin/categories`
  listing route.
- The Git-CMS file-system sibling
  [`admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
  covers the per-locale category list reader (cloned
  from `DATA_REPOSITORY` into `.content/`).
- The Git-CMS file-system sibling
  [`admin-tags-all-query-spec.md`](./admin-tags-all-query-spec.md)
  covers the per-locale tag list reader.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the categories-git
  collection route sits inside.
