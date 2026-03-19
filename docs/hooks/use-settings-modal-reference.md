---
id: use-settings-modal-reference
title: useSettingsModal Hook Reference
sidebar_label: useSettingsModal
sidebar_position: 115
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSettingsModal

Provides access to the settings modal open/close state and control methods. This is a thin context consumer hook that reads from `SettingsModalProvider`.

**Source:** `template/hooks/use-settings-modal.tsx`

## Signature

```ts
function useSettingsModal(): SettingsModalContextValue;
```

## Parameters

This hook takes no parameters.

## Return Value

```ts
const {
  isOpen,       // boolean -- Whether the settings modal is currently open
  openModal,    // () => void -- Open the settings modal
  closeModal,   // () => void -- Close the settings modal and restore focus
  toggleModal,  // () => void -- Toggle the settings modal open/closed
} = useSettingsModal();
```

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Current open state of the settings modal |
| `openModal` | `() => void` | Opens the modal; stores the currently focused element for later restoration |
| `closeModal` | `() => void` | Closes the modal; restores focus to the element that was focused before opening |
| `toggleModal` | `() => void` | Toggles between open and closed states |

## Implementation Details

1. **Context consumer** -- Reads from `SettingsModalContext` provided by `SettingsModalProvider` in `@/components/providers/settings-modal-provider`.
2. **Error boundary** -- Throws a descriptive error if used outside of a `SettingsModalProvider`, making misconfiguration easy to diagnose.
3. **Client component** -- Marked with `"use client"` since it depends on React context and browser APIs.

### Provider Behavior

The `SettingsModalProvider` (not part of this hook, but the source of its data) handles:

| Feature | Details |
|---------|---------|
| **Focus management** | Saves `document.activeElement` on open and restores it on close |
| **Escape key** | Listens for the `Escape` key while the modal is open and calls `closeModal` |
| **Scroll lock** | Sets `document.body.style.overflow = 'hidden'` while the modal is open |
| **Stable callbacks** | `openModal`, `closeModal`, and `toggleModal` are memoized with `useCallback` |

## Usage Examples

### Settings Button

```tsx
import { useSettingsModal } from '@/hooks/use-settings-modal';

function SettingsButton() {
  const { openModal } = useSettingsModal();

  return (
    <button onClick={openModal}>
      <GearIcon /> Settings
    </button>
  );
}
```

### Conditional Rendering Based on Modal State

```tsx
function SettingsOverlay() {
  const { isOpen, closeModal } = useSettingsModal();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <SettingsForm />
        <button onClick={closeModal}>Close</button>
      </div>
    </div>
  );
}
```

### Toggle in Navigation

```tsx
function NavBar() {
  const { isOpen, toggleModal } = useSettingsModal();

  return (
    <nav>
      <Logo />
      <button onClick={toggleModal} aria-expanded={isOpen}>
        {isOpen ? 'Close Settings' : 'Open Settings'}
      </button>
    </nav>
  );
}
```

### Provider Setup

The hook requires `SettingsModalProvider` to be present in the component tree. Typically placed in the root layout:

```tsx
// app/layout.tsx
import { SettingsModalProvider } from '@/components/providers/settings-modal-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SettingsModalProvider>
          {children}
        </SettingsModalProvider>
      </body>
    </html>
  );
}
```

## Error Handling

If `useSettingsModal` is called outside of a `SettingsModalProvider`, it throws:

```
Error: useSettingsModal must be used within SettingsModalProvider
```

Ensure the provider wraps all components that need access to the settings modal state.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@/components/providers/settings-modal-provider` | `SettingsModalContext` and `SettingsModalContextValue` type |

## Related Hooks

- [`useLoginModal`](/template/hooks/use-login-modal-reference) -- Similar modal pattern for the login dialog
- [`useSecuritySettings`](/template/hooks/use-security-settings-reference) -- Security-specific settings management
- [`useHeaderSettings`](/template/hooks/use-header-settings-reference) -- Header configuration settings
- [`useFooterSettings`](/template/hooks/use-footer-settings-reference) -- Footer configuration settings
