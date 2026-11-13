---
id: spec-057-item-aggregate-rating
title: Spec 057 — Item page aggregate rating in structured data
sidebar_label: 057 Item aggregate rating
---

# Feature spec — `057-item-aggregate-rating`

> **Status:** in-progress (shipped in code; the live check T-004 is open) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

## 1. Summary

An item page whose listing has reviews adds an `aggregateRating` (mean of the
1-5 ratings, count of reviews) to its `Product` JSON-LD, so search engines can
show review stars for the listing. A listing with no valid rating adds nothing.

## 2. Motivation

Visitors rate items in the comments section and the page shows the average, but
the page's structured data carried no rating, so listings could not earn star
snippets in search results. Listing sites that rank well show them.

## 3. Requirements

- **R1.** The rating comes from the item's non-deleted comments of accounts that are not deactivated, the same
  rows the page already loads for the comments section: no extra database query.
  The visible rating (`GET /api/items/{slug}/comments/rating`) counts the same rows
  (reviewers that are not deactivated, ratings 1-5), so the page and the markup count the same ratings
  (same `reviewCount`). The badge shows the unrounded average as stars; the markup
  rounds it to one decimal (R3), so the two can differ by at most 0.05.
- **R2.** Only ratings that are finite numbers from 1 to 5 count. The `comments.rating`
  column defaults to 0 and the API refuses anything outside 1-5, so a stray 0 never
  lowers the published mean.
- **R3.** `ratingValue` is the mean rounded to one decimal; `reviewCount` is the number
  of counted ratings; `bestRating` is 5 and `worstRating` is 1.
- **R4.** With no valid rating (no reviews, ratings feature off, database unavailable)
  the `Product` schema has no `aggregateRating` key. "Ratings feature off" follows the
  rating badge: the server flag (`getFeatureFlags().ratings`) when the page renders, and
  in the browser the viewer's flags from `useFeatureFlagsWithSimulation()`, so database
  simulation set to `disabled` drops the markup with the badge once the flags have loaded.
  While they load (server render, hydration) the server's answer stands; simulation is a
  per-browser setting, so the HTML search engines fetch is not affected by it.
- **R5.** No new route, setting, dependency or outbound call.

## 4. Out of scope

- Individual `Review` nodes (needs the reviewer's name and a policy on publishing it).
- `aggregateRating` on category or collection pages.
