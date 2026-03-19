---
id: ui-hooks
title: UI Utility Hooks
sidebar_label: UI Utility Hooks
sidebar_position: 4
---

# UI Utility Hooks

A collection of hooks for common UI concerns: responsive detection, scroll behavior, sticky elements, click-outside detection, portals, and ref composition.

## useIsMobile

Detects whether the viewport is below a given breakpoint using `window.matchMedia`.

```
useIsMobile(breakpoint?: number): boolean
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `breakpoint` | `number` | `768` | Pixel width threshold for mobile detection |

**Returns:** `boolean` -- `true` when `window.innerWidth < breakpoint`.

```tsx
import { useIsMobile } from '@/hooks/use-mobile';

function ResponsiveLayout() {
  const isMobile = useIsMobile();
  // Custom breakpoint
  const isTablet = useIsMobile(1024);

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

---

## useScrollToTop

Provides smooth-scroll-to-top functionality with configurable easing, plus a helper that scrolls first then navigates to a new route.

```
useScrollToTop(options?: UseScrollToTopOptions): {
  scrollToTop: (customDuration?: number) => void;
  navigateWithScroll: (path: string, scrollDuration?: number) => void;
  isScrolled: () => boolean;
  smoothScrollTo: (targetY: number, customDuration?: number) => void;
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `behavior` | `ScrollBehavior` | `"smooth"` | Native scroll behavior fallback |
| `delay` | `number` | `150` | Base delay (ms) before navigation after scroll |
| `offset` | `number` | `0` | Target scroll Y position |
| `threshold` | `number` | `50` | Pixel threshold for `isScrolled()` |
| `duration` | `number` | `800` | Animation duration in ms |
| `easing` | `string` | `"easeInOut"` | One of `linear`, `easeInOut`, `easeOut`, `easeIn`, `bounceOut` |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `scrollToTop` | `(customDuration?) => void` | Scroll to `offset` with animation |
| `navigateWithScroll` | `(path, scrollDuration?) => void` | Scroll to top then route to `path` |
| `isScrolled` | `() => boolean` | Returns `true` if past `threshold` |
| `smoothScrollTo` | `(targetY, customDuration?) => void` | Scroll to arbitrary Y position |

```tsx
import { useScrollToTop } from '@/hooks/use-scroll-to-top';

function BackToTop() {
  const { scrollToTop, isScrolled } = useScrollToTop({
    duration: 600,
    easing: 'bounceOut',
  });

  if (!isScrolled()) return null;
  return <button onClick={() => scrollToTop()}>Back to Top</button>;
}
```

---

## useStickyState

Tracks whether an element has become sticky using `IntersectionObserver` on a sentinel element placed above the sticky target.

```
useStickyState(options?: UseStickyStateOptions): {
  isSticky: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  targetRef: React.RefObject<HTMLDivElement | null>;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `threshold` | `number` | `0` | IntersectionObserver threshold (0-1) |
| `rootMargin` | `string` | `"0px"` | IntersectionObserver root margin |
| `debug` | `boolean` | `false` | Log state changes to console |

```tsx
const { isSticky, sentinelRef, targetRef } = useStickyState();

return (
  <>
    <div ref={sentinelRef} className="h-4 w-full" />
    <div
      ref={targetRef}
      className={`sticky top-0 ${isSticky ? 'shadow-lg' : ''}`}
    >
      Header content
    </div>
  </>
);
```

### useStickyHeader

A simpler scroll-position-based sticky detector with a fixed 250px threshold.

```
useStickyHeader({ enableSticky }: { enableSticky?: boolean }): { isSticky: boolean }
```

---

## useSkeletonVisibility

Controls skeleton loading display so that skeletons only appear on initial page loads, not during client-side navigation.

```
useSkeletonVisibility(isLoading: boolean, hasData?: boolean): boolean
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `isLoading` | `boolean` | -- | Current loading state from data fetching |
| `hasData` | `boolean` | `false` | Whether data already exists |

**Returns:** `boolean` -- `true` only when it is the initial page load AND data is loading AND no data exists yet.

```tsx
const showSkeleton = useSkeletonVisibility(isLoading, items.length > 0);

return showSkeleton ? <ItemSkeleton /> : <ItemList items={items} />;
```

---

## useThrottledScroll

Attaches a scroll listener throttled via `requestAnimationFrame` for optimal 60fps performance.

```
useThrottledScroll(callback: () => void, enabled?: boolean): void
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `callback` | `() => void` | -- | Function called on each animation frame during scroll |
| `enabled` | `boolean` | `true` | Toggle the scroll listener on/off |

```tsx
const handleScroll = useCallback(() => {
  setScrollY(window.scrollY);
}, []);

useThrottledScroll(handleScroll, isActive);
```

---

## useOnClickOutside

Detects clicks (mouse and touch) outside a referenced element and invokes a handler.

```
useOnClickOutside<T extends HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void
): RefObject<T | null>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `handler` | `(event) => void` | Called when a click occurs outside the referenced element |

**Returns:** `RefObject<T | null>` -- Attach this ref to the element you want to monitor.

```tsx
const dropdownRef = useOnClickOutside<HTMLDivElement>(() => {
  setIsOpen(false);
});

return <div ref={dropdownRef}>{isOpen && <DropdownMenu />}</div>;
```

---

## usePortal

Creates and manages a portal container DOM element for rendering content outside the normal DOM hierarchy.

```
usePortal(id?: string): HTMLDivElement | null
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | `"portal-root"` | ID for the portal root element in the document body |

**Returns:** `HTMLDivElement | null` -- The portal container, or `null` before mount.

```tsx
import { createPortal } from 'react-dom';

const portalTarget = usePortal('modal-portal');

return (
  <>
    <button onClick={() => setOpen(true)}>Open</button>
    {portalTarget && open &&
      createPortal(<Modal onClose={() => setOpen(false)} />, portalTarget)
    }
  </>
);
```

---

## useComposedRef

Composes a library-owned ref with a user-supplied ref (callback or object) into a single callback ref. Useful in component libraries that need to forward refs while keeping an internal reference.

```
useComposedRef<T extends HTMLElement>(
  libRef: React.RefObject<T | null>,
  userRef: UserRef<T>
): (instance: T | null) => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `libRef` | `RefObject<T \| null>` | The library's internal ref object |
| `userRef` | `UserRef<T>` | A callback ref, ref object, `null`, or `undefined` from the consumer |

**Returns:** A callback ref that updates both refs when the DOM node mounts/unmounts.

```tsx
const internalRef = useRef<HTMLDivElement>(null);
const composedRef = useComposedRef(internalRef, forwardedRef);

return <div ref={composedRef}>...</div>;
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useIsMobile` | Responsive breakpoint detection | `use-mobile.ts` |
| `useScrollToTop` | Smooth scroll with easing + navigate | `use-scroll-to-top.ts` |
| `useStickyState` | IntersectionObserver sticky detection | `use-sticky-state.ts` |
| `useStickyHeader` | Simple scroll-based sticky detection | `use-sticky-state.ts` |
| `useSkeletonVisibility` | Initial-load-only skeleton display | `use-skeleton-visibility.ts` |
| `useThrottledScroll` | RAF-throttled scroll listener | `use-throttled-scroll.ts` |
| `useOnClickOutside` | Click-outside detection | `use-on-click-outside.ts` |
| `usePortal` | Portal container management | `use-portal.ts` |
| `useComposedRef` | Compose multiple refs | `use-composed-ref.ts` |
