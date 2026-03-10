---
id: layout-settings-components
title: "Layout Settings Reference"
sidebar_label: "Layout Settings"
sidebar_position: 48
---

# Layout Settings

## Overview

The layout settings system provides two complementary components: `LayoutSettings`, a compact toolbar widget that exposes the `ViewToggle` for switching between list, grid, and masonry layouts; and `LayoutSwitcher`, a richer popover that lets users choose between home page layouts (Home 1 / Home 2) and toggle between fixed and fluid container widths. Both components read from and write to the shared `LayoutThemeContext`.

## Architecture

```
template/components/
  layout-settings.tsx   # Compact view-toggle wrapper for item listings
  layout-switcher.tsx   # Full layout/container-width popover
  view-toggle.tsx       # Icon toggle bar (classic / grid / masonry / map)
```

---

## LayoutSettings

### Import

```typescript
import { LayoutSettings } from "@/components/layout-settings";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | No | `undefined` | Additional CSS classes for the outer wrapper `div`. |
| `isParentSticky` | `boolean` | No | `false` | When `true`, tooltips in the child `ViewToggle` flip below the button to avoid clipping under a sticky header. |

### Usage Examples

#### Basic Usage

```tsx
<LayoutSettings />
```

#### Inside a Sticky Toolbar

```tsx
<div className="sticky top-0 z-10">
  <LayoutSettings isParentSticky />
</div>
```

---

## LayoutSwitcher

### Import

```typescript
import { LayoutSwitcher } from "@/components/layout-switcher";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `inline` | `boolean` | No | `false` | When `true`, renders the layout cards directly without a popover wrapper. Useful for embedding in settings panels. |
| `iconOnly` | `boolean` | No | `false` | When `true`, renders as a single icon button with a portal-based tooltip and dropdown. Ideal for compact header navigation. |

### Usage Examples

#### Default Popover Mode

```tsx
<LayoutSwitcher />
```

#### Icon-Only Mode for Header

```tsx
<LayoutSwitcher iconOnly />
```

#### Inline Mode for Settings Panel

```tsx
<div className="settings-section">
  <h3>Choose Layout</h3>
  <LayoutSwitcher inline />
</div>
```

### Layout Options

The switcher presents two home page layouts:

| Key | Name | Description |
|-----|------|-------------|
| `Home_One` | Home 1 | Classic layout with traditional listing design. |
| `Home_Two` | Home 2 | Modern grid-based layout with visual elements. |

Each option shows a preview image that changes based on the current theme (light/dark).

### Container Width Options

| Value | Label | Description |
|-------|-------|-------------|
| `fixed` | Fixed Width | Content constrained to a maximum container width. |
| `fluid` | Full Width | Content stretches edge-to-edge across the viewport. |

---

## ViewToggle

### Import

```typescript
import ViewToggle from "@/components/view-toggle";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `activeView` | `LayoutKey` | No | `"classic"` | Currently active view mode. One of `"classic"`, `"grid"`, or `"masonry"`. |
| `onViewChange` | `(view: LayoutKey) => void` | No | `undefined` | Callback fired when a view button is clicked. |
| `isParentSticky` | `boolean` | No | `false` | Flips tooltips below the buttons when inside a sticky container. |
| `isMapAvailable` | `boolean` | No | `false` | Shows an additional map view toggle button. |
| `isMapActive` | `boolean` | No | `false` | Whether the map view is currently active. |
| `onMapToggle` | `() => void` | No | `undefined` | Callback to toggle the map view on/off. |

### View Modes

| Mode | Icon | Description |
|------|------|-------------|
| `classic` | List icon | Traditional vertical list of items. |
| `grid` | Grid icon | Card-based grid layout. |
| `masonry` | Masonry icon | Pinterest-style masonry layout. |
| `map` | Map icon | Geographic map view (conditionally shown). |

## Styling

- **ViewToggle**: Rendered as a compact button group with `bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs` and rounded pill styling. Active buttons use `bg-theme-primary text-white shadow-md` with a `scale-105` transform.
- **LayoutSwitcher popover**: 500px wide dropdown with `backdrop-blur-xl`, glassmorphic borders, and `rounded-2xl`. Layout cards have hover animations (`hover:scale-[1.01]`) and gradient overlays.
- **Container width toggle**: Two full-width buttons using gradient backgrounds for the active state (`from-theme-primary-500 to-theme-primary-600`).
- **Tooltips**: Portal-based fixed tooltips with `z-[9999]` to avoid stacking context issues.

## Accessibility

- All toggle buttons include `aria-label` attributes with translated view names (e.g., "Switch to list view").
- Focus states use `focus:ring-1 focus:ring-theme-primary` for keyboard visibility.
- The LayoutSwitcher trigger has `aria-expanded` and `aria-controls` linking to the popover panel via `useId()`.
- Escape key closes the popover.
- Tooltips appear on both hover and focus for keyboard users.

## Related Components

- [Context Providers](/template/components/context-providers) - `LayoutThemeContext` that stores the layout and container width state.
- [Settings Modal](/template/components/settings-modal-components) - Alternative location for layout configuration.
- [Navigation Controls](/template/components/scroll-navigation-components) - Header integration point for the LayoutSwitcher.
