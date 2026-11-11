---
id: tasks-056-item-aggregate-rating
title: Tasks 056 — Item page aggregate rating in structured data
sidebar_label: 056 Tasks
---

# Tasks — `056-item-aggregate-rating`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/seo/aggregate-rating.ts`: `summarizeRatings` and
  `buildAggregateRatingSchema`. Verify: unit spec below.
- [x] **T-002** `generateProductSchema` accepts `rating` and emits `aggregateRating` only when publishable.
- [x] **T-003** Item page summarises the prefetched comments and passes `rating` to `ItemDetail`.
- [x] **T-004a** `apps/web/lib/seo/__tests__/aggregate-rating.spec.ts` (unit, `test:unit`): mean, rounding,
  ignored 0 / out-of-range / non-numbers, schema shape, unpublishable summaries.
- [ ] **T-004** Live check on a listing with reviews: the page's `Product` JSON-LD has `aggregateRating`
  and a listing without reviews has none; run the result through a rich-results validator.
- [ ] **T-005** Playwright spec with seeded reviews (needs a seeded database in the e2e environment).
