---
id: spec-037
title: Item detail page performance — persisted similar-items cache
sidebar_label: 037 Item detail perf
---

# Feature spec — `037-item-detail-perf`

## 1. Summary

Make the public item-detail page (`/[locale]/items/[slug]`) paint faster.

The dominant symptom is a **blank / slow first paint** in both dev and prod.
Root cause: the server component `await`s the "similar items" computation —
which scans and scores the **entire** catalogue via `fetchItems` — *before*
returning any HTML, even though that carousel sits at the very bottom of the
page. So the hero, body content, and sidebar all wait on below-the-fold work.

This spec:

- **(a) Streams the similar-items carousel** behind its own Suspense boundary
  (React 19 `use()` + a server-created promise) so the page's first paint no
  longer blocks on the catalogue scan. This is the primary fix for blank first
  paint and helps dev the most (where content caching is disabled).
- **(b) Persists** the similar-items computation in Next's Data Cache
  (`getCachedSimilarItems`) instead of a per-process in-memory map, so the work
  survives serverless cold starts and is shared across instances.
- **(c)** Runs the page's two independent loads (item + translations)
  concurrently with `Promise.all`.
- **(d) Optimistic Statistics card on vote.** The sidebar Statistics card used
  to fetch activity once on mount, so an upvote never updated its "Upvotes"
  total or today's sparkline point until a full reload. The card now lives in
  React Query under the shared `[ITEM_ACTIVITY_QUERY_KEY, slug, days]` cache,
  and `useItemVote.onMutate` patches that cache with the same signed delta it
  applies to the vote count — both numbers move on the same frame as the
  button. Errors roll back the snapshotted cache alongside the vote cache.

All changes preserve the rendered output — same markup, same items, same
ordering. The carousel now appears a beat after the main content (with a
skeleton placeholder) instead of holding back the whole page.

## 2. Motivation

- The item-detail page renders a "Similar items" rail. It is produced by
  `fetchSimilarItems(meta, …)`, which loads **every** item's metadata via
  `fetchItems` and scores the whole catalogue against the current item.
- `fetchSimilarItems`'s only cache was a module-level in-memory `Map`
  (`similarityCache`). Module memory is **per-process**: it is empty on every
  serverless cold start and is **not shared across pods/instances**. So each
  fresh instance paid the full all-items scan the first time it served any
  item — exactly the case ISR revalidation and autoscaling hit most.
- On the page itself, `getCachedItem`, `getTranslations`, and the similar-items
  load ran **serially**. `getCachedItem` (git-CMS filesystem read) and
  `getTranslations` (next-intl message load) are independent and can overlap.
- Primary users affected: every visitor of an item page, and crawlers (which
  hit many distinct slugs and therefore many cold similarity computations).

## 3. Goals

- First paint of the hero + body content + sidebar no longer blocks on the
  similar-items catalogue scan; the carousel streams in behind a Suspense
  boundary with a skeleton placeholder.
- Similar-items results survive serverless cold starts and are shared across
  instances, via `unstable_cache` (the persisted Data Cache).
- The page's two independent loads (item + translations) run concurrently.
- No change to the final rendered output, ordering, or similarity scoring
  (only the *timing* of the carousel changes — it arrives a beat later).
- Cache invalidation reuses the existing item tags so current revalidation
  hooks (`revalidateTag('content' | 'items' | 'item:<slug>')`) keep working.

## 4. Non-Goals

- No change to the similarity algorithm or scoring weights.
- No change to `fetchItems` / `fetchItem` loading internals.
- No removal of the existing in-memory `similarityCache` — it stays as the
  fallback for any direct `fetchSimilarItems` caller and for dev mode.
- No UI/markup changes to the page.

## 5. User Stories

```text
As a visitor landing on an item page from search, I want it to render quickly
even if I'm the first to hit a freshly-scaled instance, so that I don't wait on
a full catalogue scan.

As a fork maintainer running on serverless, I want the similar-items rail to
reuse cached work across instances, so that cold starts don't re-scan content.
```

## 6. Acceptance Criteria

- [ ] AC-1: A new `getCachedSimilarItems(item, maxResults, options)` exists in
      `lib/content.ts`, wrapping `fetchSimilarItems` in `unstable_cache` keyed by
      `['similar-items', slug, locale, maxResults]` and pinned to the content
      revision.
- [ ] AC-2: It is tagged `[CONTENT, ITEMS, ITEM(slug)]` so existing
      revalidation invalidates it.
- [ ] AC-3: When `CONTENT_CACHE_ENABLED` is false (dev) or the item has no slug,
      it delegates directly to `fetchSimilarItems` (no behaviour change in dev).
- [ ] AC-4: `app/[locale]/items/[slug]/page.tsx` loads the item and translations
      with `Promise.all`, and passes the similar-items as a **promise**
      (`similarItemsPromise`) to the client tree without awaiting it on the
      render path.
- [ ] AC-5: The "Similar Products" carousel is wrapped in its own `<Suspense>`
      boundary inside `item-detail.tsx`; the rest of the page renders without
      waiting for it. An empty result still omits the section.
- [ ] AC-6: The final rendered markup and the set/order of similar items are
      unchanged for a given content revision.
- [ ] AC-7: `ItemStatsSection` reads its activity payload via React Query
      under `[ITEM_ACTIVITY_QUERY_KEY, slug, days]`. The literal key string is
      exported once and re-used by mutators.
- [ ] AC-8: After an upvote toggle, the Statistics "Upvotes" total and the
      last point of the sparkline update on the same frame as the vote button
      (no waiting for a network round-trip). On vote-mutation error, both the
      vote count and the activity cache are restored from snapshots without a
      refetch flicker.
- [ ] AC-9: `pnpm lint` and `pnpm tsc --noEmit` pass.

## 7. Out-of-Scope Considerations

- A lighter-weight "similarity index" that avoids loading full item metadata
  could further cut the cold cost; deferred — the persisted cache removes the
  repeated cost, which is the dominant problem today.
- Precomputing similar items at content-sync time (write-through) is a larger
  change to the sync subsystem; deferred.

## 8. UX Notes

None — output is byte-for-byte identical for a given content revision.

## 9. Related

- `docs/performance/content-loading.md` — `fetchItems` loading model and the
  in-flight de-dup / fd-budget context.
- Spec 019 (`019-cdn-cacheable-i18n`) and Spec 025
  (`025-item-detail-stats-carousel`) — adjacent item-detail work.
