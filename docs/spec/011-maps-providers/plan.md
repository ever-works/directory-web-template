---
id: plan-011-maps-providers
title: 'Plan 011 — Maps Providers'
sidebar_label: '011 Maps Plan'
---

# Implementation Plan — `011-maps-providers`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Retroactive. Default Google Maps provider with marker
> clustering is shipped (PR #544); the `MapsProvider` abstraction is
> ready to migrate to a plugin.

## 1. High-Level Approach

`apps/web/lib/maps/` exposes a small provider-agnostic surface
(`MapView`, `Marker`, `Cluster`, `useMapsProvider()`). The Google Maps
implementation lives behind that surface, loaded lazily via
`@googlemaps/js-api-loader`. Marker clustering uses
`@googlemaps/markerclusterer`. Items with `latitude` / `longitude`
display markers; items without lat/lng are excluded gracefully.

The forward direction is `packages/plugin-maps-google/` and additional
providers (`plugin-maps-mapbox/`, `plugin-maps-maplibre/`) registering
through the SDK once spec 002 ships.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Page[Listing / Item Detail] --> Hook[useMapsProvider()]
  Hook --> Reg[MapsProvider registry]
  Reg --> Google[GoogleMapsProvider]
  subgraph Future
    Mapbox[plugin-maps-mapbox]
    MapLibre[plugin-maps-maplibre]
  end
  Google -. "implements" .-> Iface[MapsProvider iface]
  Mapbox -. "future" .-> Iface
  MapLibre -. "future" .-> Iface
```

## 3. Affected Packages & Files

| Path                                              | Change      | Notes                                          |
| ------------------------------------------------- | ----------- | ---------------------------------------------- |
| `apps/web/lib/maps/**`                            | maintain    | Provider-agnostic API + Google impl.           |
| `apps/web/components/maps/**`                     | maintain    | `MapView`, `Marker`, `Cluster`.                |
| `apps/web/lib/db/schema/items.ts`                 | maintain    | `latitude` / `longitude` columns.              |
| `apps/web-e2e/tests/public/maps.spec.ts`          | **future**  | Per spec 010 AC-7.                             |
| `packages/plugin-maps-google/`                    | future      | Migration target.                              |
| `packages/plugin-maps-mapbox/`                    | future      | Optional adapter.                              |
| `docs/integrations/maps.md`                       | maintain    | Operator docs.                                 |
| `docs/spec/011-maps-providers/{plan,tasks}.md`    | **this PR** | Catch up Spec Kit artefacts.                   |

## 4. Public API / Plugin Manifest

```ts
// packages/plugin-sdk/src/maps.ts
export interface MapsProvider {
  id: string;
  loadScript(): Promise<void>;
  Map: React.ComponentType<MapProps>;
  Marker: React.ComponentType<MarkerProps>;
  Cluster: React.ComponentType<ClusterProps>;
}
```

## 5. Data Model

- `items.latitude` / `items.longitude` (existing).

## 6. UX & A11y Plan

- Map placeholder during async load.
- a11y fallback: a list of locations linked from each marker.
- Keyboard reachable info windows.

## 7. Performance Plan

- Lazy-load provider scripts only on routes that render a map.
- Cluster ≥ 100 markers to keep render snappy.
- Prefetch the script when a map is likely (item-detail link on hover).

## 8. Security Plan

- API keys are public by Google's design but should be referrer-locked
  in the Google Cloud console; documented in `docs/integrations/maps.md`.
- Server-side key never used in browser.

## 9. Test Plan

- E2E: add `tests/public/maps.spec.ts` (per spec 010 AC-7) with a
  graceful skip when `GOOGLE_MAPS_API_KEY` is absent.
- Manual: navigate to an item with coordinates; verify the marker.

## 10. Rollout & Migration Plan

- Retroactive plan; further providers land per their plugins.

## 11. Constitution Check

- [x] **I — Plugin-First** — migration path documented.
- [x] **II — TypeScript Everywhere** — TS throughout.
- [x] **III — Spec Before Code** — spec exists.
- [x] **IV — Documentation First-Class** — `docs/integrations/maps.md`.
- [x] **V — Performance Budget** — lazy load + clustering.
- [x] **VI — Latest Stable Frameworks** — Google Maps SDK on latest.
- [x] **VII — Reuse Before Build** — Google libraries reused.
- [x] **VIII — No Removal Without Migration** — additive.
- [x] **IX — Test Coverage Bar** — e2e gap to be closed.
- [x] **X — Modular Packages** — future plugin packages outlined.

## 12. Complexity Tracking

None.

## 13. Open Questions

None blocking.

## 14. References

- Spec: `./spec.md`
- PR #544.
- Constitution Articles: I, IV, V, VII, IX.
