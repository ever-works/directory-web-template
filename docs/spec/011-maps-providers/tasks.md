---
id: tasks-011-maps-providers
title: 'Tasks 011 — Maps Providers'
sidebar_label: '011 Maps Tasks'
---

# Tasks — `011-maps-providers`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Provider-agnostic maps API

- Files: `apps/web/lib/maps/{types,index,registry}.ts`,
  `apps/web/components/maps/**`.
- Verification: typecheck passes; consumer code imports from
  `lib/maps/`.

### T-002 [done] — Google Maps provider

- Files: `apps/web/lib/maps/google/**`.
- Verification: an item with coordinates renders a marker.

### T-003 [done] — Marker clustering

- Files: `apps/web/lib/maps/google/cluster.tsx`.
- Verification: ≥ 100 markers cluster instead of swamping the canvas.

### T-004 [P] — Maps e2e spec (closes 010 AC-7)

- Files: `apps/web-e2e/tests/public/maps.spec.ts`.
- Steps:
  1. Visit an item detail page known to have coordinates.
  2. Assert the map container renders and at least one marker is in the
     DOM.
  3. `test.skip()` gracefully when `GOOGLE_MAPS_API_KEY` is not set.
- Verification: spec passes locally with the env var set.

### T-005 [seq] — Define `MapsProvider` interface in plugin SDK

- Files: `packages/plugin-sdk/src/maps.ts`.
- Verification: typecheck passes; the runtime registry consumes the
  interface.

### T-006 [seq] — Migrate Google provider to plugin

- Files: `packages/plugin-maps-google/**`.
- Verification: removing the package disables the maps surface without
  code changes.

### T-007 [seq] — Mapbox / MapLibre adapter

- Files: `packages/plugin-maps-{mapbox,maplibre}/**` (future).
- Verification: alternative provider can be enabled in admin and renders
  the same item markers.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-001               |
| AC-2  | T-002               |
| AC-3  | T-003               |
| AC-4  | T-001, T-002        |
| AC-5  | T-004               |

## Notes

- Keep clusters opt-in per route: clustering is overkill for a single
  marker on item-detail pages.
