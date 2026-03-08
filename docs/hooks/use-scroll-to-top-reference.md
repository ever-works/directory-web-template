---
id: use-scroll-to-top-reference
title: "useScrollToTop Reference"
sidebar_label: "useScrollToTop"
sidebar_position: 41
---

# useScrollToTop

## Overview

`useScrollToTop` provides smooth-scroll utilities with configurable easing functions, duration, and offset. Beyond simple scroll-to-top behavior, it also exposes a `navigateWithScroll` method that scrolls the page to the top before performing client-side navigation, preventing jarring mid-page route transitions. The hook uses `requestAnimationFrame` for buttery-smooth custom animations.

## Import

```typescript
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
```

## API Reference

### Parameters

The hook accepts a single optional options object:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `behavior` | `ScrollBehavior` | No | `"smooth"` | Scroll behavior. When set to `"smooth"`, the hook uses a custom `requestAnimationFrame` animation. Other values use the native `window.scrollTo` behavior. |
| `delay` | `number` | No | `150` | Base delay in milliseconds before navigation occurs after scrolling starts (used by `navigateWithScroll`). |
| `offset` | `number` | No | `0` | Target vertical scroll position in pixels. Use a value greater than `0` to scroll to a position below the top. |
| `threshold` | `number` | No | `50` | Minimum `window.scrollY` value (in pixels) before the page is considered "scrolled". Used by `isScrolled` and `navigateWithScroll`. |
| `duration` | `number` | No | `800` | Animation duration in milliseconds for the custom smooth scroll. |
| `easing` | `"linear" \| "easeInOut" \| "easeOut" \| "easeIn" \| "bounceOut"` | No | `"easeInOut"` | Easing function for the scroll animation. |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `scrollToTop` | `(customDuration?: number) => void` | Scrolls to the configured offset position. Accepts an optional custom duration override. |
| `navigateWithScroll` | `(path: string, scrollDuration?: number) => void` | Scrolls to top first, then navigates to the given path using the Next.js router. If the page is already near the top, navigates immediately. |
| `isScrolled` | `() => boolean` | Returns `true` if the current `window.scrollY` exceeds the configured threshold. |
| `smoothScrollTo` | `(targetY: number, customDuration?: number) => void` | Low-level method to animate scrolling to any vertical position with the configured easing. |

## Usage Examples

### Basic Usage

```typescript
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

function ScrollButton() {
  const { scrollToTop, isScrolled } = useScrollToTop();

  if (!isScrolled()) return null;

  return (
    <button onClick={() => scrollToTop()}>
      Back to Top
    </button>
  );
}
```

### Advanced Usage

```typescript
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

function ItemCard({ slug, title }: { slug: string; title: string }) {
  const { navigateWithScroll } = useScrollToTop({
    duration: 600,
    easing: "easeOut",
    delay: 100,
    threshold: 80,
  });

  return (
    <div
      className="cursor-pointer"
      onClick={() => navigateWithScroll(`/items/${slug}`)}
    >
      <h3>{title}</h3>
    </div>
  );
}
```

### Custom Easing with Bounce

```typescript
const { scrollToTop } = useScrollToTop({
  easing: "bounceOut",
  duration: 1200,
});

// Scroll with a playful bounce effect
scrollToTop();
```

## Integration Patterns

`useScrollToTop` uses the internationalized router from `@/i18n/navigation`, so all paths passed to `navigateWithScroll` are automatically locale-aware. The `navigateWithScroll` function sets a wait cursor on `document.body` during the scroll-then-navigate sequence and guards against duplicate navigations using an internal ref. On unmount, the hook cancels any in-progress `requestAnimationFrame` calls and resets cursor and navigation state.

## Best Practices

- **Use `navigateWithScroll` for card/list navigations** where the user may have scrolled deep into the page. This prevents the next page from loading at an awkward scroll position.
- **Choose appropriate easing** -- `easeInOut` works well for general UI, while `bounceOut` suits playful or marketing-oriented interactions.
- **Keep duration reasonable** (400--1000ms). Animations longer than one second can feel sluggish, especially on repeated interactions.
- **Adjust `threshold`** based on your header height to avoid triggering scroll-to-top when the user is already near the top.
- **Prefer the hook over raw `window.scrollTo`** for consistent behavior and automatic cleanup of animation frames.

## Related Hooks

- [useStickyState](./use-sticky-state-reference.md) -- Detects when a header becomes sticky, often paired with a scroll-to-top button.
- [useOnClickOutside](./use-on-click-outside-reference.md) -- Used alongside scroll-to-top in overlay-based navigation patterns.
