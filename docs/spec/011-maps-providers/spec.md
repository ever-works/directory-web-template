---
id: spec-011-maps-providers
title: 'Spec 011 — Maps Providers'
sidebar_label: '011 Maps'
---

# Feature spec — `011-maps-providers`

> **Status:** Shipped (PR #544 — Map UI Components Library with provider
> abstraction). Retroactive spec.

## 1. Summary

A map UI library with a **provider abstraction** so directories that
have geo data can render markers, clusters, info windows, and
boundaries. The default provider is **Google Maps**; the abstraction
allows alternative providers (e.g. Mapbox, MapLibre) without changing
caller code.

## 2. Motivation

- Local-business directories and event directories require maps.
- Hard-coding Google Maps would lock out adopters who prefer
  open-source alternatives or have licence constraints.

## 3. Goals

- A `MapsProvider` interface and a registry hook
  (`useMapsProvider()`).
- Marker clustering for ≥ 100 markers.
- Server-rendered fallback for static maps where possible.
- API key configuration via env (never hard-coded).

## 4. Non-Goals

- Geocoding pipeline for items lacking coordinates (future spec).
- Routing / directions (future spec, plugin).

## 5. User Stories

```text
As an admin, I want item locations on a map so that visitors can browse
geographically.

As a fork maintainer, I want to swap Google Maps for Mapbox without
rewriting the listing page.
```

## 6. Acceptance Criteria

- [x] AC-1: `apps/web/lib/maps/` exposes a provider-agnostic API.
- [x] AC-2: Google Maps provider implemented via
  `@googlemaps/js-api-loader`.
- [x] AC-3: Marker clustering via `@googlemaps/markerclusterer` for
  large datasets.
- [x] AC-4: Components are tree-shakable and lazy-loaded.
- [ ] AC-5: E2E coverage for map render with at least one item.

## 7. Out-of-Scope Considerations

- Heat-map layers.
- Live tracking (real-time geo).

## 8. UX Notes

- Map placeholder shows during async load.
- a11y: provide a list-mode fallback.

## 9. Data & API Surface

- `Item` rows may carry `latitude` / `longitude` columns.
- A `MapsProvider` adapter interface lives in `lib/maps/types.ts` (will
  move into `@ever-works/plugin-sdk` per spec
  [`002`](../002-plugin-architecture/spec.md)).

## 10. Plugin / Adapter Impact

Migration target. Each provider becomes a plugin in
`packages/plugin-maps-<name>/`.

## 11. Risks & Open Questions

- **Risk:** Google Maps quota costs at scale. Mitigation: clustering and
  conservative re-render gating.

## 12. Acceptance Test Plan

- Add `apps/web-e2e/tests/public/maps.spec.ts` (gap, see Spec 010
  AC-7).

## 13. References

- PR #544 (initial implementation).
- Constitution Articles I (future), II, III, IV, V (perf).
