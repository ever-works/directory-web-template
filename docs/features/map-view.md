---
id: map-view
title: Map View for Listings
sidebar_label: Map View
sidebar_position: 6
---

# Map View for Listings

> **Spec:** [`017-map-view`](../spec/017-map-view/spec.md)
>
> **Underlying providers:** [Maps & Location Features](maps-location.md)
> (Mapbox, Google Maps).

The **Map View** turns any listing page into a side-by-side map and
sidebar — markers on one side, the same items as scrollable cards on
the other. Visitors can flip into the view from the existing
list/grid/masonry toggle, and operators who opt in can also surface a
dedicated **Map** entry in the primary navigation.

## What it gives your visitors

- An interactive, full-height map with marker clustering for big
  datasets.
- A scrollable sidebar of listing cards alongside the map (Zillow /
  Airbnb style on desktop; stacked with a "Show map / Show list"
  toggle on mobile).
- Click a marker → the matching card scrolls into view and highlights.
- Click a card → the map pans and zooms to that marker and opens the
  popup.
- Auto-fit bounds: on first load the map centres itself on every
  marker so the user always sees relevant pins.
- Graceful empty state when no items have coordinates.

## How items end up on the map

Each item lives as YAML in your data repository. The view picks up any
item that has either explicit coordinates or an address that the
geocoding service can resolve:

```yaml
# .content/items/some-cafe.yml
name: Some Café
slug: some-cafe
description: Great coffee and oat milk.
location:
  address: "123 Market Street, San Francisco, CA"
  # latitude / longitude are optional — geocoded automatically
  # latitude: 37.7937
  # longitude: -122.3957
```

If you supply explicit `latitude` and `longitude`, those win. If you
supply only `address`, the configured geocoder fills in coordinates in
the background and writes them to the location index for fast lookup.

## Configuration

Two flags drive the feature, both in your `config.yml`:

```yaml
settings:
  location:
    enabled: true       # turn on location features (Spec 011)
    provider: mapbox    # or google
    map_style: streets  # or satellite
    default_center: [37.7749, -122.4194] # optional — falls back to (0, 0)

  header:
    map_enabled: true   # show "Map" in the primary nav (off by default)
```

You also need the public provider key for whichever map provider you
chose, in `apps/web/.env.local`:

```bash
# pick one
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

The view-toggle **Map** button appears whenever
`settings.location.enabled` is true *and* the active provider has a
public key configured. The header **Map** link only appears when
`settings.header.map_enabled` is also true. With both off, the rest of
the directory behaves exactly as before — no UI churn for forks that
don't want the feature.

## Where the view appears

- **In the listing view-toggle** (`/discover`, category pages, tag
  pages, etc.) — alongside Cards, Grid, and Masonry.
- **At a dedicated route**, `/<locale>/map`, that renders the map +
  sidebar full-bleed without the homepage hero. This is the URL the
  header link points at.

The two surfaces share the same React composition (`LayoutMap`), so
operators get one experience to test and translate.

## How marker ↔ sidebar selection works

A single piece of state at the layout root tracks the selected slug.
Marker clicks set it; sidebar clicks set it *and* pan the map. The
sidebar uses `aria-current="true"` for the selected card and scrolls
it into view via `scrollIntoView({ block: 'nearest' })`, so screen
readers and keyboard users get the same affordances as mouse users.

## Testing locally

1. Add items with `location.address` to your data repo.
2. Set the env keys and config flags above.
3. Run `pnpm run --filter @ever-works/web dev`.
4. Navigate to `/`, confirm the **Map** link appears in the header,
   click it.
5. Click a card → the map pans. Click a marker → the matching card
   highlights.

The Playwright suite covers the route's HTTP status, the toggle
button's visibility, the header link's gate, and the sidebar
selection contract:

```bash
pnpm --filter @ever-works/web-e2e exec playwright test tests/public/map.spec.ts
```

The tests skip themselves cleanly when no provider key is configured,
so CI environments without map credentials still pass.

## Related documentation

- [Maps & Location Features](maps-location.md) — provider abstraction,
  geocoding, item-detail map embed.
- [Spec 011 — Maps Providers](../spec/011-maps-providers/spec.md) —
  the underlying provider plumbing.
- [Spec 017 — Map View](../spec/017-map-view/spec.md) — the spec that
  this page documents.
