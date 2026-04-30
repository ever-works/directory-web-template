---
id: spec-017-map-view
title: 'Spec 017 — Map View for Listings'
sidebar_label: '017 Map View'
---

# Feature spec — `017-map-view`

> **Status:** Proposed.
>
> **Depends on:** [Spec 011 — Maps Providers](../011-maps-providers/spec.md)
> for the underlying provider abstraction (Mapbox / Google Maps), the
> geocoding service, and the `item_location_index` table.

## 1. Summary

End users browsing the directory can flip the listing into a full-screen
map view that renders every item with coordinates as a marker, paired
with a scrollable sidebar of the same items. Selecting a marker
highlights its sidebar card (and vice-versa), the map auto-fits to the
visible markers on first load, and clusters keep the canvas readable
when there are many items.

The map view is reachable from two places:

- the existing **view toggle** beside Cards / Grid / Masonry on every
  listing page, and
- a dedicated **Map** entry in the primary header navigation, which
  routes to `/map` and renders the map view full-bleed.

Both surfaces share the same React tree and data, so a directory's
operator only has to opt in once.

## 2. Motivation

- Local-business and travel directories are far easier to browse on a
  map than in a paginated grid. A full-screen map view is a
  table-stakes feature for those verticals.
- Spec 011 already shipped the provider abstraction, marker clustering,
  and the `LayoutMap` component, but two things hold the experience
  back today:
  1. There is no dedicated route, so deep-linking to "everything on a
     map" is impossible.
  2. The map and the listing are isolated — clicking a marker shows a
     popup, but the user cannot scan results in a sidebar the way
     Airbnb / Zillow / Google Maps trained them to.
- Without a navigation entry, operators have to teach visitors that the
  view exists. A first-class link in the header solves discovery.

Primary users:

- **End users** of a directory (local-business / travel / event
  verticals especially).
- **Directory operators** who toggle the feature on through `config.yml`.
- **Fork maintainers** who want the same UI to work with whichever
  maps provider they prefer.

## 3. Goals

- G-1: Add a **Map** view that renders item markers + a synchronised
  sidebar of cards, in a 70/30 split on desktop and a stacked layout
  on mobile.
- G-2: Add a **Map** entry to the primary header navigation. The entry
  is gated by a single boolean in `config.yml` and is hidden when
  location features are not enabled.
- G-3: Add a `/map` route (and per-locale variants) that renders the
  same view full-bleed without a hero, so it can be linked, shared,
  and indexed.
- G-4: When a user clicks a marker, scroll its card into view in the
  sidebar and visually highlight it. When the user clicks a card, pan
  the map to that marker and open its popup.
- G-5: Auto-fit the map bounds to the visible markers on first load,
  so visitors always see relevant pins instead of an arbitrary world
  view.
- G-6: Keep the existing `Cards` / `Grid` / `Masonry` view toggle
  working unchanged, with `Map` joining the toggle as a fourth option
  when the feature is enabled.
- G-7: Re-use the existing geocoding pipeline (Spec 011 + the
  `LocationIndexService`) so operators can specify either an
  `address` *or* explicit `latitude` / `longitude` per item in the
  YAML CMS, and coordinates are resolved automatically in the
  background.

## 4. Non-Goals

- Drawing isochrones, heat-maps, or routes between markers. These
  belong to a future plugin spec.
- Server-rendering the map tiles. The map remains client-rendered
  with a server-rendered fallback list (per Spec 011).
- Replacing the Map UI library: this spec uses the providers shipped
  in Spec 011 (Mapbox + Google) and does not introduce Leaflet as a
  third provider.
- Editing item locations from the map. Submission / editing flows are
  covered by the existing submit form and admin UI.

## 5. User Stories

```text
As a visitor on a local-business directory, I want to flip the listing
into a map so that I can see which results are close to me, so that I
can pick the closest one.

As a visitor, I want to click a sidebar card and have the map zoom to
that listing's location, so that I do not lose my place when I switch
between scanning and looking on the map.

As a directory operator, I want to enable the map view by toggling one
flag in config.yml so that I can ship it without writing code.

As a directory operator, I want addresses I enter in YAML to be
geocoded automatically, so that I do not have to look up latitudes and
longitudes by hand.

As a fork maintainer, I want the same view to work with my chosen maps
provider (Mapbox or Google) without rewriting components, so that I can
swap providers later without re-doing the UI work.
```

## 6. Acceptance Criteria

- [ ] AC-1: A `Map` button appears in the listing view toggle when
  `settings.location.enabled` is true and the active provider has a
  public API key configured. Clicking it shows the map layout.
- [ ] AC-2: A `Map` link appears in the primary header navigation when
  `settings.header.map_enabled` is true (and location features are
  enabled). The link routes to `/map` (with locale prefix). The link
  is hidden otherwise.
- [ ] AC-3: `/map` (and `/<locale>/map`) renders the map view
  full-bleed (no hero, full viewport height) and shows every item that
  has indexed coordinates. The page returns HTTP 200 and emits a
  `<title>` containing the directory name and the word *Map*.
- [ ] AC-4: On first load with at least one marker, the map fits its
  bounds to the visible markers (single marker → centre + zoom 12+).
- [ ] AC-5: Clicking a marker highlights and scrolls the matching
  sidebar card into view. Clicking a sidebar card pans the map to the
  marker and opens the marker popup.
- [ ] AC-6: Items with at least an `address` (no lat / lng) are
  resolved to coordinates by the existing geocoding service before
  they appear in the index, and they show on the map after the
  background sync completes.
