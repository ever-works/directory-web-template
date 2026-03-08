---
id: utility-display-components
title: Utility Display Components
sidebar_label: Utility & Display
sidebar_position: 64
---

# Utility Display Components

## Overview

The utility and display components provide UI controls for user preferences and visual customization: theme toggling (light/dark), layout view switching, scroll-to-top navigation, layout configuration switching, floating and inline settings buttons, and responsive breakpoint utilities. These components are typically placed in headers, footers, or floating positions.

**Source:** `components/theme-toggler.tsx`, `components/view-toggle.tsx`, `components/scroll-to-top-button.tsx`, `components/layout-switcher.tsx`, `components/floating-settings-button.tsx`, `components/settings-button.tsx`, `components/responsive-utils.tsx`

## Architecture

```
components/
  theme-toggler.tsx              # Light/dark mode toggle
  view-toggle.tsx                # Layout view mode selector (classic/grid/masonry/map)
  scroll-to-top-button.tsx       # Scroll-to-top with progress ring
  layout-switcher.tsx            # Site-wide layout configuration switcher
  floating-settings-button.tsx   # Fixed-position settings trigger
  settings-button.tsx            # Inline header settings trigger
  responsive-utils.tsx           # Breakpoint hooks and utility classes
```

All display components are client components (`'use client'`) that manage local UI state. They read/write preferences through React Context (theme context, layout context) or local state.

## Components

### ThemeToggler

Toggle between light and dark color modes.

```tsx
import ThemeToggler from "@/components/theme-toggler";

<ThemeToggler mode="compact" />
```

Three display modes:
- **compact**: Single icon button that toggles on click (sun/moon icon)
- **iconOnly**: Minimal icon button without label
- **dropdown**: Radix-based dropdown with explicit light/dark options and labels

Uses `next-themes` `useTheme()` hook for theme state management.

### ViewToggle

Selector for switching between item layout view modes.

```tsx
import ViewToggle from "@/components/view-toggle";

<ViewToggle
  activeView="grid"
  onViewChange={setActiveView}
  showMapToggle={true}
/>
```

Renders toggle buttons for:
- **classic**: List icon (vertical lines)
- **grid**: Grid icon (4-square grid)
- **masonry**: Masonry icon (staggered layout)
- **map**: Map pin icon (shown only when `showMapToggle` is true)

Each button has a tooltip label and active/inactive styling. Active view uses `bg-theme-primary text-white`, inactive uses `bg-gray-100 dark:bg-gray-800`.

### ScrollToTopButton

Floating button that scrolls the page to the top, with an optional scroll progress ring.

```tsx
import ScrollToTopButton from "@/components/scroll-to-top-button";

<ScrollToTopButton
  variant="elegant"
  showProgress={true}
  threshold={300}
  size={48}
  easing="easeInOutCubic"
/>
```

Four visual variants:
- **default**: Simple circular button with arrow icon
- **elegant**: Gradient background with shadow
- **minimal**: Small, low-contrast button
- **gradient**: Bold gradient ring with progress indicator

Features:
- Appears after scrolling past `threshold` pixels
- Optional SVG-based circular progress ring showing scroll position
- Configurable scroll easing functions: `linear`, `easeInOutQuad`, `easeInOutCubic`, `easeOutExpo`
- Smooth scroll animation with `requestAnimationFrame`

### LayoutSwitcher

Site-wide layout configuration switcher for choosing between layout themes.

```tsx
import LayoutSwitcher from "@/components/layout-switcher";

<LayoutSwitcher mode="inline" />
```

Three display modes:
- **inline**: Row of toggle buttons with preview thumbnails
- **iconOnly**: Compact icon-only buttons
- **dropdown**: Dropdown menu with layout previews

Layout options:
- **Home_One**: Standard layout configuration
- **Home_Two**: Alternative layout configuration

Also supports container width toggle:
- **fixed**: Contained max-width
- **fluid**: Full-width layout

Uses layout theme context to persist selections.

### FloatingSettingsButton

Fixed-position button (bottom-right corner) that opens a settings modal.

```tsx
import FloatingSettingsButton from "@/components/floating-settings-button";

<FloatingSettingsButton />
```

- Renders at `fixed bottom-6 right-6` with `z-50`
- Gear icon with rotation animation on hover
- Opens a comprehensive settings modal on click
- Visible on all pages as an always-accessible settings shortcut

### SettingsButton

Inline settings button designed for header/toolbar placement.

```tsx
import SettingsButton from "@/components/settings-button";

<SettingsButton />
```

- Renders as an inline button (not fixed position)
- Gear icon with tooltip label
- Opens the same settings modal as `FloatingSettingsButton`
- Smaller, more subtle styling suited for navbar integration

### Responsive Utilities

Hooks and CSS class presets for responsive breakpoint management.

```tsx
import {
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useDeviceInfo,
  Responsive,
  responsiveClasses,
  BREAKPOINTS
} from "@/components/responsive-utils";
```

**Hooks:**

- `useBreakpoint()` -- Returns the current Tailwind breakpoint key: `"xs"` | `"sm"` | `"md"` | `"lg"` | `"xl"` | `"2xl"`
- `useIsMobile()` -- Returns `true` for `xs` or `sm` breakpoints
- `useIsTablet()` -- Returns `true` for `md` or `lg` breakpoints
- `useIsDesktop()` -- Returns `true` for `xl` or `2xl` breakpoints
- `useDeviceInfo()` -- Returns composite object with breakpoint, device type booleans, dimensions, orientation

