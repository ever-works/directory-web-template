---
id: navigation-components
title: Navigation Components
sidebar_label: Navigation
sidebar_position: 60
---

# Navigation Components

## Overview

The navigation components provide top-level navigation controls and page transition indicators. `NavigationControls` renders a configurable set of header actions (layout switcher, language switcher, theme toggler) based on site settings and demo mode state. `NavigationLoadingBar` shows a thin loading bar at the top of the viewport during client-side route transitions.

**Source:** `components/navigation-controls.tsx`, `components/navigation-loading-bar.tsx`

## Architecture

```
components/
  navigation-controls.tsx      # Header action buttons (layout, language, theme)
  navigation-loading-bar.tsx   # Top loading bar for page transitions
```

`NavigationControls` reads configuration from header settings (passed as props or from context) to determine which controls to display. It conditionally renders `LayoutSwitcher`, `LanguageSwitcher`, and `ThemeToggler` based on enabled flags and demo mode.

`NavigationLoadingBar` wraps the `TopLoadingBar` library component to show a progress indicator during Next.js route changes.

## Components

### NavigationControls

Renders a row of header action buttons based on configuration.

```tsx
import { NavigationControls } from "@/components/navigation-controls";

<NavigationControls
  showLayoutSwitcher={true}
  showLanguageSwitcher={true}
  showThemeToggler={true}
  isDemoMode={false}
/>
```

Conditional rendering logic:
- **LayoutSwitcher**: Shown when `showLayoutSwitcher` is true or in demo mode
- **LanguageSwitcher**: Shown when `showLanguageSwitcher` is true and multiple locales are configured
- **ThemeToggler**: Shown when `showThemeToggler` is true or in demo mode

All controls render inline in a flex row with gap spacing, suitable for header/navbar placement.

### NavigationLoadingBar

Thin loading bar displayed at the top of the viewport during page transitions.

```tsx
import { NavigationLoadingBar } from "@/components/navigation-loading-bar";

<NavigationLoadingBar />
```

- Wraps `TopLoadingBar` (from an external library)
- Triggers on Next.js route change events
- Animates a thin colored bar from left to right
- Uses the theme primary color

## Props Reference

### NavigationControls Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLayoutSwitcher` | `boolean` | `false` | Show the layout switching control |
| `showLanguageSwitcher` | `boolean` | `false` | Show the language selection control |
| `showThemeToggler` | `boolean` | `false` | Show the light/dark mode toggle |
| `isDemoMode` | `boolean` | `false` | Demo mode forces all controls visible |

### NavigationLoadingBar Props

This component accepts no props. It self-manages loading state by listening to Next.js router events.

## Styling

- `NavigationControls` renders as `flex items-center gap-2` for inline header layout
- Individual controls inherit their own component styling (see [Utility Display](./utility-display-components.md))
- `NavigationLoadingBar` renders a fixed-position bar at `top-0` with `z-50`
- Loading bar color uses the theme primary color (`bg-theme-primary`)
- Bar height is approximately 2-3px for a subtle, non-intrusive appearance

## Usage Examples

### In the site header

```tsx
<header className="flex items-center justify-between px-6 py-4">
  <Logo />
  <nav className="flex items-center gap-4">
    <SearchBar />
    <NavigationControls
      showLayoutSwitcher={settings.enableLayoutSwitcher}
      showLanguageSwitcher={settings.enableI18n}
      showThemeToggler={settings.enableThemeToggle}
    />
    <ProfileButton />
  </nav>
</header>
```

### Loading bar in the root layout

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NavigationLoadingBar />
        {children}
      </body>
    </html>
  );
}
```

## Related Components

- **[Utility Display](./utility-display-components.md)** -- `LayoutSwitcher`, `ThemeToggler` rendered by `NavigationControls`
- **[Profile Utilities](./profile-utility-components.md)** -- `ProfileButton` typically placed alongside navigation controls
- **[Filters](./filters-components.md)** -- Filter controls often placed below navigation in the page layout
