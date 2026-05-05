---
id: admin-tags-all-query-spec
title: E2E Admin Tags All Query Spec (apps/web-e2e/tests/api/admin-tags-all-query.spec.ts)
sidebar_label: E2E Admin Tags All Query Spec
sidebar_position: 549
---

# E2E Admin Tags All Query Spec — `apps/web-e2e/tests/api/admin-tags-all-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Git-CMS tags-listing query-param smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-tags-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-all-query.spec.ts).

This is the **forty-ninth** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/` and the **forty-seventh** under
`apps/web-e2e/tests/api/`. It is the **second Git-CMS-
backed admin-tree query smoke** the docs tree references
(the first was the sibling
[`admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
covered indirectly via the
[`client-trash-page-object.md`](./client-trash-page-object.md)
co-tenant cross-link). The tags-all route is unique in
that it documents a **dead-branch defensive type-coercion
narrowing** that no other admin-tree route the docs tree
publishes carries.

## Why this spec is the dead-branch type-narrowing Git-CMS query smoke

The route under test
([`apps/web/app/api/admin/tags/all/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/tags/all/route.ts))
exports a single `GET` handler. The handler combines:

1. **`auth()` session lookup** — the canonical
   admin-tree session resolver (NOT
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
   locale to `getCachedItems({ lang: locale })`.
4. **Defensive `typeof locale !== 'string'` narrowing**
   — emits 400
   `{ success: false, error: 'Invalid locale parameter' }`
   if the resolved locale is not a string. **This branch
   can never fire today** because
   `searchParams.get(name)` always returns
   `string | null`, and the `|| 'en'` default coerces
   `null` to a string before the `typeof` check. The
   dead-branch validator is a defensive posture against
   future contributors who refactor the locale resolution
   to read from a different source. Distinct from the
   sibling
   [`admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
   route which omits this defensive narrowing entirely.
5. **`getCachedItems({ lang: locale })` Git-CMS read**
   — the load-bearing per-locale tag list reader.
   Reads from the per-locale tag list stored in the
   Git-based content repository (cloned from
   `DATA_REPOSITORY` into `.content/`); the tag list
   is materialised at build time and cached in-memory
   per-locale. Distinct from every other admin-tree
   route's drizzle / Postgres posture EXCEPT the
   sibling categories-all route.
6. **Success payload** — `{ success: true, data: tags }`
   with status 200.
7. **Outer catch** — `console.error` + 500
   `{ success: false, error: 'Failed to fetch tags' }`.
8. **Method-resolution surface** — the route exports
   `GET` only. `POST` / `PUT` / `PATCH` / `DELETE` must
   round-trip to a `< 500` status.

## Cross-route Git-CMS-vs-DB matrix

| Route                              | Backend             | Locale narrowing                          | 401 envelope                                    |
| ---------------------------------- | ------------------- | ----------------------------------------- | ----------------------------------------------- |
| `GET /api/admin/tags/all` (this)   | **Git-CMS**         | **`typeof !== 'string'` dead-branch**     | `{ success: false, error: 'Unauthorized' }`     |
| `GET /api/admin/categories/all`    | **Git-CMS**         | None (no defensive check)                 | `{ success: false, error: 'Unauthorized' }`     |
| `GET /api/admin/categories/git`    | GitHub API          | None                                      | `{ error: 'Unauthorized. Admin access required.' }` (bare envelope) |
| `GET /api/admin/categories`        | DB repository       | None                                      | `{ success: false, error: 'Unauthorized' }`     |
| `GET /api/admin/tags`              | DB repository       | None                                      | `{ success: false, error: 'Unauthorized' }`     |

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~50 query
permutations) and **eight hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const path of ADMIN_TAGS_ALL_QUERIES) test(…)`                                               | Bulk-loop walk of every plausible query-param permutation (~50 paths covering `?locale=` plus locale variations, pagination keys, status / active filters, content projection, cache-busting, impersonation, magic-token bypass, admin-override, multi-tenancy, Git-CMS-targeting, repeated keys, and bogus / typo'd keys). |
| `test('… returns a 401 with the canonical { success, error } envelope on the unauth branch', …)`  | Pins the bare 401 envelope.                                                                                                                                          |
| `test('… has a stable status across query permutations', …)`                                       | Parameterised-vs-baseline status-stability comparison.                                                                                                              |
| `test('… ?locale=… does NOT bypass the admin gate', …)`                                            | Per-key isolation walk for the `?locale=` documented query param across all six supported locales plus `invalid` plus the empty string.                              |
| `test('… ?userId=… does NOT bypass the admin gate', …)`                                            | Per-key isolation walk for impersonation keys.                                                                                                                       |
| `test('… ?token=… does NOT bypass the admin gate', …)`                                             | Per-key isolation walk for magic-token bypass keys.                                                                                                                 |
| `test('… ?bypass=… does NOT bypass the admin gate', …)`                                            | Per-key isolation walk for admin-override keys.                                                                                                                      |
| `test('… ?repo=…&branch=…&commit=… does NOT introduce a Git-CMS-source bypass', …)`                | Per-key isolation walk for Git-CMS-targeting keys (security-sensitive vector for a future contributor who exposes per-tenant or per-branch overrides).               |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation (~50 total) must round-trip to a `< 500`
   status.
2. **Bare 401 envelope on the unauth branch** — exact
   match `{ success: false, error: 'Unauthorized' }`.
3. **Status invariance across query permutations**.
4. **Per-key isolation** for the `?locale=`,
   `?userId=`, `?token=`, `?bypass=`, and
   `?repo=&branch=&commit=` key families.
5. **Gate-before-locale-narrowing invariant** — the
   dead-branch `typeof locale !== 'string'` narrow
   must never fire on the unauth branch (which already
   returns 401 before the narrowing can run).
6. **Gate-before-Git-CMS-read invariant** — the
   `getCachedItems({ lang: locale })` Git-CMS reader
   must NEVER be entered on the unauth branch.

## What this spec does NOT cover

- The 200 success branch. Authenticated-admin callers
  must use the
  [`admin-tags-page-object.md`](./admin-tags-page-object.md)
  driver paired with the page-level admin tags spec at
  `apps/web-e2e/tests/admin/tags.spec.ts`.
- The 400 invalid-locale branch (which can never fire
  today; documented as a dead-branch defensive
  posture).
- The 500 outer-catch branch (which requires a Git-CMS
  failure to fire and is out of scope for the smoke
  layer).

## See also

- The DB-backed sibling
  [`admin-tags-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-tags-query.spec.ts)
  covers the database-backed `/api/admin/tags`
  listing route (with pagination).
- The Git-CMS sibling for categories at
  [`admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
  covers the same posture WITHOUT the dead-branch
  defensive narrowing.
- The page-object driver
  [`admin-tags-page-object.md`](./admin-tags-page-object.md)
  documents the suite's admin tags-management driver
  paired with the same admin-tree route's UI shell.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the tags-all collection
  route sits inside.
