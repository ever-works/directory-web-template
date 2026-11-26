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
  `indexItem` decides. The route logs an error, with the rebuild as the repair, when the index could
  not be updated (`IndexItemResult.removed` tells a completed removal from a failed one).
- **Write order (R3).** The git service's sync is not awaited, so an approval's write could wait for a
  slow geocode and land after a later rejection had removed the row. `apps/web/lib/utils/keyed-serial-queue.ts`
  runs `indexItem` and `removeFromIndex` one at a time per slug, in call order, in the service singleton.
- **Existing rows (R4).** No migration: the content sync rebuilds on its first run after a deploy
  (`lastIndexedRevision` starts empty), and the admin rebuild (`POST /api/admin/location-index`) does it
  on demand.

## Constitution check

- Article III (spec first): this spec, plan and tasks, the index row and a `docs/log.md` line.
- Article V (performance): one extra `DELETE` by primary key when a non-public item is indexed; rebuilds
  index fewer rows.
- Article VIII (no removal): no route, table or field is removed.

## Risks

The per-slug queue orders the calls, not the item states they carry. Each write uses the item snapshot
its caller passed, so a row of a rejected item can still be restored until the next rebuild (or the
next status change) in these cases:

- **Another server instance.** The queue is per instance. An approval's slow geocode on one instance can
  land after a rejection on another.
- **A late call with an older snapshot.** The review route queues its own `indexItem` after the audit log
  is written. If that stalls while another admin rejects the item, the approval's call can arrive after
  the rejection's calls. The git service's own call can arrive late the same way when its commit and push
  finish after a later review.
- **A rebuild running at the same time.** `rebuildIndex` writes batches from the item list it read at
  the start and does not go through the queue, so a rejection made during a rebuild can be undone by it.

Each one needs two opposite decisions on the same item within seconds. The next rebuild (every content
sync after a new commit) removes the row. Closing them for good needs the status at read time: the
query-time filter of Q-063a, or a status column in the index.
