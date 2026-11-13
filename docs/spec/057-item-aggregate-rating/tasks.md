---
id: tasks-057-item-aggregate-rating
title: Tasks 057 — Item page aggregate rating in structured data
sidebar_label: 057 Tasks
---

# Tasks — `057-item-aggregate-rating`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/seo/aggregate-rating.ts`: `summarizeRatings` and
  `buildAggregateRatingSchema`. Verify: unit spec below.
- [x] **T-002** `generateProductSchema` accepts `rating` and emits `aggregateRating` only when publishable.
- [x] **T-003** Item page summarises the prefetched comments and passes `rating` to `ItemDetail`.
- [x] **T-004a** `apps/web/lib/seo/__tests__/aggregate-rating.spec.ts` (unit, `test:unit`): mean, rounding,
  ignored 0 / out-of-range / non-numbers, schema shape, unpublishable summaries.
- [x] **T-003a** `rating` is forwarded `ItemDetailWrapper` -> `ItemDetail` -> `ItemDetailContent`; the rating
  route counts only active reviewers and ratings 1-5, like the JSON-LD. Verify:
  `apps/web/lib/seo/__tests__/product-schema-rating.spec.ts` (summary -> `aggregateRating`, none otherwise) and
  `apps/web/lib/seo/__tests__/item-rating-wiring.spec.ts` (the forwarding chain, and the rating route's joins and
  filters against `getCommentsByItemId` + `MIN_RATING` / `MAX_RATING`).
- [x] **T-003b** No `aggregateRating` while the ratings feature is off (R4): `ratingWhenEnabled` on the server
  (`getFeatureFlags().ratings`) and in `ItemDetailContent` (simulation-aware flags). Verify: the two specs above.
- [ ] **T-004** Live check on a listing with reviews: the page's `Product` JSON-LD has `aggregateRating`
  and a listing without reviews has none; run the result through a rich-results validator.
- [ ] **T-005** Playwright spec with seeded reviews (needs a seeded database in the e2e environment).
