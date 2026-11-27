---
id: spec-006-git-cms
title: 'Spec 006 — Git-based CMS'
sidebar_label: '006 Git-based CMS'
---

# Feature spec — `006-git-cms`

> **Status:** Shipped. Retroactive spec.

## 1. Summary

Source directory **content** (items, categories, tags, collections,
pages) from a separate **Git repository** that contains YAML / Markdown
files. The web app clones / pulls this repo at build time and at boot via
`apps/web/scripts/clone.cjs`, then exposes a typed content API in
[`apps/web/lib/content.ts`](../../apps/web/lib/content.ts) consumed by
the rest of the app.

## 2. Motivation

- Operating a directory is a content-heavy job; shipping content in Git
  gives non-developers a clean workflow (PR + review) and a free CDN for
  static assets.
- Git-as-CMS keeps content versioned, branchable, and easy to back up.
- Decouples deployment cadence (`apps/web`) from content cadence (the
  data repo).

## 3. Goals

- A configurable `DATA_REPOSITORY` env var pointing to the content repo.
- Bootstrapped via `scripts/clone.cjs` into `.content/`.
- Hot reload during dev when content changes.
- Strongly typed content models in TypeScript.
- SEO-friendly slug generation and stable URL structure.

## 4. Non-Goals

- A web-based content editor — out of scope (future plugin).
- Real-time collaboration on content — out of scope.

## 5. User Stories

```text
As a content editor, I want to manage items by editing Markdown / YAML
files and opening a PR, so my workflow is the same as the engineering
workflow.

As a developer, I want strongly typed access to content so my IDE
catches typos.
```

## 6. Acceptance Criteria

- [x] AC-1: `DATA_REPOSITORY` env var clones into `.content/`.
- [x] AC-2: Content schema enforced via Zod.
- [x] AC-3: Items, categories, tags, collections supported.
- [x] AC-4: Build fails with a clear error when content is malformed.
- [x] AC-5: Public listing and item detail pages render content.
- [x] AC-6: Recent hardening landed in PR #690 (auth secret + content
  bootstrap).
- [x] AC-7: Only public items reach the public read API. `fetchItems()`
  and `fetchItem()` skip an item that `isPubliclyVisibleItem()`
  (`apps/web/lib/item-visibility.ts`) rejects: a `draft`, `pending` or
  `rejected` status, any other status value, or a `deleted_at`
  timestamp. An item with no `status` counts as approved, as
  `ItemGitService` reads it. The skip comes before categories, tags and
  collections are counted, and `fetchItem()` returns `null` for a hidden
  item, so its page answers 404. A collection's `items` list from
  `collections.yml` (where the admin "assign items" action stores every
  slug it is given) drops the hidden slugs, and its `item_count` follows.
  The admin and client dashboards read through `ItemGitService` and still
  see every item (T-2846).
- [x] AC-8: The per-item engagement APIs answer only for a public item.
  `POST /api/items/[slug]/views`, `GET` and `POST .../comments`,
  `GET .../comments/rating` and `GET` and `POST .../votes` call
  `findPublicItem()` (`apps/web/lib/public-item.ts`, built on `fetchItem()`)
  and answer for a draft, pending, rejected or soft-deleted item as for an
  unknown slug: the views, comment and vote writes return 404 `Item not
  found` (a request without a session still gets its 401 first), the comment
  list is empty and the rating and vote reads return zero. The answers when
  the database is unavailable are unchanged (T-2853). `DELETE .../votes`
  answered for any slug here; it follows AC-12 now.
- [x] AC-9: `GET /api/items/[slug]/comments/rating/[commentId]` (public, no
  session) answers only for a comment the public comments list of that item
  shows: one that is not soft-deleted, whose author's account is active,
  whose item is the slug in the URL, and whose item `findPublicItem()` finds.
  Any other comment, a deleted one included, answers 404 `{ "error": "Comment
  not found" }`, and the comment comes with the fields the list returns
  (`getPublicCommentById` in `apps/web/lib/db/queries/comment.queries.ts`).
  The admin routes and moderation still read deleted comments through
  `getCommentById` (T-2856).
