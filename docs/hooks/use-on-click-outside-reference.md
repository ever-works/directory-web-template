---
id: use-on-click-outside-reference
title: "useOnClickOutside Reference"
sidebar_label: "useOnClickOutside"
sidebar_position: 40
---

# useOnClickOutside

## Overview

`useOnClickOutside` detects clicks and touch events that occur outside a referenced DOM element. It is commonly used to close dropdowns, modals, popovers, and other overlay components when the user interacts with the rest of the page. The hook returns a ref that you attach to the element you want to monitor.

## Import

```typescript
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
```

## API Reference

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handler` | `(event: MouseEvent \| TouchEvent) => void` | Yes | Callback function invoked when a click or touch occurs outside the referenced element. |

### Generic Type Parameter

| Parameter | Constraint | Default | Description |
|-----------|-----------|---------|-------------|
| `T` | `HTMLElement` | `HTMLElement` | The type of the DOM element the returned ref will be attached to. |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `RefObject<T \| null>` | A React ref to attach to the target element. Clicks outside this element trigger the handler. |

## Usage Examples

### Basic Usage

```typescript
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useState } from "react";

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useOnClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
  });

  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <ul className="dropdown-menu">
          <li>Option A</li>
          <li>Option B</li>
        </ul>
      )}
    </div>
  );
}
```

### Advanced Usage

```typescript
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useState, useCallback } from "react";

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");

  const handleClickOutside = useCallback(
    (event: MouseEvent | TouchEvent) => {
      // Only close if the user is not interacting with a toast notification
      const target = event.target as HTMLElement;
      if (!target.closest("[data-toast]")) {
        onClose();
      }
    },
    [onClose]
  );

  const ref = useOnClickOutside<HTMLDivElement>(handleClickOutside);

  return (
    <div ref={ref} className="search-overlay">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
    </div>
  );
}
```

## Integration Patterns

`useOnClickOutside` pairs well with modal and dropdown components throughout the template. It is frequently combined with state hooks or Zustand stores (such as `useLoginModal`) to manage open/close states. The hook listens on both `mousedown` and `touchstart` events with `{ passive: true }` for optimal scroll performance on mobile devices.

## Best Practices

- **Memoize the handler** with `useCallback` to avoid unnecessary re-subscriptions of the document event listeners on every render.
- **Attach the ref to the outermost wrapper** of the component you want to protect, ensuring all child elements are contained within it.
- **Specify the generic type** (e.g., `useOnClickOutside<HTMLDivElement>`) for correct TypeScript inference on the returned ref.
- **Avoid nesting multiple click-outside hooks** on overlapping elements; instead, coordinate through a single parent handler or a shared state store.
- **Combine with focus trapping** for accessibility-critical overlays like modals, since click-outside alone does not handle keyboard navigation.

## Related Hooks

- [useLoginModal](./use-login-modal-reference.md) -- Zustand store for the login modal that benefits from click-outside dismissal.
- [useStickyState](./use-sticky-state-reference.md) -- Tracks sticky positioning, often used alongside overlays.
- [useScrollToTop](./use-scroll-to-top-reference.md) -- Scroll utilities that may be combined with overlay dismissal logic.
