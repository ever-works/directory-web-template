---
id: admin-categories-all-query-spec
title: E2E Admin Categories All Query Spec (apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
sidebar_label: E2E Admin Categories All Query Spec
sidebar_position: 618
---

# E2E Admin Categories All Query Spec — `apps/web-e2e/tests/api/admin-categories-all-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Git-CMS categories-listing query-param smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts).

This page is the dedicated per-source-file reference for
the **first Git-CMS-backed admin-tree query smoke** the
docs tree publishes — previously covered indirectly via
the [`client-trash-page-object.md`](./client-trash-page-object.md)
co-tenant cross-link and called out repeatedly from the
sibling [`admin-tags-all-query-spec.md`](./admin-tags-all-query-spec.md)
without a dedicated landing page of its own. The
categories-all route is the **no-defensive-narrowing
Git-CMS sibling** of the tags-all route: same admin gate,
same Git-CMS reader, but no dead-branch
`typeof locale !== 'string'` validator.

## Why this spec is the no-narrowing Git-CMS-backed admin query smoke

The route under test
([`apps/web/app/api/admin/categories/all/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/all/route.ts))
exports a single `GET` handler. The handler combines:

1. **`auth()` session lookup** — the canonical admin-
   tree session resolver (NOT
   `getCachedApiSession(req)` which the
   [`admin-settings-update-method-spec.md`](./admin-settings-update-method-spec.md)
   PATCH handler uses).
2. **Single-step `!session?.user?.isAdmin` gate** →
   401 `{ success: false, error: 'Unauthorized' }` (the
   bare `'Unauthorized'` message — NOT
   `'Unauthorized. Admin access required.'` /
   `'Forbidden'`).
3. **`?locale=` query-param read AFTER the gate** —
   `searchParams.get('locale') || 'en'`. Defaults to
   `'en'` via the `|| 'en'` shortcut and passes the
   locale to `getCachedItems({ lang: locale })`. **No
   defensive `typeof locale !== 'string'` narrowing**
   — distinct from the sibling
   [`admin-tags-all-query-spec.md`](./admin-tags-all-query-spec.md)
   route which carries the dead-branch validator.
4. **`getCachedItems({ lang: locale })` Git-CMS read**
   — the load-bearing per-locale category list reader.
   Reads from the per-locale category list stored in
   the Git-based content repository (cloned from
   `DATA_REPOSITORY` into `.content/`); the category
   list is materialised at build time and cached
   in-memory per-locale. Distinct from every other
   admin-tree route's drizzle / Postgres posture
   EXCEPT the sibling tags-all route.
5. **Success payload** — `{ success: true, data: categories }`
   with status 200.
6. **Outer catch** — `console.error` + 500
   `{ success: false, error: 'Failed to fetch categories' }`.
7. **Method-resolution surface** — the route exports
   `GET` only. `POST` / `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status (Next.js returns
   405).
8. **Handler signature** — `GET(request: NextRequest)`
   — the Next-specific request type. Distinct from the
   reports route's bare `Request` type and from the
   categories-git route's zero-argument `GET()`
   signature.

## Cross-route Git-CMS-vs-DB matrix

| Route                              | Backend             | Locale narrowing                          | 401 envelope                                                          |
| ---------------------------------- | ------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/admin/categories/all` (this) | **Git-CMS**     | None (no defensive check)                 | `{ success: false, error: 'Unauthorized' }`                           |
| `GET /api/admin/tags/all`          | **Git-CMS**         | **`typeof !== 'string'` dead-branch**     | `{ success: false, error: 'Unauthorized' }`                           |
| `GET /api/admin/categories/git`    | GitHub API          | None                                      | `{ error: 'Unauthorized. Admin access required.' }` (bare envelope)   |
| `GET /api/admin/categories`        | DB repository       | None                                      | `{ success: false, error: 'Unauthorized' }`                           |
| `GET /api/admin/tags`              | DB repository       | None                                      | `{ success: false, error: 'Unauthorized' }`                           |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **eleven hand-written scenarios**.

| Block                                                                                           | Purpose                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const path of ADMIN_CATEGORIES_ALL_QUERIES) test(…)`                                      | Bulk-loop walk of every plausible query-param permutation (~50 paths covering `?locale=` plus locale variations, pagination keys, status / active filters, content projection, cache-busting, impersonation, magic-token bypass, admin-override, multi-tenancy, Git-CMS-targeting, path-traversal, repeated keys, and bogus / typo'd keys). |
| `test('… returns a 401 with the canonical { success, error } envelope on the unauth branch', …)` | Pins the bare 401 envelope.                                                                                                                                                                                                                                                                                                                          |
| `test('… has a stable status across query permutations', …)`                                    | Parameterised-vs-baseline status-stability comparison.                                                                                                                                                                                                                                                                                              |
| `test('… ?locale=… does NOT bypass the admin gate', …)`                                         | Per-key isolation walk for the `?locale=` documented query param across all six supported locales plus `invalid` plus the empty string.                                                                                                                                                                                                              |
| `test('… ?userId=… does NOT bypass the admin gate', …)`                                         | Per-key isolation walk for impersonation keys.                                                                                                                                                                                                                                                                                                      |
| `test('… ?token=… does NOT bypass the admin gate', …)`                                          | Per-key isolation walk for magic-token bypass keys.                                                                                                                                                                                                                                                                                                 |
| `test('… ?bypass=… does NOT bypass the admin gate', …)`                                         | Per-key isolation walk for admin-override keys.                                                                                                                                                                                                                                                                                                      |
| `test('… ?repo=…&branch=…&commit=… does NOT introduce a Git-CMS-source bypass', …)`             | Per-key isolation walk for Git-CMS-targeting keys (security-sensitive vector for a future contributor who exposes per-tenant or per-branch overrides).                                                                                                                                                                                              |
| `test('… ?path=… does NOT introduce a path-traversal bypass', …)`                               | UNIQUE — per-key isolation walk for the `?path=` query key including `../../etc/passwd` and `%00malicious` payloads. Distinct from the sibling tags-all spec which omits the path-traversal walk.                                                                                                                                                  |
| `test('… ?refresh=… does NOT introduce a cache-bust bypass', …)`                                | UNIQUE — per-key isolation walk for cache-busting keys against the Git-CMS reader's in-memory cache.                                                                                                                                                                                                                                                |
| `test('… keeps the response status stable across param permutations', …)`                       | Combined stress walk across the no-arg baseline, a single combined `?locale=&refresh=` tuple, and the longest plausible payload combining every key family in a single URL.                                                                                                                                                                          |
| `test('… does NOT branch on Accept header', …)`                                                 | Side-channel walk on the `Accept` header (`application/json`, `text/csv`, `application/xml`, `*/*`).                                                                                                                                                                                                                                                |
| `test('… repeated query keys do NOT bypass the gate', …)`                                       | Per-key isolation walk for repeated `?locale=` key permutations.                                                                                                                                                                                                                                                                                    |
| `test('… keeps a NextRequest-typed handler signature stable under cookie / IP side channels', …)` | Side-channel walk for cookies (`next-auth.session-token` / `authjs.session-token`) and IP forwarding headers (`X-Forwarded-For` / `X-Real-IP`). Pins that the `NextRequest`-typed handler signature does not branch on either side channel.                                                                                                       |
| `test('… response message is the bare "Unauthorized" (NOT "Forbidden", NOT role-context-specific suffix)', …)` | Negative-message assertion pinning the bare `'Unauthorized'` message and explicitly rejecting both the `'Forbidden'` and `'Unauthorized. Admin access required.'` alternatives.                                                                                                                                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation (~50 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** — exact
   match `{ success: false, error: 'Unauthorized' }`.
3. **Status invariance across query permutations**.
4. **Per-key isolation** for the `?locale=`,
   `?userId=`, `?token=`, `?bypass=`,
   `?repo=&branch=&commit=`, `?path=`, and `?refresh=`
   key families.
5. **Path-traversal-resistance invariant** — even with
   `../../etc/passwd` or `%00malicious` payloads on
   the `?path=` key, the unauth branch returns the
   identical 401 envelope (the gate fires before any
   filesystem-style path is resolved).
6. **Cache-bust-resistance invariant** — even with
   `?refresh=1` / `?fresh=true` / `?cache=bypass` /
   `?nocache=1` payloads, the in-memory Git-CMS cache
   is NEVER invalidated on the unauth branch (the
   gate fires before the cache key is computed).
7. **Header-side-channel isolation** for `Accept`,
   `Cookie` (`next-auth.session-token` /
   `authjs.session-token`), and IP forwarding headers
   (`X-Forwarded-For` / `X-Real-IP`).
8. **Negative-message assertion** — the 401 envelope
   carries the bare `'Unauthorized'` message and is
   NOT the `'Forbidden'` / `'Unauthorized. Admin
   access required.'` alternatives that the sibling
   `admin/categories/git` and `admin/reports` routes
   carry.
9. **Gate-before-Git-CMS-read invariant** — the
   `getCachedItems({ lang: locale })` Git-CMS reader
   must NEVER be entered on the unauth branch.

## What this spec does NOT cover

- The 200 success branch. Authenticated-admin callers
  must use the page-level admin categories spec at
  `apps/web-e2e/tests/admin/categories.spec.ts` (which
  exercises the categories surface end-to-end through
  the admin-tree UI shell rather than the API
  directly).
- The 500 outer-catch branch (which requires a Git-CMS
  failure to fire and is out of scope for the smoke
  layer).

## See also

- The Git-CMS-sibling
  [`admin-tags-all-query-spec.md`](./admin-tags-all-query-spec.md)
  documents the **same posture WITH a dead-branch
  defensive `typeof locale !== 'string'` narrowing** —
  the only Git-CMS-backed admin-tree route that
  carries the defensive validator.
- The DB-backed sibling
  [`admin-categories-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-query.spec.ts)
  covers the database-backed `/api/admin/categories`
  listing route (with pagination).
- The GitHub-API-backed sibling
  [`admin-categories-git-query-spec.md`](./admin-categories-git-query-spec.md)
  covers the `GET` export of
  `apps/web/app/api/admin/categories/git/route.ts` —
  the same admin-tree categories-data surface but
  served from live HTTPS calls to the GitHub API
  (using the configured `GITHUB_TOKEN` /
  `DATA_REPOSITORY` environment variables) rather
  than the local `.content/` mirror this route reads.
- The POST-companion of the GitHub-API-backed sibling
  [`admin-categories-git-create-body-spec.md`](./admin-categories-git-create-body-spec.md)
  covers the matching commit-a-new-category POST
  surface on the GitHub-API-backed sibling.
- The co-tenant page-object driver
  [`client-trash-page-object.md`](./client-trash-page-object.md)
  cross-references this spec from the consuming
  `client/submissions/trash` driver's docs (the
  cross-link that originally introduced this route to
  the docs tree before this dedicated landing page
  was published).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the categories-all
  collection route sits inside.
