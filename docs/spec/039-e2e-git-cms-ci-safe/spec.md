---
id: spec-039-e2e-git-cms-ci-safe
title: Spec 039 — CI-safe git-CMS writes + favorites e2e race fix
sidebar_label: 039 E2E git-CMS CI-safe
---

# Feature spec — `039-e2e-git-cms-ci-safe`

## 1. Summary

Make the authenticated **write-flow** Playwright specs pass in CI by removing
two CI-specific hangs: (a) per-request git-CMS remote round-trips against the
unreachable CI content remote that have no HTTP timeout, and (b) a session-
hydration race in the favorite-toggle page object. No production behaviour
changes and no tests are skipped or deleted.

## 2. Motivation

The e2e suite (`apps/web-e2e`, run via `.github/workflows/e2e.yml`) has been
red since 2026-05-27. The server boots and the API specs pass; the failures
are a tight cluster of authenticated **write** flows timing out at ~30–37s:

- `tests/admin/collections.spec.ts › admin can create a new collection`
- `tests/client/submit-and-manage.spec.ts › client can submit a new item`
- `tests/client/favorites-toggle.spec.ts › add/remove a favorite`

Root causes (confirmed by tracing each spec → page object → app code):

1. **git-CMS writes block on an unreachable remote (collections, submit).**
   `POST /api/admin/collections` and `POST /api/client/items` go through
   `CollectionGitService` / `ItemGitService`, which on init `pull()` and after
   each write `push()` to the content remote. In CI the `.content` git stub's
   `origin` points at a placeholder repo that 401s, and isomorphic-git applies
   **no HTTP timeout**, so these round-trips sit on the request critical path
   and blow past the 30s redirect/modal wait. (Commit `d883149e` fixed the
   analogous *read*/clone path; the per-write `pull`/`push` were never covered.)
2. **Concurrent lazy git-service init (collections).** `getGitService()`
   memoized a singleton with no in-flight lock, so two parallel CI workers
   (`workers: 2`) could initialize isomorphic-git against the same
   `.content/.git` simultaneously — not concurrency-safe, can stall.
3. **Favorite toggle session race (favorites).** Favorites are DB-backed (no
   git). The favorite button's `onClick` reads the current user; if
   `/api/current-user` hasn't resolved, an early click opens the **login
   modal** instead of toggling, and the modal's full-screen `z-50` backdrop
   then eats subsequent clicks (swallowed by the page object) so the
   `aria-label` never flips → 30s `expect` timeout.

## 3. Goals

- Authenticated create/submit/toggle specs pass deterministically in CI.
- No change to production write behaviour (real deploys still pull/push).
- No test skipped, weakened, or deleted (per the no-removal rule).

## 4. Non-goals

- Re-enabling e2e on PR/develop triggers (it stays stage/main + dispatch per
  `CI_RELEASE_GATES`).
- A generic isomorphic-git HTTP timeout (recommended follow-up; see §7).
- Touching the category/tag git services — their admin specs are not in the
  observed failing set; if a future run shows them failing, apply the same
  `isContentGitRemoteDisabled()` guard.

## 5. Approach

- **New** `apps/web/lib/services/content-git-offline.ts` —
  `isContentGitRemoteDisabled()` returns true when `CI === 'true'` (set by
  GitHub Actions for this template **and** every downstream `awesome-*` repo,
  so no per-repo workflow edit is needed) or `CONTENT_GIT_OFFLINE === 'true'`
  (explicit escape hatch). Runtime (Vercel/k8s) does not set `CI`, so prod
  writes still pull/push.
- `item-git.service.ts` / `collection-git.service.ts` — guard `syncWithRemote`
  (skip pull/clone) and the post-commit `push` with that helper. The local
  YAML write still happens (all reads come from disk).
- `item.repository.ts` / `collection.repository.ts` — add an in-flight init
  promise lock so concurrent callers share a single git-service init.
- `apps/web-e2e/page-objects/public/item-detail.page.ts` — `clickFavorite()`
  now dismisses a login modal opened by a pre-hydration click and only counts
  a click that actually flips the label.

## 6. Acceptance criteria

- The three specs above pass in the e2e workflow (verify via
  `gh workflow run e2e.yml -f grep="create a new collection"`, `… submit a new
  item`, `… add and remove a favorite`).
- No production code path changes when `CI`/`CONTENT_GIT_OFFLINE` are unset.

## 7. Follow-up

- Add a hard HTTP timeout (AbortController) around isomorphic-git `pull`/`push`
  so a flaky/slow real remote can never block a request in production either.
- Apply the same guard to `category-git.service.ts` / `tag-git.service.ts` for
  parity if their admin write specs ever enter the failing set.

## 8. Status

in-progress — fix authored; verifying against a dispatched e2e run on the
branch.
