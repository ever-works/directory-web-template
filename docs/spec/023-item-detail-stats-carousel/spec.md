---
id: spec-023-item-detail-stats-carousel
title: 'Spec 023 — Item Detail: Similar Products carousel + Statistics block'
sidebar_label: '023 Item Stats + Carousel'
---

# Feature spec — `023-item-detail-stats-carousel`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code), IX (Test Coverage Bar — Definition of Done).

## 1. Summary

On `/items/[slug]`, the right-hand sidebar today ends with a vertical
"Similar Products" stack rendered by `SimilarItemsSection`. The block
shares the narrow sidebar column (lg:w-1/3, or ~25% on fluid layouts)
with metadata cards, so each similar item is squeezed into a single
classic row — visually dense and easy to miss.

Spec 023 swaps that arrangement:

1. **Similar Products move out of the sidebar** into a **full-width
   horizontal carousel** below the two-column grid, matching the
   recommended-items carousel already used on `/favorites` (prev/next
   buttons, dot indicators, gradient edge overlays, ResizeObserver-based
   responsive item count).
2. **The freed sidebar slot** now hosts a new **"Statistics"** card
   showing engagement metrics for the current item: views, upvotes,
   favorites, comments, average rating, and a relative "Listed N days
   ago" timestamp.

The carousel logic is extracted into a reusable
`<ItemsCarousel>` component under `apps/web/components/shared/` so any
future surface that needs the same horizontal scroller can drop it in
without re-deriving the scroll math.

## 2. Motivation

- The sidebar Similar Products list buries discovery: items render in a
  narrow column at the very bottom of a long page, beneath promo codes,
  sponsor ads, categories, and tags. Most users never reach it.
- The right column had no engagement-statistics surface at all. Total
  views, vote count, favorite count, and comment count are tracked
  per-item (Spec 016 + engagement queries) and surfaced in listings, but
  nowhere on the detail page itself — so the page does not signal
  "this is popular / this is fresh / this has a community" the way
  card surfaces already do.
- The favorites page already ships a polished horizontal carousel for
  the "Recommended" section. Reusing the same UX on item detail keeps
  the discovery pattern consistent and avoids inventing a second
  carousel.

## 3. Out of scope

- Migrating `/favorites` itself to the extracted `<ItemsCarousel>`
  component (the favorites page keeps its inline implementation in
  this PR; the shared component is byte-compatible and the migration
  can land as a separate cleanup PR).
- Deleting `similar-items-section.tsx`. The component is no longer
  imported by the page but is left in place per the project's
  "no removal without confirmation" convention; a follow-up PR can
  remove it once the new layout has soaked.
- Server-side rendering of the engagement metrics. The
  `<ItemStatsSection>` fetches via the existing
  `/api/items/engagement` route on mount; SSR-prefetching is a
  separate optimization.

## 4. Acceptance criteria

- **AC-1:** On `/items/[slug]`, when `meta.allItems` is non-empty, a
  full-width "Similar Products" carousel renders below the two-column
  grid. The carousel exposes prev/next buttons (hidden when at the
  start/end), dot indicators, and left/right gradient overlays — same
  affordances as `/favorites`.
- **AC-2:** The number of visible cards adjusts to the container width
  (320px card + 12px gap), recomputed on resize via `ResizeObserver`.
- **AC-3:** The old sidebar Similar Products block is removed. The
  sidebar slot now renders an `<ItemStatsSection>` card titled
  "Statistics" (i18n key `itemDetail.STATISTICS`).
- **AC-4:** `<ItemStatsSection>` shows five rows — Views, Upvotes,
  Favorites, Comments, Avg. rating — sourced from
  `/api/items/engagement`. Each row shows an en-dash placeholder until
  the fetch resolves. A sixth row "Listed N {days|months|years} ago"
  renders when `meta.updated_at` is present, computed locally via
  `Intl.RelativeTimeFormat`.
- **AC-5:** All nine new strings (`SIMILAR_PRODUCTS`,
  `SIMILAR_PRODUCTS_DESCRIPTION`, `STATISTICS`, `STATS_VIEWS`,
  `STATS_VOTES`, `STATS_FAVORITES`, `STATS_COMMENTS`,
  `STATS_AVG_RATING`, `STATS_AGE`) live under `itemDetail.*` in all 21
  supported locale files.
- **AC-6:** `pnpm lint` and `pnpm tsc --noEmit` pass for `@ever-works/web`.

## 5. Open questions

- Should the carousel be reused on `/favorites` in this PR? Default:
  **no**, defer to a follow-up to keep the diff focused.
- Should the stats card include the "popularity rank" derived from the
  engagement score? Default: **no** — popularity rank requires a
  cross-item query the engagement API does not yet expose.
- Should the `similar-items-section.tsx` file be deleted now that
  nothing imports it? Default: **leave it**, per the project's
  no-removal-without-confirmation convention.
