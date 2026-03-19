---
id: use-composed-ref-reference
title: useComposedRef
sidebar_label: useComposedRef
sidebar_position: 81
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useComposedRef

A low-level React hook that merges a library-owned ref with a user-supplied ref into a single callback ref. This is essential for component libraries where an internal ref is needed for functionality (e.g., focus management, measurements) while still forwarding the ref to the consumer.

## Import

```typescript
import { useComposedRef } from '@/template/hooks/use-composed-ref';
// or
import useComposedRef from '@/template/hooks/use-composed-ref';
```

## API Reference

### Parameters

```typescript
function useComposedRef<T extends HTMLElement>(
  libRef: React.RefObject<T | null>,
  userRef: UserRef<T>
): (instance: T | null) => void;
```

| Parameter | Type | Description |
|---|---|---|
| `libRef` | `React.RefObject<T \| null>` | The internal ref object owned by the component/library. Updated with the DOM element instance. |
| `userRef` | `UserRef<T>` | The external ref provided by the consumer. Can be a callback ref, a `RefObject`, `null`, or `undefined`. |

### Return Value

| Type | Description |
|---|---|
| `(instance: T \| null) => void` | A memoized callback ref that should be attached to the target DOM element. It synchronizes both `libRef` and `userRef` with the current element instance. |

### Types

```typescript
type UserRef<T> =
  | ((instance: T | null) => void)
  | React.RefObject<T | null>
  | null
  | undefined;
```

## Usage Examples

### Forwarding Refs in a Component Library

```tsx
import { useRef, forwardRef } from 'react';
import { useComposedRef } from '@/template/hooks/use-composed-ref';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ label, ...props }, userRef) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const composedRef = useComposedRef(internalRef, userRef);

    const handleLabelClick = () => {
      // Use internal ref for focus management
      internalRef.current?.focus();
    };

    return (
      <div>
        <label onClick={handleLabelClick}>{label}</label>
        <input ref={composedRef} {...props} />
      </div>
    );
  }
);
```

### With Measurement Logic

```tsx
import { useRef, useEffect, forwardRef } from 'react';
import { useComposedRef } from '@/template/hooks/use-composed-ref';

const MeasuredDiv = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, userRef) => {
    const measureRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRef(measureRef, userRef);

    useEffect(() => {
      if (measureRef.current) {
        const { width, height } = measureRef.current.getBoundingClientRect();
        console.log(`Element size: ${width}x${height}`);
      }
    });

    return <div ref={composedRef} {...props} />;
  }
);
```

### With a Callback Ref Consumer

```tsx
function ParentComponent() {
  const handleRef = (element: HTMLDivElement | null) => {
    if (element) {
      console.log('Element mounted:', element.tagName);
    } else {
      console.log('Element unmounted');
    }
  };

  return <MeasuredDiv ref={handleRef}>Content</MeasuredDiv>;
}
```

## Implementation Details

- **Callback Ref Pattern**: The hook returns a callback ref (not a ref object) so React calls it whenever the DOM node mounts or unmounts. This ensures both refs are always in sync.
- **Previous Ref Cleanup**: The hook tracks the previous `userRef` via an internal `useRef`. When the `userRef` changes between renders, the old ref is cleaned up by setting it to `null` before the new ref is updated. This prevents stale references.
- **Ref Type Handling**: The internal `updateRef` helper handles both callback refs (`(instance) => void`) and object refs (`{ current: T }`) transparently via the `UserRef<T>` union type.
- **Memoization**: The composed callback is wrapped in `React.useCallback` with `[libRef, userRef]` as dependencies, preventing unnecessary re-attachments.
- **Client Directive**: The file includes `"use client"` since refs are inherently a client-side concept.

## Edge Cases and Gotchas

- **Null/Undefined User Ref**: Passing `null` or `undefined` as `userRef` is safe. The hook simply skips updating the user ref in those cases.
- **Changing Refs**: If the consumer changes their ref between renders (e.g., from one callback to another), the old callback is called with `null` before the new one receives the element. This matches React's built-in behavior for callback refs.
- **Generic Constraint**: The type parameter `T` is constrained to `HTMLElement`, so this hook is designed for DOM element refs. It will not work with component instance refs from class components.

## Related Hooks

- [usePortal](./use-portal-reference.md) -- Creates portal containers that may need composed refs for positioning.
- [useOnClickOutside](./use-on-click-outside-reference.md) -- Often combined with composed refs for click-outside detection on forwarded-ref components.
