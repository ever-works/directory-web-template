---
id: use-sticky-state-reference
title: "useStickyState Reference"
sidebar_label: "useStickyState"
sidebar_position: 44
---

# useStickyState

## Overview

`useStickyState` tracks whether an element has entered its sticky position during scrolling using the `IntersectionObserver` API. It works by observing a sentinel element placed above the sticky target -- when the sentinel scrolls out of view, the target is considered sticky. The file also exports a simpler `useStickyHeader` hook that uses a scroll-position threshold instead of `IntersectionObserver`.

## Import

```typescript
import { useStickyState, useStickyHeader } from "@/hooks/use-sticky-state";
```

## API Reference

### `useStickyState` Parameters

The hook accepts a single optional options object:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `threshold` | `number` | No | `0` | IntersectionObserver threshold (0--1). A value of `0` means the callback fires as soon as even one pixel is out of view. |
| `rootMargin` | `string` | No | `"0px"` | Root margin for the IntersectionObserver, following CSS margin syntax (e.g., `"-80px 0px 0px 0px"` for a fixed header offset). |
| `debug` | `boolean` | No | `false` | When `true`, logs intersection state changes to the console with detailed bounding rect and ratio information. |

### `useStickyState` Return Value

| Property | Type | Description |
|----------|------|-------------|
| `isSticky` | `boolean` | `true` when the sentinel element has scrolled out of view, indicating the target element is in its sticky position. |
| `sentinelRef` | `RefObject<HTMLDivElement \| null>` | Ref to attach to a sentinel element placed immediately above the sticky target. |
| `targetRef` | `RefObject<HTMLDivElement \| null>` | Ref to attach to the sticky element itself. Used for observation context. |

### `useStickyHeader` Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enableSticky` | `boolean` | No | `undefined` | When truthy, enables scroll listening. When falsy, the hook does nothing and always returns `isSticky: false`. |

### `useStickyHeader` Return Value

| Property | Type | Description |
|----------|------|-------------|
| `isSticky` | `boolean` | `true` when `window.scrollY` exceeds `250px` and `enableSticky` is `true`. |

## Usage Examples

### Basic Usage

```typescript
import { useStickyState } from "@/hooks/use-sticky-state";

function StickyNavbar() {
  const { isSticky, sentinelRef, targetRef } = useStickyState();

  return (
    <>
      <div ref={sentinelRef} className="h-1 w-full" />
      <nav
        ref={targetRef}
        className={`sticky top-0 z-10 transition-all duration-300 ${
          isSticky
            ? "bg-white shadow-lg dark:bg-gray-900"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          Navigation content
        </div>
      </nav>
    </>
  );
}
```

### Advanced Usage

```typescript
import { useStickyState } from "@/hooks/use-sticky-state";

function StickyFilterBar() {
  const { isSticky, sentinelRef, targetRef } = useStickyState({
    rootMargin: "-80px 0px 0px 0px", // Account for a fixed header
    threshold: 0,
    debug: process.env.NODE_ENV === "development",
  });

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      <div
        ref={targetRef}
        className={`sticky top-20 z-20 transition-all ${
          isSticky
            ? "rounded-lg border bg-card p-4 shadow-md"
            : "p-4"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className={isSticky ? "font-semibold" : ""}>
            Filters
          </span>
          {isSticky && <span className="text-sm text-muted-foreground">Pinned</span>}
        </div>
      </div>
    </>
  );
}
```

### Using useStickyHeader

```typescript
import { useStickyHeader } from "@/hooks/use-sticky-state";

function Header({ enableSticky = true }: { enableSticky?: boolean }) {
  const { isSticky } = useStickyHeader({ enableSticky });

  return (
    <header
      className={`transition-all ${
        isSticky ? "fixed top-0 left-0 right-0 shadow-lg" : "relative"
      }`}
    >
      Header content
    </header>
  );
}
```

## Integration Patterns

`useStickyState` relies on the browser's `IntersectionObserver` API, which is efficient and does not cause layout thrashing like scroll-event-based approaches. The sentinel element pattern is the recommended way to detect sticky positioning since CSS `position: sticky` does not fire any native events. The simpler `useStickyHeader` hook uses a passive scroll listener with a fixed threshold of `250px` and is designed specifically for the template's header component.

## Best Practices

- **Always place the sentinel element directly above the sticky target** in the DOM. The sentinel must be a visible (even if zero-height) element in the normal document flow.
- **Use `rootMargin` to account for fixed headers** -- if you have an 80px fixed header, set `rootMargin: "-80px 0px 0px 0px"` so the sentinel is considered "out of view" when it scrolls behind the header.
- **Use `useStickyState` for precise detection** with IntersectionObserver and `useStickyHeader` for simple scroll-threshold-based detection.
- **Apply CSS transitions to the sticky element** (not the sentinel) for smooth visual feedback when the sticky state changes.
- **Enable `debug` mode during development** to verify that intersection events fire at the correct scroll positions.

## Related Hooks

- [useScrollToTop](./use-scroll-to-top-reference.md) -- Often combined with sticky headers to provide a "back to top" button when the header is in sticky mode.
- [useHeaderSettings](./use-header-settings-reference.md) -- Provides configuration that may enable or disable sticky header behavior.
