---
id: plan-057-item-aggregate-rating
title: Plan 057 — Item page aggregate rating in structured data
sidebar_label: 057 Plan
---

# Plan — `057-item-aggregate-rating`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

- `apps/web/lib/seo/aggregate-rating.ts` (no imports): `summarizeRatings(ratings)` keeps
  finite values in 1-5 and returns `{ ratingValue, reviewCount }` or `null`;
  `buildAggregateRatingSchema(summary)` re-validates and returns the Schema.org node or `null`.
- `generateProductSchema` (`lib/seo/schema.ts`) takes an optional `rating` and adds
  `aggregateRating` only when the node is non-null.
- The item page (`app/[locale]/items/[slug]/page.tsx`) already prefetches the comments
  into the query client; it reads that cached list, summarises the ratings on the server
  and passes `rating` through `ItemDetailWrapper` to `ItemDetail`.

The page is ISR (`revalidate = 600`), so the markup can trail a new review by up to ten minutes.

## Constitution Check

- **Plugin-first:** core SEO output of an existing page; no new surface, so no slot.
- **No new dependency, no removal:** met.
- **Performance:** no extra query; the summary is a single pass over rows already loaded.
