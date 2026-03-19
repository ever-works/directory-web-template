---
id: use-portal-reference
title: usePortal
sidebar_label: usePortal
sidebar_position: 82
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePortal

A React hook that creates and manages a DOM container for rendering content outside the normal component hierarchy using `ReactDOM.createPortal`. Useful for modals, tooltips, dropdowns, and other overlay elements that need to escape parent overflow or z-index constraints.

## Import

```typescript
import { usePortal } from '@/template/hooks/use-portal';
```

## API Reference

### Parameters

```typescript
function usePortal(id?: string): HTMLDivElement | null;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `'portal-root'` | The ID of the shared portal root element appended to `document.body`. Multiple hook instances with the same `id` share the same root but each gets its own child container. |

### Return Value

| Type | Description |
|---|---|
| `HTMLDivElement \| null` | A reference to the portal container `div` element, or `null` on the initial render before the effect runs. Pass this to `ReactDOM.createPortal()` as the target. |

## Usage Examples

### Basic Modal Portal

```tsx
import { createPortal } from 'react-dom';
import { usePortal } from '@/template/hooks/use-portal';

function Modal({ isOpen, onClose, children }: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const portalTarget = usePortal('modal-root');

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
        {children}
      </div>
    </div>,
    portalTarget
  );
}
```

### Tooltip Portal

```tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePortal } from '@/template/hooks/use-portal';

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const portalTarget = usePortal('tooltip-root');

  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && portalTarget && createPortal(
        <div className="fixed z-50 px-2 py-1 bg-gray-900 text-white text-sm rounded">
          {text}
        </div>,
        portalTarget
      )}
    </div>
  );
}
```

### Multiple Portals with Separate Roots

```tsx
function App() {
  return (
    <>
      <NotificationLayer />  {/* uses usePortal('notification-root') */}
      <ModalLayer />          {/* uses usePortal('modal-root') */}
      <TooltipLayer />        {/* uses usePortal('tooltip-root') */}
    </>
  );
}
```

## Implementation Details

- **Shared Root, Unique Containers**: The hook looks for an existing element with the given `id` on `document.body`. If none exists, it creates one. Then it appends a new child `div` to this root for the specific hook instance. Multiple components using the same `id` share the root element but each gets its own isolated container.
- **Automatic Cleanup**: When the component unmounts, the hook removes its child container from the shared root. The shared root element itself remains in the DOM (it may be used by other components).
- **Effect-Based Creation**: The portal container is created inside a `useEffect`, which means it is `null` on the first render. Always guard against `null` before calling `createPortal`.
- **Ref-Based Container**: The hook stores the container in a `useRef` to maintain a stable reference across renders without causing re-renders when the DOM element is created.

## Edge Cases and Gotchas

- **Initial Null Value**: On the first render, the hook returns `null` because the effect has not run yet. Always check for `null` before using the return value with `createPortal`. This also means portal content will not appear during server-side rendering.
- **SSR Incompatibility**: The hook accesses `document` directly inside a `useEffect`, making it safe for SSR at the module level. However, the portal target is never available during server rendering -- content rendered through the portal will only appear on the client.
- **Cleanup on ID Change**: If the `id` parameter changes between renders, the old container is cleaned up and a new one is created under the new root. This is handled by the `useEffect` dependency on `id`.
- **Z-Index Management**: The hook does not manage z-index. You are responsible for applying appropriate `z-index` styles to the content rendered inside the portal.
- **Event Bubbling**: React events still bubble through the React component tree (not the DOM tree), so events from portal content bubble up to the React parent, not the DOM parent (`document.body`).

## Related Hooks

- [useComposedRef](./use-composed-ref-reference.md) -- Useful when portal-rendered elements need forwarded refs.
- [useOnClickOutside](./use-on-click-outside-reference.md) -- Commonly used with portals to close overlays when clicking outside.
- [useProfileMenu](./use-profile-menu-reference.md) -- Profile dropdown that could leverage portals for overlay rendering.