- [x] AC-10: The routes that show engagement totals answer only for a public
  item too. `GET /api/items/[slug]/activity` and `GET .../votes/count` call
  `findPublicItem()`, and `GET /api/items/engagement?slugs=` keeps the slugs
  `findPublicItemSlugs()` (same file, built on the cached `fetchItems()`
  listing) returns. For any other slug they answer as for an unknown one,
  with no database query for it: zero totals and `days` zero-filled series
  entries, a count of 0, all zeros (T-2857). The batch route follows the
  listing, which outside `next dev` is kept in memory for up to 10 minutes
  unless a content sync or an admin write clears it (AC-11). The activity
  and votes/count routes read the item file and change at once.
- [x] AC-11: An admin item write clears the public listing at once.
  `POST /api/admin/items` (create), `PUT` and `DELETE
  /api/admin/items/[id]`, `POST /api/admin/items/[id]/review` and `POST
  /api/admin/items/bulk` (approve, reject, delete) call
  `invalidateContentCaches()` (`apps/web/lib/cache-invalidation.ts`) after a
  successful write, as the category, tag and collection admin routes do, so
  the listing pages, `GET /api/items/listing` and `GET
  /api/items/engagement` show a new or approved item and drop a rejected or
  deleted one without waiting for the next content sync or the 10-minute
  listing TTL. The bulk route calls it once after its loop, when at least
  one item was written; a refused or failed write calls it not at all
  (T-2865).
- [x] AC-12: `DELETE /api/items/[slug]/votes`, whose answer carries the
  item's net votes, answers only for a public item too. After the 401 for a
  request without a session it calls `findPublicItem()` and answers 404
  `Item not found` for any other slug, as `POST .../votes` does, with no
  vote query: the caller's vote is not removed and shows again if the item
  is approved again (T-2864).

## 7. Out-of-Scope Considerations

- Multiple data repos at once (future spec).
- Per-user write access to data repo (future plugin).

## 8. UX Notes

No direct UX; content drives the public surface.

## 9. Data & API Surface

- Filesystem-based read API in `lib/content.ts`.
- DB tables that mirror content for fast queries (Drizzle).
- Cache invalidation through `lib/cache-invalidation.ts`.

## 10. Plugin / Adapter Impact

`ContentSource` will become a plugin interface (per
[`002`](../002-plugin-architecture/spec.md)) so adopters can swap Git for
a headless CMS (Contentful, Sanity, Hygraph) without touching core.

## 11. Risks & Open Questions

- **Risk:** large data repos slow first build. Mitigated by shallow
  clone in `clone.cjs`.
- **Open:** add Hygraph adapter as a built-in plugin? Default: **wait
  until plugin SDK is stable**.

## 12. Acceptance Test Plan

- `apps/web-e2e/tests/public/discover.spec.ts`,
  `apps/web-e2e/tests/public/item-detail.spec.ts`,
  `apps/web-e2e/tests/public/categories.spec.ts`.
- AC-7: `apps/web/lib/__tests__/public-item-visibility.spec.ts` (unit) and
  `apps/web-e2e/tests/public/unpublished-items-hidden.spec.ts`.
- AC-8: `apps/web/lib/__tests__/public-item.spec.ts` (unit) and
  `apps/web-e2e/tests/public/unpublished-items-hidden.spec.ts` (a view per
  status, then a comment and a vote on the approved item and the draft, and
  the approved item's comment, rating and vote reads once it is rejected).
- AC-9: `apps/web/lib/db/queries/__tests__/comment-by-id-public.spec.ts`
  (source guard) and `apps/web-e2e/tests/api/comment-by-id-visibility.spec.ts`
  (a comment read through its own slug, another slug and an unknown one, then
  after its author deletes it, and a second one after its item is rejected).
- AC-10: `apps/web/lib/__tests__/public-item-engagement-routes.spec.ts` and
  the `findPublicItemSlugs` tests in `public-item.spec.ts` (unit), and
  `apps/web-e2e/tests/public/unpublished-items-hidden.spec.ts` (activity,
  votes/count and engagement for the approved item and the draft after the
  vote, and for the approved item once it is rejected).
- AC-12: `apps/web/lib/__tests__/public-item-vote-delete.spec.ts` (unit) and
  `apps/web-e2e/tests/api/votes-delete-unpublished.spec.ts` (an unknown slug,
  a draft and a rejected item with a vote answer 404; approved again, the
  vote is still there and the DELETE removes it).

## 13. References

- `apps/web/scripts/clone.cjs` (bootstrap)
- `apps/web/lib/content.ts` (read API)
- Constitution: I (future plugin), II (TS), III (Spec), IV (Docs).