**Responsive Component:**

```tsx
<Responsive showOn={["xs", "sm"]}>
  <MobileMenu />
</Responsive>

<Responsive hideOn={["xs", "sm"]}>
  <DesktopSidebar />
</Responsive>
```

**Breakpoint Constants:**

| Key | Pixels |
|-----|--------|
| `xs` | 480 |
| `sm` | 640 |
| `md` | 768 |
| `lg` | 1024 |
| `xl` | 1280 |
| `2xl` | 1536 |

**Responsive Class Presets** (`responsiveClasses`):

Pre-built Tailwind class strings for common responsive patterns:
- `responsiveClasses.padding.sm` / `.md` / `.lg` -- Responsive padding scales
- `responsiveClasses.margin.sm` / `.md` / `.lg` -- Responsive margin scales
- `responsiveClasses.gap.sm` / `.md` / `.lg` -- Responsive gap scales
- `responsiveClasses.text.xs` through `.xl` -- Responsive text size scales
- `responsiveClasses.grid.cols1to2` through `.cols2to6` -- Responsive grid column counts
- `responsiveClasses.container.sm` through `.full` -- Responsive container widths

## Props Reference

### ThemeToggler Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"compact" \| "iconOnly" \| "dropdown"` | `"compact"` | Display mode |

### ViewToggle Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activeView` | `string` | required | Currently active layout key |
| `onViewChange` | `(view: string) => void` | required | Callback when view is changed |
| `showMapToggle` | `boolean` | `false` | Whether to show the map option |

### ScrollToTopButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "elegant" \| "minimal" \| "gradient"` | `"default"` | Visual style variant |
| `showProgress` | `boolean` | `false` | Show scroll progress ring |
| `threshold` | `number` | `300` | Scroll pixels before button appears |
| `size` | `number` | `48` | Button diameter in pixels |
| `easing` | `"linear" \| "easeInOutQuad" \| "easeInOutCubic" \| "easeOutExpo"` | `"easeInOutCubic"` | Scroll animation easing |

### LayoutSwitcher Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"inline" \| "iconOnly" \| "dropdown"` | `"inline"` | Display mode |

### Responsive Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to conditionally render |
| `showOn` | `Breakpoint[]` | `undefined` | Only show on these breakpoints |
| `hideOn` | `Breakpoint[]` | `undefined` | Hide on these breakpoints |

### useDeviceInfo Return

| Property | Type | Description |
|----------|------|-------------|
| `breakpoint` | `Breakpoint` | Current breakpoint key |
| `isMobile` | `boolean` | True for xs/sm |
| `isTablet` | `boolean` | True for md/lg |
| `isDesktop` | `boolean` | True for xl/2xl |
| `dimensions` | `{ width: number; height: number }` | Current viewport size |
| `isPortrait` | `boolean` | Height > width |
| `isLandscape` | `boolean` | Width > height |

## Styling

- **ThemeToggler**: Uses `next-themes` with sun/moon icons, `bg-gray-100 dark:bg-gray-800` button styling
- **ViewToggle**: Inline button group with `rounded-lg` container, active state uses `bg-theme-primary text-white`
- **ScrollToTopButton default**: `bg-white dark:bg-gray-800 shadow-lg rounded-full` with `FiArrowUp` icon
- **ScrollToTopButton elegant**: `bg-linear-to-br from-blue-500 to-purple-600 text-white shadow-xl`
- **ScrollToTopButton gradient**: SVG progress ring with `stroke-dasharray` animation
- **LayoutSwitcher inline**: Row of bordered cards with layout preview images
- **FloatingSettingsButton**: `fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 shadow-lg rounded-full` with gear rotation: `hover:rotate-90 transition-transform duration-300`
- **SettingsButton**: Inline `bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg` with tooltip

## Usage Examples

### Header controls

```tsx
<header className="flex items-center gap-3">
  <LayoutSwitcher mode="iconOnly" />
  <ViewToggle
    activeView={currentView}
    onViewChange={setView}
    showMapToggle={hasGeoData}
  />
  <ThemeToggler mode="compact" />
  <SettingsButton />
</header>
```

### Floating controls at page level

```tsx
<main>
  {children}
  <ScrollToTopButton variant="elegant" showProgress={true} />
  <FloatingSettingsButton />
</main>
```

### Responsive layout adaptation

```tsx
const { isMobile, isDesktop } = useDeviceInfo();

return (
  <div className={responsiveClasses.grid.cols1to3}>
    {isDesktop && <Sidebar />}
    <ItemGrid items={items} />
    {isMobile && <MobileBottomNav />}
  </div>
);
```

### Conditional rendering by breakpoint

```tsx
<Responsive showOn={["lg", "xl", "2xl"]}>
  <DesktopOnlyWidget />
</Responsive>

<Responsive hideOn={["lg", "xl", "2xl"]}>
  <MobileCompactView />
</Responsive>
```

## Related Components

- **[Navigation](./navigation-components.md)** -- `NavigationControls` renders `LayoutSwitcher` and `ThemeToggler`
- **[Layouts](./layouts-components.md)** -- `ViewToggle` switches between layout components
- **[Profile Utilities](./profile-utility-components.md)** -- Profile button placed alongside settings controls
- **[Filters](./filters-components.md)** -- Sort and filter controls often placed near view toggle
