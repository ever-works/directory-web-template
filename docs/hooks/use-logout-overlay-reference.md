---
id: use-logout-overlay-reference
title: useLogoutOverlay Hook Reference
sidebar_label: useLogoutOverlay
sidebar_position: 112
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useLogoutOverlay

Provides a `handleLogout` function that signs the user out via NextAuth while displaying an animated, theme-aware fullscreen overlay with a spinner and status message. The overlay adapts to dark/light mode changes in real time and includes full accessibility support.

**Source:** `template/hooks/use-logout-overlay.ts`

## Signature

```ts
function useLogoutOverlay(): { handleLogout: (texts?: OverlayTexts) => Promise<void> };
```

## Parameters

The hook itself takes no parameters. The returned `handleLogout` function accepts an optional texts object:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `texts.title` | `string` | `'Signing Out'` | Heading displayed in the overlay card |
| `texts.description` | `string` | `'Please wait while we securely log you out and clear your session...'` | Body text displayed below the title |

## Return Value

```ts
const {
  handleLogout,  // (texts?: { title?: string; description?: string }) => Promise<void>
} = useLogoutOverlay();
```

| Property | Type | Description |
|----------|------|-------------|
| `handleLogout` | `(texts?) => Promise<void>` | Triggers the logout flow: shows overlay, calls `signOut`, redirects to `/` |

## Implementation Details

### Overlay Lifecycle

1. **Guard checks** -- Exits early if running server-side, if a logout is already in progress, or if an overlay element already exists in the DOM.
2. **Focus management** -- Stores a reference to `document.activeElement` before opening the overlay and restores focus in the `finally` block.
3. **DOM creation** -- Programmatically creates a fullscreen overlay with a centered card containing a spinner, title, and description. All elements use `data-*` attributes for easy querying.
4. **Theme colors** -- Reads the current theme via `getThemeColors()` from `@/utils/profile-button.utils` and applies the result to backgrounds, text, borders, and shadows.
5. **Sign out** -- Calls `signOut({ redirect: false })` from `next-auth/react`, then redirects to `/` via `window.location.href`.
6. **Cleanup** -- Disconnects the `MutationObserver`, removes the overlay from the DOM, and resets the `isLoggingOutRef` flag.

### Theme Reactivity

A `MutationObserver` watches the `class` attribute on `document.documentElement`. When the theme class changes (e.g., toggling between `dark` and `light`), all overlay colors are recalculated and reapplied without recreating the DOM elements.

### Concurrency Protection

- An `isLoggingOutRef` ref prevents multiple concurrent logout flows.
- A check for an existing overlay element (`LOGOUT_OVERLAY_CONFIG.ID`) acts as a second guard.

### Accessibility

| Feature | Implementation |
|---------|----------------|
| Dialog role | `role="dialog"` and `aria-modal="true"` on the overlay |
| Labelled by | `aria-labelledby="logout-overlay-title"` pointing to the title element |
| Spinner status | `role="status"`, `aria-live="polite"`, and `aria-busy="true"` on the spinner |
| Focus trap | Overlay is given `tabIndex={-1}` and focused programmatically |
| Focus restore | Previously focused element is refocused after cleanup |

### Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| Fade in (overlay) | Configured via `LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.FADE_IN` | `ease-out` |
| Slide in + scale (card) | Configured via `LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.SLIDE_IN` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Spin (spinner) | Configured via `LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.SPIN` | `linear`, infinite |

### Configuration

All sizing, z-index, color, and animation values are sourced from `LOGOUT_OVERLAY_CONFIG` in `@/constants/profile-button.constants`, keeping the hook free of magic numbers.

## Usage Examples

### Basic Logout Button

```tsx
import { useLogoutOverlay } from '@/hooks/use-logout-overlay';

function LogoutButton() {
  const { handleLogout } = useLogoutOverlay();

  return (
    <button onClick={() => handleLogout()}>
      Sign Out
    </button>
  );
}
```

### Custom Overlay Text

```tsx
function AccountMenu() {
  const { handleLogout } = useLogoutOverlay();

  const onLogout = () => {
    handleLogout({
      title: 'See you soon!',
      description: 'Cleaning up your session data...',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuItem onClick={onLogout}>
        Log Out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
```

### Inside a Profile Menu

```tsx
function ProfileDropdown() {
  const { handleLogout } = useLogoutOverlay();
  const { user } = useCurrentUser();

  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={() => handleLogout()}>
        Sign Out
      </button>
    </div>
  );
}
```

## Error Handling

If `signOut` throws an error, the overlay is removed from the DOM and the error is logged to the console. The `isLoggingOutRef` flag is reset so the user can retry.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `next-auth/react` | `signOut` function for session termination |
| `@/constants/profile-button.constants` | `LOGOUT_OVERLAY_CONFIG` -- IDs, sizes, colors, animation durations |
| `@/utils/profile-button.utils` | `getThemeColors` -- Resolves current theme to a color palette |

## Related Hooks

- [`useLogout`](/template/hooks/use-logout-reference) -- Simpler logout hook without the visual overlay
- [`useCurrentUser`](/template/hooks/use-current-user-reference) -- Fetches the authenticated user (often used alongside logout)
- [`useProfileMenu`](/template/hooks/use-profile-menu-reference) -- Profile menu state that commonly triggers logout
