---
id: spec-025-item-detail-stats-carousel
title: 'Spec 025 — Item Detail: Similar Products carousel + Statistics block'
sidebar_label: '025 Item Stats + Carousel'
---

# Feature spec — `025-item-detail-stats-carousel`

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

Spec 025 swaps that arrangement:

1. **Similar Products move out of the sidebar** into a **full-width
   horizontal carousel** below the two-column grid, matching the
   recommended-items carousel already used on `/favorites` (prev/next
   buttons, dot indicators, gradient edge overlays, ResizeObserver-based
   responsive item count).
2. **A new compact `<ItemStatsSection>` card** lives in the sidebar
   slot the Similar Products list used to occupy. Six tight
   `text-[11px]` rows (Views / Upvotes / Favorites / Comments /
   Avg. rating / Listed) plus a small inline sparkline below the
   rows. The four chartable rows (Views, Upvotes, Favorites,
   Comments) are clickable — selecting one highlights it with the
   deployment's `theme-primary` tokens and re-plots the sparkline
   from that metric. Rating and Listed are static rows. Default
   selection is Views.

The carousel logic is extracted into a reusable `<ItemsCarousel>`
component under `apps/web/components/shared/` so any future surface
that needs the same horizontal scroller can drop it in without
re-deriving the scroll math.

A small endpoint `GET /api/items/[slug]/activity?days=N` powers the
sidebar card: it returns `{ totals, series[] }` — totals reuse the
existing `getEngagementMetricsPerItem`, and a new
`getItemActivityTimeSeries(slug, days)` in `engagement.queries.ts`
aggregates `item_views`, `votes`, `favorites`, and `comments` into
daily buckets for the last N days (clamped 1–90, default 30),
filling missing days with zeros so the sparkline needs no gap
handling.

## 2. Motivation

- The sidebar Similar Products list buries discovery: items render in a
  narrow column at the very bottom of a long page, beneath promo codes,
  sponsor ads, categories, and tags. Most users never reach it.
- The detail page never surfaced engagement metrics. Totals exist in
  the DB and are used to drive listing-side popularity sort (Spec 016),
  but the item page itself signals nothing about how popular or
  alive an item is.
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
- Server-side rendering of the stats payload. The card fetches
  `/api/items/[slug]/activity` on mount; SSR-prefetching is a
  separate optimization.
- A standalone full-width "Activity Overview" panel. An earlier
  iteration tried that layout but it was rolled back at the user's
  request — the engagement data lives in the sidebar Statistics
  card now, with a small inline sparkline rather than a hero-sized
  chart.
- Multi-series overlay or stacked sparkline. The chart shows one
  metric at a time — the user picks via the rows. Layered charts
  would require a chart library and are out of scope.

## 4. Acceptance criteria

- **AC-1:** On `/items/[slug]`, when `meta.allItems` is non-empty, a
  full-width "Similar Products" carousel renders below the two-column
  grid. The carousel exposes prev/next buttons (hidden when at the
  start/end), dot indicators, and left/right gradient overlays — same
  affordances as `/favorites`.
- **AC-2:** The number of visible cards adjusts to the container width
  (320px card + 12px gap), recomputed on resize via `ResizeObserver`.
- **AC-3:** The old vertical sidebar Similar Products block is
  removed. The sidebar instead renders an `<ItemStatsSection>` card
  titled "Statistics" (i18n key `itemDetail.STATISTICS`) directly
  below the Tags card.
- **AC-4:** `<ItemStatsSection>` shows five rows — Views, Upvotes,
  Favorites, Comments, Avg. rating — sourced from the new
  `/api/items/[slug]/activity` endpoint. Each row shows an en-dash
  placeholder until the fetch resolves. A sixth row "Listed N
  {days|months|years} ago" renders when `meta.updated_at` is
  present, computed locally via `Intl.RelativeTimeFormat`. Rows use
  `text-[11px]` for both label and value with `w-3 h-3` icons so the
  card matches the rest of the sidebar's compact density.
- **AC-5:** Clicking any of the four chartable rows (Views, Upvotes,
  Favorites, Comments) highlights that row with a
  `theme-primary` background-tint + text colour and re-plots the
  sparkline below the rows to show that metric over the last 30
  days. Rating and Listed rows are non-clickable. Default selection
  is Views.
- **AC-6:** The sparkline renders as an inline SVG (no chart
  library) below the row list, separated by a faint top border. It
  uses a `theme-primary-500` area fill at low opacity with a
  `theme-primary-600` stroke. ~14 row-heights tall so the whole card
  stays compact.
- **AC-7:** New endpoint `GET /api/items/[slug]/activity?days=N`
  responds with `{ totals: ItemEngagementMetrics, series:
  ItemActivityDay[] }`. `days` is clamped to 1–90 (default 30). When
  `DATABASE_URL` is missing, returns zeros (consistent with
  `/api/items/engagement`).
- **AC-8:** All nine new strings (`SIMILAR_PRODUCTS`,
  `SIMILAR_PRODUCTS_DESCRIPTION`, `STATISTICS`, `STATS_VIEWS`,
  `STATS_VOTES`, `STATS_FAVORITES`, `STATS_COMMENTS`,
  `STATS_AVG_RATING`, `STATS_AGE`) live under `itemDetail.*` in all 21
  supported locale files.
- **AC-9:** `pnpm lint` and `pnpm tsc --noEmit` pass for `@ever-works/web`.

## 5. Open questions

- Should the carousel be reused on `/favorites` in this PR? Default:
  **no**, defer to a follow-up to keep the diff focused.
- Should the stats card include the "popularity rank" derived from the
  engagement score? Default: **no** — popularity rank requires a
  cross-item query the engagement API does not yet expose.
- Should the `similar-items-section.tsx` file be deleted now that
  nothing imports it? Default: **leave it**, per the project's
  no-removal-without-confirmation convention.
