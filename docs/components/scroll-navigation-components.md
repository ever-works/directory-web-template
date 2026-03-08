---
id: scroll-navigation-components
title: "Scroll & Navigation Reference"
sidebar_label: "Scroll & Navigation"
sidebar_position: 53
---

# Scroll & Navigation

## Overview

This group of components handles scroll-based UI interactions and navigation chrome. `ScrollToTopButton` provides a floating button that appears after scrolling, complete with scroll progress visualization and multiple visual variants. `NavigationControls` assembles the header's control cluster (layout switcher, language switcher, theme toggler). `NavigationLoadingBar` renders a thin loading indicator at the top of the viewport during client-side route transitions.

## Architecture

```
template/components/
  scroll-to-top-button.tsx     # Floating scroll-to-top with progress ring
  navigation-controls.tsx      # Header controls cluster
  navigation-loading-bar.tsx   # Top loading bar during navigation
```

---

## ScrollToTopButton

### Import

```typescript
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `showAfter` | `number` | No | `300` | Scroll distance in pixels before the button becomes visible. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the button element. |
| `size` | `"sm" \| "md" \| "lg"` | No | `"md"` | Button size. Controls width/height and icon size. |
| `variant` | `"default" \| "elegant" \| "minimal" \| "gradient"` | No | `"elegant"` | Visual style variant. |
| `easing` | `"linear" \| "easeInOut" \| "easeOut" \| "easeIn" \| "bounceOut"` | No | `"easeInOut"` | Scroll animation easing function passed to the `useScrollToTop` hook. |

### Size Reference

| Size | Button Dimensions | Icon Size |
|------|-------------------|-----------|
| `sm` | `w-10 h-10` | `w-4 h-4` |
| `md` | `w-12 h-12` | `w-5 h-5` |
| `lg` | `w-16 h-16` | `w-7 h-7` |

### Variant Reference

| Variant | Description |
|---------|-------------|
| `default` | Solid primary background with bordered styling. |
| `elegant` | Glassmorphic white/dark with backdrop blur, border, and an SVG progress ring overlay showing scroll progress. |
| `minimal` | Semi-transparent dark (light mode) or white (dark mode) with backdrop blur. |
| `gradient` | Multi-color gradient (`blue -> purple -> pink`) with sparkle effects on hover. Uses `ArrowUp` icon instead of `ChevronUp`. |

### Usage Examples

#### Basic Usage

```tsx
<ScrollToTopButton />
```

#### Custom Variant and Size

```tsx
<ScrollToTopButton
  variant="gradient"
  size="lg"
  showAfter={500}
  easing="bounceOut"
/>
```

#### Minimal Style

```tsx
<ScrollToTopButton variant="minimal" size="sm" />
```

### Behavior

- Visibility is toggled based on `window.scrollY > showAfter`, updated via a throttled scroll listener (16ms / ~60fps).
- The `elegant` variant renders an SVG circular progress indicator whose `strokeDasharray` tracks scroll position as a percentage.
- Clicking triggers a smooth scroll to top via the `useScrollToTop` hook with configurable easing and 800ms duration.
- On devices that support it, a 50ms haptic vibration feedback is triggered on click.
- A floating "Back to top" tooltip appears on hover above the button.

---

## NavigationControls

### Import

```typescript
import { NavigationControls } from "@/components/navigation-controls";
```

### Props

This component takes no props. It reads configuration from the `useHeaderSettings` hook and `isDemoMode()` utility.

### Usage Examples

```tsx
<header>
  <nav className="flex items-center justify-between">
    <Logo />
    <NavigationControls />
  </nav>
</header>
```

### Rendered Controls

The controls rendered depend on header settings and demo mode:

| Control | Condition | Component |
|---------|-----------|-----------|
| Layout Switcher | `settings.layoutEnabled && isDemoMode()` | `<LayoutSwitcher inline={false} iconOnly={true} />` (hidden on mobile) |
| Language Switcher | `settings.languageEnabled` | `<LanguageSwitcher />` |
| Theme Toggler | `settings.themeEnabled` | `<ThemeToggler iconOnly={!isDemoMode()} />` |

All controls are wrapped in a flex container with `gap-2 md:gap-3` and `transition-all duration-300`.

---

## NavigationLoadingBar

### Import

```typescript
import { NavigationLoadingBar } from "@/components/navigation-loading-bar";
```

### Props

This component takes no props. It delegates to the `TopLoadingBar` UI primitive.

### Usage Examples

```tsx
// Typically placed in the root layout
<NavigationLoadingBar />
<Header />
<main>{children}</main>
```

### Behavior

Renders a `TopLoadingBar` component that displays a thin animated bar at the top of the viewport during client-side navigation transitions. The loading state is managed internally by the `TopLoadingBar` primitive which hooks into Next.js router events.

## Styling

- **ScrollToTopButton**: Fixed position at `bottom-8 right-8` with `z-50`. Uses `animate-fadeInUp` for entrance animation, `hover:scale-110` and `active:scale-95` for interaction feedback. The progress ring uses SVG `stroke-primary-500` coloring.
- **NavigationControls**: Minimal wrapper with flex layout and responsive gap spacing. Individual control styling is delegated to child components.
- **NavigationLoadingBar**: Renders the `TopLoadingBar` which positions itself at the top of the viewport with high z-index.

## Accessibility

- **ScrollToTopButton**: Includes `aria-label="Scroll to top"`. Handles `Enter` and `Space` key events for keyboard activation. The tooltip provides additional context on hover/focus.
- **NavigationControls**: Each child component (`LayoutSwitcher`, `LanguageSwitcher`, `ThemeToggler`) has its own ARIA labels and keyboard support.
- **NavigationLoadingBar**: The loading bar is a visual-only indicator and does not interfere with screen reader announcements.

## Related Components

- [Layout Settings](/docs/template/components/layout-settings-components) - LayoutSwitcher consumed by NavigationControls.
- [Language Switcher](/docs/template/components/language-switcher-components) - Language dropdown consumed by NavigationControls.
- [Header Components](/docs/template/components/header-components) - Parent header that renders NavigationControls.
