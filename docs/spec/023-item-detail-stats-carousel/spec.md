---
id: spec-023-item-detail-stats-carousel
title: 'Spec 023 — Item Detail: Activity Overview + Similar Products carousel'
sidebar_label: '023 Item Activity + Carousel'
---

# Feature spec — `023-item-detail-stats-carousel`

> **Status:** in-progress.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code), IX (Test Coverage Bar — Definition of Done).

## 1. Summary

On `/items/[slug]`, the right-hand sidebar today ends with a vertical
"Similar Products" stack rendered by `SimilarItemsSection`. The block
shares the narrow sidebar column (lg:w-1/3, or ~25% on fluid layouts)
with metadata cards, so each similar item is squeezed into a single
classic row — visually dense and easy to miss. The page also has no
engagement-statistics surface, so totals (views, votes, favorites,
comments, ratings) tracked by the database are invisible on detail.

Spec 023 reshapes the page into three full-width sections under the
existing two-column grid:

1. **Activity Overview** — a new full-width panel below the grid with
   six tiles (Views / Upvotes / Favorites / Comments / Avg. rating /
   Listed) and a daily sparkline driven by whichever chartable tile
   is selected. The active tile is highlighted using the deployment's
   `theme-primary` tokens so it adapts to whatever palette is
   configured.
2. **Similar Products** — moves out of the sidebar into a
   **full-width horizontal carousel**, matching the recommended-items
   UX already used on `/favorites` (prev/next buttons, dot indicators,
   gradient edge overlays, ResizeObserver-based responsive item count).
3. **No more sidebar stats card.** The first iteration of this spec
   shipped a compact stats card in the freed sidebar slot; the second
   iteration replaces that card with the full-width Activity Overview
   panel above. The sidebar keeps Information / Promo Code / Sponsor /
   Category / Tags as before.

The carousel logic is extracted into a reusable
`<ItemsCarousel>` component under `apps/web/components/shared/` so any
future surface that needs the same horizontal scroller can drop it in
without re-deriving the scroll math.

A new endpoint `/api/items/[slug]/activity` powers the panel: it
returns engagement totals plus a daily time-series for the last N days
(default 30, max 90), aggregated from `item_views`, `votes`,
`favorites`, and `comments`. The query lives in
`engagement.queries.ts` next to the existing per-item engagement
aggregator so they can share the tenant scoping.

## 2. Motivation

- The sidebar Similar Products list buries discovery: items render in a
  narrow column at the very bottom of a long page, beneath promo codes,
  sponsor ads, categories, and tags. Most users never reach it.
- The detail page never visualized engagement. Totals exist in the DB
  and are used to drive listing-side popularity sort (Spec 016), but
  the item page itself signals nothing about how popular / fresh /
  alive an item is. A small compact card was a first step; a
  full-width Activity Overview with a sparkline gives the same data
  much more weight and lets a reader see trend, not just totals.
- The favorites page already ships a polished horizontal carousel for
  the "Recommended" section. Reusing the same UX on item detail keeps
  the discovery pattern consistent and avoids inventing a second
  carousel.

## 3. Out of scope

- Migrating `/favorites` itself to the extracted `<ItemsCarousel>`
  component (the favorites page keeps its inline implementation in
  this PR; the shared component is byte-compatible and the migration
  can land as a separate cleanup PR).
- Deleting `similar-items-section.tsx` and `item-stats-section.tsx`.
  Both components are no longer imported by the page but are left in
  place per the project's "no removal without confirmation"
  convention; a follow-up PR can remove them once the new layout has
  soaked.
- Server-side rendering of the activity payload. The panel fetches
  `/api/items/[slug]/activity` on mount; SSR-prefetching is a separate
  optimization.
- Multi-series overlay or stacked sparkline. The chart shows one
  metric at a time — the user picks via the tiles. Layered charts
  would require a chart library and are out of scope for the first
  cut.

## 4. Acceptance criteria

- **AC-1:** On `/items/[slug]`, an "Activity Overview" full-width
  panel renders below the two-column grid. The panel has a 6-tile
  row (Views / Upvotes / Favorites / Comments / Rating / Listed) on
  `lg+`, collapsing to 3-up on `md` and 2-up on mobile.
- **AC-2:** Clicking any of the four chartable tiles (Views, Upvotes,
  Favorites, Comments) highlights that tile with a
  `theme-primary-500 → theme-primary-700` gradient background and
  updates the sparkline below to plot that metric over the last 30
  days. Rating and Listed tiles are static — non-clickable. Default
  selection is Views.
- **AC-3:** The sparkline renders as an inline SVG (no chart library)
  with y-axis tick labels, a faint baseline grid, an area fill in
  `theme-primary-500` at low opacity, and a `theme-primary-600`
  stroke. Three x-axis labels (first / middle / last day) are shown.
- **AC-4:** When `meta.allItems` is non-empty, a full-width "Similar
  Products" carousel renders below the Activity Overview panel.
  Carousel affordances match `/favorites`: prev/next buttons hidden
  at edges, dot indicators, left/right gradient overlays, card width
  320px + 12px gap, responsive count via `ResizeObserver`.
- **AC-5:** The old sidebar Similar Products block is removed and
  no replacement stats card lives in the sidebar — the sidebar
  contains only Information / Promo Code / Sponsor / Category /
  Tags, as before this spec.
- **AC-6:** New endpoint `GET /api/items/[slug]/activity?days=N`
  responds with `{ totals: ItemEngagementMetrics, series:
  ItemActivityDay[] }`. `days` is clamped to 1–90 (default 30). When
  `DATABASE_URL` is missing, returns zeros (consistent with
  `/api/items/engagement`).
- **AC-7:** All 11 new strings (`SIMILAR_PRODUCTS`,
  `SIMILAR_PRODUCTS_DESCRIPTION`, `ACTIVITY_OVERVIEW`,
  `ACTIVITY_OVERVIEW_DESCRIPTION`, `STATISTICS`, `STATS_VIEWS`,
  `STATS_VOTES`, `STATS_FAVORITES`, `STATS_COMMENTS`,
  `STATS_AVG_RATING`, `STATS_AGE`) live under `itemDetail.*` in all
  21 supported locale files.
- **AC-8:** `pnpm lint` and `pnpm tsc --noEmit` pass for
  `@ever-works/web`.

## 5. Open questions

- Should the time window be user-configurable (7 / 30 / 90 days)?
  Default: **no**, ship the 30-day window first and add a
  range-toggle in a follow-up if usage shows demand.
- Should the carousel be reused on `/favorites` in this PR? Default:
  **no**, defer to a follow-up to keep the diff focused.
- Should `item-stats-section.tsx` and `similar-items-section.tsx` be
  deleted now that nothing imports them? Default: **leave them**, per
  the project's no-removal-without-confirmation convention.
