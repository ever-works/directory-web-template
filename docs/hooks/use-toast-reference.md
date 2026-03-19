---
id: use-toast-reference
title: useToast
sidebar_label: useToast
sidebar_position: 38
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useToast

A React hook for managing toast notifications using an in-memory state store with a reducer pattern. The hook provides a `toast` function for creating notifications and a `dismiss` function for removing them, along with reactive access to the current toast list.

This implementation is inspired by `react-hot-toast` and designed to work with the `@/components/ui/toast` component library.

## Import

```typescript
import { useToast, toast } from '@/hooks/use-toast';
```

Note: `toast` is also exported as a standalone function for use outside of React components.

## API Reference

### `useToast()`

```typescript
function useToast(): {
  toasts: ToasterToast[];
  toast: (props: Toast) => { id: string; dismiss: () => void; update: (props: ToasterToast) => void };
  dismiss: (toastId?: string) => void;
};
```

#### Return Value

| Property | Type | Description |
|---|---|---|
| `toasts` | `ToasterToast[]` | Array of currently active toasts. |
| `toast` | `(props: Toast) => ToastHandle` | Creates a new toast notification. Returns an object with `id`, `dismiss`, and `update` methods. |
| `dismiss` | `(toastId?: string) => void` | Dismisses a specific toast by ID, or all toasts if no ID is provided. |

### `toast()` (standalone)

```typescript
function toast(props: Toast): {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
};
```

Can be called outside of React components (e.g., in API utilities, service functions, or event handlers).

### Types

```typescript
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// Toast input (without id, which is auto-generated)
type Toast = Omit<ToasterToast, 'id'>;
```

The `ToastProps` and `ToastActionElement` types are imported from `@/components/ui/toast` and follow the Radix UI Toast primitive interface.

### Constants

| Constant | Value | Description |
|---|---|---|
| `TOAST_LIMIT` | `1` | Maximum number of visible toasts at once. New toasts replace older ones. |
| `TOAST_REMOVE_DELAY` | `1000000` (ms) | Delay before a dismissed toast is removed from the DOM (~16.7 minutes). |

## Usage Examples

### Basic Toast Notifications

```tsx
function NotificationDemo() {
  const { toast } = useToast();

  return (
    <div className="flex gap-2">
      <button
        onClick={() =>
          toast({
            title: 'Success',
            description: 'Your changes have been saved.',
          })
        }
      >
        Show Success
      </button>
      <button
        onClick={() =>
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Something went wrong. Please try again.',
          })
        }
      >
        Show Error
      </button>
    </div>
  );
}
```

### Toast with Action Button

```tsx
function UndoableAction() {
  const { toast } = useToast();

  const handleDelete = () => {
    // Perform delete...
    toast({
      title: 'Item deleted',
      description: 'The item has been removed.',
      action: (
        <ToastAction altText="Undo" onClick={handleUndo}>
          Undo
        </ToastAction>
      ),
    });
  };

  return <button onClick={handleDelete}>Delete Item</button>;
}
```

### Standalone Toast (Outside Components)

```tsx
// In an API utility or service file
import { toast } from '@/hooks/use-toast';

export async function saveSettings(data: Settings) {
  try {
    await api.put('/settings', data);
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated.',
    });
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Save failed',
      description: error.message,
    });
  }
}
```

### Updating an Existing Toast

```tsx
function ProgressToast() {
  const { toast: showToast } = useToast();

  const handleUpload = async () => {
    const { update, dismiss } = showToast({
      title: 'Uploading...',
      description: 'Starting upload',
    });

    for (let i = 0; i <= 100; i += 10) {
      await delay(200);
      update({
        id: '', // id is bound internally
        title: 'Uploading...',
        description: `Progress: ${i}%`,
      });
    }

    update({
      id: '',
      title: 'Upload complete',
      description: 'Your file has been uploaded successfully.',
    });

    setTimeout(dismiss, 3000);
  };

  return <button onClick={handleUpload}>Upload File</button>;
}
```

## Configuration

### Toast Component Setup

The `useToast` hook manages state only. You must render the `<Toaster />` component in your layout for toasts to be visible:

```tsx
// In your root layout or app component
import { Toaster } from '@/components/ui/toaster';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### Toast Variants

The toast system supports variants defined by your `@/components/ui/toast` component. Common variants include:

- **default** -- Standard informational toast.
- **destructive** -- Red/error-styled toast for failures.

Custom variants can be added by extending the toast component's `cva` configuration.

### Sonner Integration Note

Many hooks in this template (e.g., `useRolePermissions`, `useUrlExtraction`) use `toast` from `sonner` rather than this `useToast` hook. The two systems are independent. This `useToast` hook works with the Radix-based `@/components/ui/toast` components, while `sonner` provides its own rendering. Both can coexist in the same application.

## Edge Cases and Gotchas

- **Toast Limit**: Only 1 toast is visible at a time (`TOAST_LIMIT = 1`). Creating a new toast while one is already visible replaces the existing toast. If you need multiple simultaneous toasts, increase `TOAST_LIMIT` in the hook source.
- **Remove Delay**: Dismissed toasts are not removed from the DOM immediately. They remain for `TOAST_REMOVE_DELAY` milliseconds (approximately 16.7 minutes) to allow for exit animations. This is intentional but can cause memory buildup if many toasts are created rapidly.
- **Global State**: The toast state is stored in a module-level variable (`memoryState`), not in React context. This means all components share the same toast queue, and the `toast()` function works outside of the React tree.
- **Listener Pattern**: The hook subscribes to state changes via a listeners array. Each mounted `useToast` instance adds a listener. The effect cleanup removes the listener on unmount, but the dependency on `state` means it re-subscribes on every state change.
- **No Auto-Dismiss**: Unlike `sonner` or `react-hot-toast`, this hook does not auto-dismiss toasts after a timeout. The toast remains visible until explicitly dismissed. Implement auto-dismiss in your toast component or by calling `dismiss()` after a timeout.
- **ID Generation**: Toast IDs are generated using an incrementing counter. IDs are unique within a session but reset when the module is reloaded (during HMR, for example).

## Related Hooks

- [useRolePermissions](./use-role-permissions-reference.md) -- Uses `sonner` toast for mutation feedback (different toast system).
- [useUrlExtraction](./use-url-extraction-reference.md) -- Uses `sonner` toast for extraction error messages.
- [useMultiStepForm](./use-multi-step-form-reference.md) -- Show toast on step validation errors or form completion.
