---
id: tasks-017-map-view
title: 'Tasks 017 — Map View for Listings'
sidebar_label: '017 Map View Tasks'
---

# Tasks — `017-map-view`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions:

- `[P]` — can run in parallel with other `[P]` tasks.
- `[seq]` — must be done after the previous numbered task.
- Each task ends with a **Verification** line.

## Task list

### T-001 [P] — Add `mapEnabled` to header settings plumbing

- Files:
  - `apps/web/lib/content.ts`
  - `apps/web/lib/utils/settings.ts`
  - `apps/web/components/providers/settings-provider.tsx`
  - `apps/web/app/[locale]/layout.tsx`
- Steps:
  1. Add `mapEnabled: boolean` to the `HeaderSettings` interface.
  2. Add `map_enabled?: boolean` to `HeaderConfigSettings`.
  3. Add `getHeaderMapEnabled()` returning `false` by default.
  4. Set `mapEnabled: false` in the `DEFAULT_HEADER_SETTINGS` fallback
     used by `useSettings()`.
  5. Wire `getHeaderMapEnabled()` into the `headerSettings` object
     built in the root locale layout.
- Verification: `pnpm tsc --noEmit` passes; `useHeaderSettings()`
  exposes `settings.mapEnabled`.

### T-002 [P] — Add new translations

- Files: `apps/web/messages/en.json`
- Steps:
  1. Add `common.HEADER_MAP = "Map"`.
  2. Add `listing.MAP_PAGE_TITLE = "{name} on the map"`.
  3. Add `listing.MAP_PAGE_DESCRIPTION = "Browse listings on an interactive map"`.
- Verification: `pnpm tsc --noEmit` passes; the strings are visible in
  the developer tools React tree under the new components.

### T-003 [seq after T-001] — Render `Map` link in the header

- Files: `apps/web/components/header/index.tsx`
- Steps:
  1. Add a `map` entry in `NAVIGATION_CONFIG` (translation key
     `HEADER_MAP`, namespace `common`, href `/map`).
  2. Filter that entry out when
     `!headerSettings.mapEnabled || !locationSettings.enabled` — both
     in the desktop list and the mobile menu.
- Verification: with `settings.header.map_enabled: true` the link
  appears; with it false (default) the link is absent.

### T-004 [P] — Build `MapSidebar` component

- Files: `apps/web/components/layouts/MapSidebar.tsx`
- Steps:
  1. Render an `<aside aria-label="Listings">` with a scrollable
     `<ul>` of cards (one per item that has coordinates).
  2. Each card shows icon, name, optional category, optional
     description, and is wrapped in a `Link` to the item-detail
     page.
  3. Accept `selectedSlug` and `onSelect(slug)` props; selected card
     gets a left-border accent and `aria-current="true"`, and is
     scrolled into view via `scrollIntoView({ block: 'nearest',
     behavior: 'smooth' })` whenever it changes.
- Verification: storybook-style visual check via running `pnpm dev`
  and toggling selection.

### T-005 [seq after T-004] — Extend `LayoutMap` with sidebar + sync

- Files: `apps/web/components/layouts/LayoutMap.tsx`
- Steps:
  1. Add a `showSidebar?: boolean` prop (default `true`).
  2. Lift `selectedSlug` into local state at the layout root.
  3. Compose `<MapSidebar>` + the existing `<Map>` in a CSS-grid
     `lg:grid-cols-[minmax(360px,30%)_1fr]` layout; stack on
     smaller breakpoints with a "Show map / Show list" pill toggle.
  4. On marker click, set `selectedSlug` and pan/zoom the map
     (`mapInstance.setCenter` + `setZoom(15)`).
  5. On card click, set `selectedSlug`, pan/zoom the map, and open
     the existing `MapItemPopup` for that marker.
  6. Auto-fit bounds: when the marker set first becomes non-empty,
     compute a `MapBounds` from all coordinates and call
     `mapInstance.fitBounds(...)`.
- Verification: `pnpm tsc --noEmit` passes; manual interaction in
  `pnpm dev` confirms marker → card and card → marker sync.

### T-006 [seq after T-002, T-005] — Add `/map` route

- Files: `apps/web/app/[locale]/map/page.tsx`
- Steps:
  1. Server component that calls `getCachedItems({ lang: locale })`
     and returns 404 (`notFound()`) when
     `getLocationEnabled()` is false.
  2. Render a thin client wrapper that mounts `<LayoutMap items=...
     showSidebar />` full-bleed (no hero).
  3. Add `generateMetadata` using the new `MAP_PAGE_TITLE` /
     `MAP_PAGE_DESCRIPTION` translations.
- Verification: visiting `/map` renders the page; visiting it with
  location disabled returns 404.

### T-007 [seq after T-003, T-005, T-006] — E2E coverage

- Files:
  - `apps/web-e2e/tests/public/map.spec.ts`
  - `apps/web-e2e/page-objects/public/map.page.ts`
- Steps:
  1. New page object exposing `pageHeading`, `mapCanvas`,
     `sidebarCards`, `mapHeaderLink`.
  2. Specs covering AC-1, AC-2, AC-3, AC-7, AC-10:
     - the listing toggle exposes a `Map` button when
       `isMapAvailable`,
     - clicking the toggle switches the visible layout,
     - `/map` returns 200 and renders either markers or the empty
       state,
     - the `Map` header link appears on `/` when the feature is
       enabled.
  3. Use `test.skip(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN &&
     !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, ...)` for the
     marker-render path so CI without map keys still passes.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright
  test tests/public/map.spec.ts` passes locally with location
  features disabled (skip path) and with them enabled.

### T-008 [P] — Documentation

- Files:
  - `docs/features/map-view.md` (new)
  - `docs/index.md` (link in)
  - `docs/log.md` (one line)
  - `docs/spec/README.md` (index row for spec 017)
- Steps:
  1. Write a feature page covering enable/disable, YAML examples,
     and the two ways visitors reach the view.
  2. Add a row for spec 017 in the spec index.
  3. Append a `docs/log.md` line referencing this PR.
- Verification: `pnpm lint` passes; no broken links; docs build
  succeeds (`pnpm --filter @ever-works/docs build`, optional).

### T-009 [seq] — Verification & Ship

- Files: this `tasks.md`
- Steps:
  1. `pnpm lint` and `pnpm tsc --noEmit` from `apps/web/`.
  2. `pnpm build` from monorepo root.
  3. Tick each task above.
- Verification: CI green; PR description links spec, plan, tasks.

## Acceptance Criteria → Task Map

| AC     | Tasks                       |
| ------ | --------------------------- |
| AC-1   | T-001, T-005, T-007         |
| AC-2   | T-001, T-002, T-003, T-007  |
| AC-3   | T-002, T-006, T-007         |
| AC-4   | T-005                        |
| AC-5   | T-004, T-005                 |
| AC-6   | (Spec 011 — already shipped) |
| AC-7   | T-005, T-006                 |
| AC-8   | T-004, T-005                 |
| AC-9   | T-005, T-006                 |
| AC-10  | T-007                        |

## Notes

- This plan deliberately does *not* introduce a new Maps provider
  (Leaflet / MapLibre). Spec 011's existing Mapbox + Google
  providers carry the rendering. A new `plugin-maps-maplibre/`
  package can be drafted as a follow-up after Spec 002 ships.
- If the sidebar list is observably slow with > 200 items in
  manual testing, follow up with virtualisation (a `react-window`
  list) — but only with measurements, not by speculation.
