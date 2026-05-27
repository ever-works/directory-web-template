---
id: spec-037
title: Item detail page performance — persisted similar-items cache
sidebar_label: 037 Item detail perf
---

# Feature spec — `037-item-detail-perf`

## 1. Summary

Make the public item-detail page (`/[locale]/items/[slug]`) faster on cold
paths by (a) persisting the "similar items" computation in Next's Data Cache
instead of a per-process in-memory map, and (b) running the two independent
data loads on the page concurrently. Both changes are transparent to the
rendered output — same markup, same items, same ordering — they only remove
redundant work on cache-cold and cross-instance renders.

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

- Similar-items results survive serverless cold starts and are shared across
  instances, via `unstable_cache` (the persisted Data Cache).
- The page's two independent loads (item + translations) run concurrently.
- Zero change to rendered output, ordering, or similarity scoring.
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
      with `Promise.all`, then computes similar items via `getCachedSimilarItems`.
- [ ] AC-5: Rendered markup and the set/order of similar items are unchanged for
      a given content revision.
- [ ] AC-6: `pnpm lint` and `pnpm tsc --noEmit` pass.

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
