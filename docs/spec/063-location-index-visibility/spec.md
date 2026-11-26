---
id: spec-063-location-index-visibility
title: Spec 063 — Only approved items in the public location index
sidebar_label: 063 Location index visibility
---

# Feature spec — `063-location-index-visibility`

> **Status:** shipped (T-2840, PR #1206) · **Code:** `apps/web/lib/utils/location-indexable.ts`,
> `apps/web/lib/services/location/location-index.service.ts`, `apps/web/lib/services/item-git.service.ts`,
> `apps/web/app/api/admin/items/[id]/review/route.ts`

## 1. Summary

The location index (`item_location_index`) holds only items the public may see: approved, not
soft-deleted, with location data. Draft, pending and rejected items are never indexed, a review or a
status change adds or removes the item's row, and every rebuild drops rows left from before.

## 2. Motivation

- `GET /api/location/coordinates`, `/api/location/search`, `/api/location/cities` and
  `/api/location/countries` need no sign-in (`proxy.ts` guards only `/api/admin`) and answer from the
  index. The coordinates route returns slug, latitude, longitude, city and country for every row.
- The index has no status column. `LocationIndexService.indexItem` checked only that an item had a
  location, and `rebuildIndex` (admin rebuild and every content sync) indexed every item from
  `itemRepository.findAll()` with a location. A new item is a draft by default (or pending when a client
  submits it) and is indexed on create, and a review never touched the index.
- So with location features on, an anonymous request returned the slugs and exact coordinates of draft,
  pending and rejected items: addresses their submitters had not published. A reviewer's anonymous
  probe found draft slugs.

## 3. Requirements

- **R1.** One pure helper, `isLocationIndexable(item)`, is true only when `item.status` is exactly
  `approved`, `deleted_at` is not set and the item has location data (remote-only included).
- **R2.** `indexItem`, `prepareLocationEntry` and `rebuildIndex` use it. `indexItem` removes the row of an
  item that is not indexable instead of writing one; `rebuildIndex` clears the index and indexes only the
  items the helper keeps, counting the others as skipped.
- **R3.** Every status change updates the index: `ItemGitService.reviewItem` (single and bulk review),
  `POST /api/admin/items/{id}/review` (awaited before it answers) and `updateItem` (it already re-indexes
  every located item, and `indexItem` now follows the status). The git service's index sync no longer
  skips an item without a location, so `indexItem` is the one rule.
- **R4.** The four public routes return only approved items. Rows written for other items before this
  change are gone after the next rebuild; the content sync rebuilds on its first run after a start.
- **R5.** The query side and the table are unchanged: no status column, no migration.

## 4. Non-goals

- Filtering at query time by joining the index with item status (Q-063a).
- Making the location routes require a sign-in; approved items are public by design.

## 5. Acceptance

- `apps/web/lib/utils/__tests__/location-indexable.spec.ts` (`pnpm --filter @ever-works/web test:unit`):
  the helper's truth table, the rebuild filter, and the wiring in the service, the git service and the
  review route.
- `apps/web-e2e/tests/api/location-index-unpublished.spec.ts`: one item per status; an anonymous context
  sees only the approved one in coordinates, radius, city and country search, cities and countries; a
  rejection, an approval and a `PUT` back to draft move items out of and into the index. It skips when the
  location feature is off (the CI content stub).

See [plan](./plan.md) and [tasks](./tasks.md).
