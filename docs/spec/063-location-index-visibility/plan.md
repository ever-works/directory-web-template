---
id: plan-063-location-index-visibility
title: Plan 063 — Only approved items in the public location index
sidebar_label: 063 Plan
---

# Plan — `063-location-index-visibility`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

- **One rule (R1).** `apps/web/lib/utils/location-indexable.ts` exports `isLocationIndexable`, a type
  guard with no imports beyond the item types, so `tsx --test` can load it. Missing statuses are already
  read as `approved` by `ItemGitService.readItems`, so the exact match keeps every published item.
- **Write side only (R2, R5).** The index is the only place the four public routes read, so keeping
  non-public items out of it closes them all. `indexItem` calls `removeFromLocationIndex(slug)` for an item
  the helper rejects, which also clears a stale row when an approved item is rejected, moved back to
  draft or pending (a client edit of an approved item), or loses its location. `rebuildIndex` filters with
  the helper after `clearLocationIndex()`, so a rebuild leaves no row of an unpublished item.
- **Status changes (R3).** `reviewItem` now calls the git service's fire-and-forget index sync after it
  writes the new status, which covers the single review route and the bulk route. The review route also
  awaits `indexItem`, like the `PUT` and `POST` admin routes already do, so the index is current when the
  admin gets the answer. `indexLocationAsync` no longer returns early for an item without a location;
  `indexItem` decides.
- **Existing rows (R4).** No migration: the content sync rebuilds on its first run after a deploy
  (`lastIndexedRevision` starts empty), and the admin rebuild (`POST /api/admin/location-index`) does it
  on demand.

## Constitution check

- Article III (spec first): this spec, plan and tasks, the index row and a `docs/log.md` line.
- Article V (performance): one extra `DELETE` by primary key when a non-public item is indexed; rebuilds
  index fewer rows.
- Article VIII (no removal): no route, table or field is removed.

## Risks

- The git service sync is not awaited. A slow geocode started by an approval can still land after a
  quick rejection of the same item; the next rebuild removes that row. Items with coordinates are
  written at once, so this needs an address that must be geocoded.
