---
id: use-login-modal-reference
title: "useLoginModal Reference"
sidebar_label: "useLoginModal"
sidebar_position: 45
---

# useLoginModal

## Overview

`useLoginModal` is a Zustand-based global state store that controls the visibility and context of the login modal across the application. It manages open/close state along with an optional message (displayed to the user as a prompt) and an optional callback URL (where the user is redirected after successful authentication). Because it is a Zustand store, it can be used in any client component without prop drilling or context providers.

## Import

```typescript
import { useLoginModal } from "@/hooks/use-login-modal";
```

## API Reference

### Parameters

`useLoginModal` is a Zustand store hook and takes no parameters. Call it directly to access the store state and actions.

### Store Interface

```typescript
interface LoginModalStore {
  isOpen: boolean;
  message: string | undefined;
  callbackUrl: string | undefined;
  onOpen: (message?: string, callbackUrl?: string) => void;
  onClose: () => void;
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether the login modal is currently visible. |
| `message` | `string \| undefined` | Optional message displayed in the modal (e.g., "Please sign in to continue"). |
| `callbackUrl` | `string \| undefined` | Optional URL to redirect to after successful login. |
| `onOpen` | `(message?: string, callbackUrl?: string) => void` | Opens the modal. Optionally sets a custom message and/or callback URL. |
| `onClose` | `() => void` | Closes the modal and resets both `message` and `callbackUrl` to `undefined`. |

### Exported Types

| Type | Description |
|------|-------------|
| `LoginModalStore` | The full interface of the Zustand store. |
| `LoginModalReturn` | The return type of the `useLoginModal` hook (`ReturnType<typeof useLoginModal>`). |

## Usage Examples

### Basic Usage

```typescript
import { useLoginModal } from "@/hooks/use-login-modal";

function ProtectedButton() {
  const { onOpen } = useLoginModal();

  const handleClick = () => {
    onOpen("Sign in to access this feature");
  };

  return <button onClick={handleClick}>Premium Feature</button>;
}
```

### Advanced Usage

```typescript
import { useLoginModal } from "@/hooks/use-login-modal";

function FavoriteButton({ itemSlug }: { itemSlug: string }) {
  const { onOpen } = useLoginModal();
  const { data: session } = useSession();

  const handleFavorite = () => {
    if (!session) {
      // Open login modal with a redirect back to this item
      onOpen(
        "Sign in to save favorites",
        `/items/${itemSlug}`
      );
      return;
    }
    // Proceed with favorite action...
  };

  return (
    <button onClick={handleFavorite}>
      Add to Favorites
    </button>
  );
}
```

### Login Modal Component

```typescript
import { useLoginModal } from "@/hooks/use-login-modal";

function LoginModal() {
  const { isOpen, message, callbackUrl, onClose } = useLoginModal();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {message && <p className="text-muted-foreground">{message}</p>}
        <SignInForm callbackUrl={callbackUrl} />
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

## Integration Patterns

As a Zustand store created with `create`, `useLoginModal` is a singleton -- all components share the same state. This means calling `onOpen` from any component in the tree will open the modal rendered at the layout level. The store uses the `"use client"` directive, making it compatible only with client components. The `onClose` action resets all contextual data (message and callback URL), ensuring clean state for subsequent openings.

## Best Practices

- **Place the modal component at the layout level** (e.g., in your root layout or a providers wrapper) so it is always available regardless of which page the user is on.
- **Always provide a meaningful message** when calling `onOpen` to give users context about why they need to sign in.
- **Set `callbackUrl`** when the login is triggered by a specific action so the user returns to the right place after authentication.
- **Use `onClose` for cleanup** -- it automatically resets message and callback state, so you do not need to manage those separately.
- **Combine with `useOnClickOutside`** on the modal content element to allow dismissal by clicking the backdrop.

## Related Hooks

- [useOnClickOutside](./use-on-click-outside-reference.md) -- Attach to the modal content to close on backdrop clicks.
- [useCurrentUser](./use-current-user-reference.md) -- Check authentication state to determine when to show the login modal.
