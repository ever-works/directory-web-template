---
id: use-throttled-scroll-reference
title: useThrottledScroll Hook Reference
sidebar_label: useThrottledScroll
sidebar_position: 116
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useThrottledScroll

A reusable hook that attaches a scroll event listener to `window` with `requestAnimationFrame`-based throttling. Ensures the callback fires at most once per animation frame (~60 fps), making it ideal for scroll-driven UI updates such as sticky headers, progress indicators, and parallax effects.

**Source:** `template/hooks/use-throttled-scroll.ts`

## Signature

```ts
function useThrottledScroll(
  callback: () => void,
  enabled?: boolean
): void;
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `callback` | `() => void` | -- | Function to invoke on scroll (throttled to one call per animation frame) |
| `enabled` | `boolean` | `true` | When `false`, the scroll listener is not attached and any pending frame is cancelled |

## Return Value

This hook returns `void`. It manages the scroll listener as a side effect.

## Implementation Details

1. **RAF throttling** -- Instead of time-based throttling (e.g., lodash `throttle`), this hook uses `requestAnimationFrame`. This naturally syncs with the browser's paint cycle, guaranteeing exactly one callback invocation per frame.
2. **Passive listener** -- The scroll event is registered with `{ passive: true }` to signal to the browser that the handler will not call `preventDefault()`, enabling smoother scrolling performance.
3. **Guard mechanism** -- A `rafId` ref tracks the current animation frame request. If a frame is already pending (`rafId.current !== null`), subsequent scroll events are ignored until the frame executes and resets the ref.
4. **Cleanup** -- On unmount or when dependencies change, the effect removes the scroll listener and cancels any pending animation frame via `cancelAnimationFrame`.
5. **Enable/disable** -- When `enabled` is `false`, the effect returns early without attaching any listener, and any previously registered listener is cleaned up.

### How RAF Throttling Works

```
scroll event  -->  rafId is null?  --yes-->  requestAnimationFrame(callback)
                       |                            |
                      no                     callback runs, rafId = null
                       |
                   (skip event)
```

This ensures at most one callback execution per ~16.67 ms frame (at 60 fps), regardless of how many scroll events the browser fires.

## Usage Examples

### Sticky Header

```tsx
import { useThrottledScroll } from '@/hooks/use-throttled-scroll';

function StickyHeader() {
  const [isSticky, setIsSticky] = useState(false);

  useThrottledScroll(
    useCallback(() => {
      setIsSticky(window.scrollY > 100);
    }, [])
  );

  return (
    <header className={isSticky ? 'fixed top-0 shadow-md' : 'relative'}>
      <nav>...</nav>
    </header>
  );
}
```

### Scroll Progress Indicator

```tsx
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useThrottledScroll(
    useCallback(() => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;
      setProgress(Math.min(scrolled, 100));
    }, [])
  );

  return (
    <div className="fixed top-0 left-0 h-1 bg-blue-500 z-50" style={{ width: `${progress}%` }} />
  );
}
```

### Conditionally Enabled

```tsx
function ConditionalScroll() {
  const [trackScroll, setTrackScroll] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useThrottledScroll(
    useCallback(() => {
      setScrollY(window.scrollY);
    }, []),
    trackScroll
  );

  return (
    <div>
      <p>Scroll position: {scrollY}px</p>
      <button onClick={() => setTrackScroll((prev) => !prev)}>
        {trackScroll ? 'Pause Tracking' : 'Resume Tracking'}
      </button>
    </div>
  );
}
```

### Back-to-Top Button Visibility

```tsx
function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useThrottledScroll(
    useCallback(() => {
      setVisible(window.scrollY > 300);
    }, [])
  );

  if (!visible) return null;

  return (
    <button
      className="fixed bottom-4 right-4"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      Back to Top
    </button>
  );
}
```

:::tip Stabilize your callback
Wrap the callback in `useCallback` to prevent the effect from re-running on every render. The hook's `useEffect` depends on the `callback` reference.
:::

## Dependencies

This hook has no external dependencies beyond React (`useEffect`, `useRef`).

## Related Hooks

- [`useScrollToTop`](/template/hooks/use-scroll-to-top-reference) -- Provides a scroll-to-top action (commonly used with scroll tracking)
- [`useStickyState`](/template/hooks/use-sticky-state-reference) -- Persisted state that can be combined with scroll-driven UI
- [`useDebouncedValue`](/template/hooks/use-debounced-value-reference) -- Debouncing alternative when you need delayed updates rather than frame-synced
