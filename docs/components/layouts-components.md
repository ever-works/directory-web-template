---
id: layouts-components
title: Layout Components
sidebar_label: Layouts
sidebar_position: 57
---

# Layout Components

## Overview

The layouts system provides five interchangeable layout renderers for displaying directory items: Classic, Grid, Cards, Masonry, and Map. Each layout accepts the same core props (items array, layout key, navigation callback) and renders items using the shared `Item` component, while offering unique visual arrangements and optional sponsor card injection.

**Source:** `components/layouts/`

## Architecture

```
components/layouts/
  index.ts              # Barrel exports, LayoutKey type, layoutComponents map
  LayoutClassic.tsx     # Vertical list layout
  LayoutGrid.tsx        # CSS grid layout
  LayoutCards.tsx        # Flex-wrap cards layout
  LayoutMasonry.tsx     # Masonry (Pinterest-style) layout
  LayoutMap.tsx         # Interactive map with markers
```

The `index.ts` exports a `layoutComponents` record mapping `LayoutKey` strings to their respective components:

```tsx
export type LayoutKey = "classic" | "grid" | "cards" | "masonry";

export const layoutComponents: Record<LayoutKey, React.ComponentType<any>> = {
  classic: LayoutClassic,
  grid: LayoutGrid,
  cards: LayoutCards,
  masonry: LayoutMasonry,
};
```

The Map layout is a separate standalone component not included in the `layoutComponents` record since it requires additional map-specific configuration.

**Sponsor Card Injection:**

Classic, Grid, and Masonry layouts support injecting a `SponsorCard` at a specific position within the items list. The sponsor card is typically inserted at position 3 (after the third item) and blends with the surrounding item cards.

## Components

### LayoutClassic

Vertical list layout rendering items in a single column.

```tsx
import { LayoutClassic } from "@/components/layouts";

<LayoutClassic
  items={items}
  layout="classic"
  onNavigate={handleNavigate}
/>
```

- Renders items in a `flex flex-col gap-4` container
- Injects `SponsorCard` at index 3 if sponsors are available via `useSponsorAdsContext`
- Passes `layout="classic"` to each `Item` component for layout-specific styling

### LayoutGrid

Responsive CSS grid layout with fluid and fixed breakpoint modes.

```tsx
import { LayoutGrid } from "@/components/layouts";

<LayoutGrid
  items={items}
  layout="grid"
  onNavigate={handleNavigate}
/>
```

- Uses CSS `grid` with responsive column counts:
  - Fluid mode: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
  - Fixed mode: Similar responsive breakpoints
- Injects `SponsorCard` at index 3 with `variant="compact"` to match grid card sizing
- Items have fixed height (`h-[320px]`) for consistent grid appearance

### LayoutCards

Simple flex-wrap layout for card display.

```tsx
import { LayoutCards } from "@/components/layouts";

<LayoutCards
  items={items}
  layout="cards"
  onNavigate={handleNavigate}
/>
```

- Uses `flex flex-wrap` container
- Items auto-size based on content
- No sponsor card injection

### LayoutMasonry

Pinterest-style masonry layout using `react-responsive-masonry`.

```tsx
import { LayoutMasonry } from "@/components/layouts";

<LayoutMasonry
  items={items}
  layout="masonry"
  onNavigate={handleNavigate}
/>
```

- Uses `Masonry` and `ResponsiveMasonry` from `react-responsive-masonry`
- Fluid breakpoint configuration: `{ 0: 1, 640: 2, 1024: 3, 1280: 4 }`
- Fixed breakpoint configuration: `{ 0: 1, 640: 2, 1024: 3 }`
- Injects `SponsorCard` at index 3
- Items have natural height based on content (variable-height cards)
- Description truncation uses `createExcerpt()` with `MASONRY_EXCERPT_MAX_CHARS` (150 chars)

### LayoutMap

Interactive map layout with markers for geolocated items.

```tsx
import LayoutMap from "@/components/layouts/LayoutMap";

<LayoutMap
  items={items}
  layout="map"
  onNavigate={handleNavigate}
/>
```

Composed of internal sub-components:
- **MapComponent**: Renders the map container with markers and popups
- **MapItemPopup**: Popup card displayed when clicking a marker
- **MapMarker**: Custom marker rendering

Features:
- Clusters nearby markers at lower zoom levels
- Click-to-open popup with item preview (icon, name, category)
- Location settings integration for default center/zoom
- Responsive: full-width on mobile, side-panel on desktop

## Props Reference

All layout components share this base interface:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ItemData[]` | required | Array of items to display |
| `layout` | `LayoutKey` | required | Active layout key passed to each Item |
| `onNavigate` | `() => void` | `undefined` | Callback when user clicks an item |

### LayoutMap Additional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | `[number, number]` | `[0, 0]` | Default map center coordinates |
| `zoom` | `number` | `2` | Default zoom level |
| `showControls` | `boolean` | `true` | Show zoom and layer controls |

## Styling

- **Classic**: `flex flex-col gap-4` with full-width items
- **Grid**: `grid gap-4` with responsive `grid-cols-*` classes; items use `h-[320px]` fixed height
- **Cards**: `flex flex-wrap gap-4` with naturally-sized items
- **Masonry**: `react-responsive-masonry` with `gutter="16px"` between columns
- **Map**: Full viewport height with `h-[calc(100vh-200px)]` on the map container
- All layouts use the shared `Item` component which adapts its internal styling based on the `layout` prop
- Sponsor cards use matching styles: `variant="compact"` in grid, default variant in classic/masonry
- Dark mode supported via the `Item` component's built-in dark mode classes

## Usage Examples

### Dynamic layout switching

```tsx
import { layoutComponents, LayoutKey } from "@/components/layouts";

function ItemListing({ items, activeLayout }: { items: ItemData[]; activeLayout: LayoutKey }) {
  const LayoutComponent = layoutComponents[activeLayout];
  return (
    <LayoutComponent
      items={items}
      layout={activeLayout}
      onNavigate={() => console.log("navigating")}
    />
  );
}
```

### Map layout with location data

```tsx
import LayoutMap from "@/components/layouts/LayoutMap";

<LayoutMap
  items={geolocatedItems}
  layout="map"
  center={[48.8566, 2.3522]}
  zoom={12}
/>
```

## Related Components

- **[Item Component](./item-utility-components.md)** -- The shared item card rendered by all layouts
- **[Filters](./filters-components.md)** -- Filter system that provides the item arrays to layouts
- **[Sponsor Ads](./sponsor-ads-components.md)** -- `SponsorCard` injected into Classic, Grid, and Masonry layouts
- **[Utility Display](./utility-display-components.md)** -- `ViewToggle` and `LayoutSwitcher` for switching between layouts
