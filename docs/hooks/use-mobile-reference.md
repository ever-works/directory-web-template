---
id: use-mobile-reference
title: useIsMobile
sidebar_label: useIsMobile
sidebar_position: 39
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useIsMobile

A lightweight React hook for detecting whether the current viewport matches a mobile breakpoint. It uses `window.matchMedia` for efficient, event-driven detection that updates in real time as the browser window is resized.

## Import

```typescript
import { useIsMobile } from '@/hooks/use-mobile';
```

## API Reference

### Parameters

```typescript
function useIsMobile(breakpoint?: number): boolean;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `breakpoint` | `number` | `768` | The pixel width threshold. Viewports narrower than this value are considered mobile. |

### Return Value

| Type | Description |
|---|---|
| `boolean` | `true` if the viewport width is less than the breakpoint, `false` otherwise. Returns `false` during SSR (before the effect runs). |

## Usage Examples

### Responsive Component Rendering

```tsx
function NavigationBar() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

### Custom Breakpoint

```tsx
function SidePanel() {
  const isSmallScreen = useIsMobile(1024); // Tablet and below

  if (isSmallScreen) {
    return <BottomSheet>{/* panel content */}</BottomSheet>;
  }

  return <Sidebar>{/* panel content */}</Sidebar>;
}
```

### Conditional Data Loading

```tsx
function ImageGallery({ images }: { images: Image[] }) {
  const isMobile = useIsMobile();

  // Load fewer images on mobile for performance
  const displayCount = isMobile ? 6 : 24;
  const displayedImages = images.slice(0, displayCount);

  return (
    <div className={isMobile ? 'grid-cols-2' : 'grid-cols-4'}>
      {displayedImages.map((img) => (
        <img
          key={img.id}
          src={img.url}
          loading={isMobile ? 'lazy' : 'eager'}
        />
      ))}
    </div>
  );
}
```

### Combined with Other Hooks

```tsx
function SearchableList({ items }: { items: Item[] }) {
  const isMobile = useIsMobile();
  const { displayedItems, hasMore, loadMore } = useInfiniteLoading({
    items,
    initialPage: 1,
    perPage: isMobile ? 8 : 20, // Fewer items per page on mobile
  });

  return (
    <div>
      {displayedItems.map((item) => (
        <ItemCard key={item.id} item={item} compact={isMobile} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

## Configuration

This hook requires no configuration, providers, or server-side setup. It is a `"use client"` component that relies solely on the browser's `window.matchMedia` API.

### Common Breakpoints

| Name | Value | Matches |
|---|---|---|
| Mobile (default) | `768` | Phones and small tablets in portrait |
| Tablet | `1024` | Tablets in landscape and small laptops |
| Desktop | `1280` | Standard desktop monitors |
| Wide | `1536` | Wide desktop and external monitors |

These align with common Tailwind CSS breakpoints (`md`, `lg`, `xl`, `2xl`).

## Edge Cases and Gotchas

- **SSR / Hydration**: During server-side rendering, `isMobile` is `undefined` internally (cast to `false` via `!!`). This means the initial server render always assumes desktop. If your mobile and desktop layouts differ significantly, you may see a layout flash on mobile devices after hydration. Consider using CSS media queries for critical layout differences to avoid this.
- **Initial Value**: On the first render in the browser, `isMobile` starts as `false` (because `useState(undefined)` becomes `!!undefined === false`). The correct value is set synchronously in the `useEffect`, but this means the first render always returns `false`.
- **Breakpoint is Exclusive**: The comparison is `window.innerWidth < breakpoint`, not `<=`. A viewport exactly `768px` wide is NOT considered mobile with the default breakpoint. This matches CSS `max-width: 767px` behavior.
- **matchMedia Listener**: The hook uses `matchMedia.addEventListener('change', ...)` for change detection rather than polling `window.innerWidth`. This is more efficient and fires only at the breakpoint boundary, not on every pixel of resize.
- **Dynamic Breakpoint Changes**: If the `breakpoint` prop changes between renders, the old media query listener is cleaned up and a new one is created. This is handled by the `useEffect` dependency array `[breakpoint]`.
- **No Touch Detection**: This hook detects viewport width only, not touch capability. A laptop with a narrow viewport will be detected as "mobile". For touch detection, use `'ontouchstart' in window` or the `pointer` media query separately.
- **Window Resize vs. Device Rotation**: The hook responds to both window resizing and device orientation changes, since both trigger the `matchMedia` change event.

## Related Hooks

- [useGeolocation](./use-geolocation-reference.md) -- Mobile devices often have different geolocation behavior and accuracy.
- [useInfiniteLoading](./use-infinite-loading-reference.md) -- Adjust page sizes based on mobile detection.
- [useMultiStepForm](./use-multi-step-form-reference.md) -- Adapt form layouts for mobile viewports.