- [ ] AC-7: When zero items have coordinates, the page renders an
  informative empty state and does not crash. When location features
  are entirely disabled, `/map` returns 404 and the header link is
  hidden.
- [ ] AC-8: The map view passes basic accessibility checks: every
  marker click has a keyboard equivalent (the sidebar cards), the
  sidebar list is exposed as a `<nav>` / `<ul>` so screen-reader users
  can scan items without using the map, and the layout meets WCAG 2.2
  AA contrast on light and dark themes.
- [ ] AC-9: Public-page first-load JS for `/map` stays inside the
  monorepo's 250 KB gzip budget, with provider scripts loaded lazily
  on mount.
- [ ] AC-10: Playwright e2e coverage:
  - the toggle in the listing surfaces the `Map` button when the
    feature is enabled,
  - the `/map` route renders the page with markers,
  - the `Map` header link is visible when enabled and hidden when
    disabled.

## 7. Out-of-Scope Considerations

- Drawing service-area polygons. Coverage areas are stored on the
  item already; rendering them is a future spec.
- A Leaflet-on-OpenStreetMap third provider. The current providers
  cover the common cases; OpenStreetMap support can ship as a future
  `plugin-maps-maplibre` package when Spec 002's plugin SDK lands.
- Persisted user preferences ("always open in map mode"). The view
  preference lives in the existing `LayoutThemeContext` and is
  client-only; cross-device persistence belongs in a separate spec.
- Map embedding on the item-detail page is already handled by Spec 011
  and is not changed here.

## 8. UX Notes

- **Desktop layout (≥ 1024 px):** sidebar (~30 % width, min 360 px) on
  the left scrolls vertically; map fills the rest of the viewport
  (height = `calc(100vh - header)`). This mirrors the patterns
  visitors recognise from Airbnb, Zillow, and Google Maps.
- **Mobile layout (< 1024 px):** map on top (50 vh), list below. A
  pill-shaped "Show map / Show list" button collapses one or the other
  for full-screen browsing.
- **Marker selection:** the selected marker uses the theme primary
  colour and the matching sidebar card gets a left-border accent in
  the same colour.
- **Empty / disabled states:** match the existing `LayoutMap` empty
  state strings (`MAP_NO_LOCATION_DATA`, `MAP_DISABLED`, etc.) — no
  new copy beyond the new header label `MAP` and the tooltip
  `VIEW_SWITCH_TO_MAP` (already present in `messages/en.json`).
- **Localisation:** the new strings introduced are `HEADER_MAP` (for
  the nav link) and `MAP_PAGE_TITLE` / `MAP_PAGE_DESCRIPTION` for the
  dedicated route. RTL locales reverse the sidebar / map split.
- **Accessibility:** the sidebar list is the keyboard-equivalent path
  through markers. Each card is a focusable link to the item-detail
  page; the sidebar `<aside>` is labelled with `aria-label="Listings"`.

## 9. Data & API Surface

- No new database tables. The map view consumes the existing
  `item_location_index` table via `GET /api/location/coordinates` (see
  Spec 011) and merges results with the cached `ItemData` records
  loaded from the YAML CMS.
- New config key: `settings.header.map_enabled` (boolean, default
  `false`). Reads through `getHeaderMapEnabled()` in
  `apps/web/lib/utils/settings.ts` and is exposed on `HeaderSettings`
  as `mapEnabled`.
- No new REST routes. The dedicated page is a Next.js App Router
  route (`apps/web/app/[locale]/map/page.tsx`).
- No new analytics events; the existing `view_changed` event added in
  Spec 016 fires when the user flips between Cards / Grid / Masonry /
  Map and is sufficient.

## 10. Plugin / Adapter Impact

- Map providers continue to follow the abstraction defined in Spec
  011. This spec adds no new provider.
- The view toggle, header link, and `/map` page live in core today.
  A future plugin-architecture refactor (Spec 002) can move them
  behind a `directory-views` plugin if we extract the listing shell.

## 11. Risks & Open Questions

- **Risk:** large directories (≥ 5 000 items) may overwhelm the
  sidebar list. Mitigation: virtualise the sidebar with the existing
  React Query / `react-window`-style approach used elsewhere in the
  app, or page the sidebar.
- **Risk:** geocoding API quotas can spike when an operator imports a
  large CSV. Mitigation: reuse the existing in-memory cache in
  `GeocodingService` (15-minute TTL) and document a CLI-based bulk
  geocoder.
- **Open question:** should the `/map` route reuse the same
  `(listing)` route group (sharing hero + filters) or live as a
  standalone full-bleed page? Default chosen: standalone, no hero, so
  visitors land directly on the map. Recorded in
  [`docs/questions.md`](../../questions.md).

## 12. Acceptance Test Plan

A new spec file `apps/web-e2e/tests/public/map.spec.ts` covers:

- the listing view toggle exposes the `Map` button when the feature
  is enabled, and clicking it switches the layout;
- visiting `/map` renders the page (and degrades gracefully when no
  items have coordinates);
- the `Map` link appears in the header when
  `settings.header.map_enabled` is true and is absent otherwise.

A page object `apps/web-e2e/page-objects/public/map.page.ts` wraps the
new selectors. The existing `view-toggle.page.ts` is updated to expose
the `mapButton` locator (already present).

## 13. References

- Spec 011 — [Maps Providers](../011-maps-providers/spec.md)
- Spec 002 — [Plugin Architecture](../002-plugin-architecture/spec.md)
- Spec 010 — [E2E Test Coverage](../010-e2e-test-coverage/spec.md)
- Spec 016 — [Typed Analytics Events](../016-typed-analytics-events/spec.md)
- Constitution Articles I, II, III, IV, V, VII, IX.
