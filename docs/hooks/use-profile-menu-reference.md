---
id: use-profile-menu-reference
title: useProfileMenu
sidebar_label: useProfileMenu
sidebar_position: 83
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useProfileMenu

A React hook that manages the open/close state, refs, and accessibility behavior for a profile dropdown menu. Handles click-outside dismissal, Escape key closing, and focus restoration to the trigger button.

## Import

```typescript
import { useProfileMenu } from '@/template/hooks/use-profile-menu';
```

## API Reference

### Parameters

```typescript
function useProfileMenu(): UseProfileMenuReturn;
```

This hook takes no parameters.

### Return Value

#### `UseProfileMenuReturn`

| Property | Type | Description |
|---|---|---|
| `isProfileMenuOpen` | `boolean` | Whether the profile dropdown menu is currently visible. |
| `menuRef` | `React.RefObject<HTMLDivElement>` | Ref to attach to the dropdown menu container element. Used for click-outside detection. |
| `buttonRef` | `React.RefObject<HTMLButtonElement>` | Ref to attach to the trigger button element. Used for click-outside detection and focus restoration. |
| `toggleMenu` | `() => void` | Toggles the menu open/closed. Memoized with `useCallback`. |
| `closeMenu` | `() => void` | Closes the menu and restores focus to the trigger button. Memoized with `useCallback`. |

## Usage Examples

### Basic Profile Dropdown

```tsx
import { useProfileMenu } from '@/template/hooks/use-profile-menu';

function ProfileDropdown() {
  const { isProfileMenuOpen, menuRef, buttonRef, toggleMenu, closeMenu } = useProfileMenu();

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        aria-expanded={isProfileMenuOpen}
        aria-haspopup="true"
      >
        <img src="/avatar.png" alt="Profile" className="w-8 h-8 rounded-full" />
      </button>

      {isProfileMenuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg"
        >
          <a href="/profile" role="menuitem" className="block px-4 py-2">
            My Profile
          </a>
          <a href="/settings" role="menuitem" className="block px-4 py-2">
            Settings
          </a>
          <button
            role="menuitem"
            onClick={() => {
              closeMenu();
              handleSignOut();
            }}
            className="block w-full text-left px-4 py-2"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
```

### With Navigation Actions

```tsx
import { useRouter } from 'next/navigation';
import { useProfileMenu } from '@/template/hooks/use-profile-menu';

function HeaderProfileMenu() {
  const router = useRouter();
  const { isProfileMenuOpen, menuRef, buttonRef, toggleMenu, closeMenu } = useProfileMenu();

  const handleNavigate = (path: string) => {
    closeMenu();
    router.push(path);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={toggleMenu}>
        Profile
      </button>

      {isProfileMenuOpen && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded">
          <button onClick={() => handleNavigate('/dashboard')}>Dashboard</button>
          <button onClick={() => handleNavigate('/settings')}>Settings</button>
          <button onClick={() => handleNavigate('/billing')}>Billing</button>
        </div>
      )}
    </div>
  );
}
```

## Implementation Details

- **Click-Outside Detection**: Registers a `mousedown` listener on `document` when the menu is open. The handler checks if the click target is outside both the `menuRef` and `buttonRef` elements. If so, the menu closes. The listener is only attached while the menu is open to avoid unnecessary event processing.
- **Escape Key Handling**: Registers a `keydown` listener on `document` when the menu is open. Pressing `Escape` closes the menu. The listener is cleaned up when the menu closes or the component unmounts.
- **Focus Restoration**: When the menu closes (via click-outside, Escape, or `closeMenu`), focus is programmatically returned to the trigger button using `buttonRef.current?.focus()`. This ensures keyboard users are not stranded.
- **SSR Safety**: All `document.addEventListener` calls are guarded with `typeof document !== 'undefined'` checks.
- **Memoized Handlers**: `handleClickOutside`, `handleEscape`, `toggleMenu`, and `closeMenu` are all wrapped in `useCallback` to maintain stable references and prevent unnecessary effect re-runs.

## Edge Cases and Gotchas

- **Ref Attachment Required**: Both `menuRef` and `buttonRef` must be attached to their respective DOM elements for click-outside detection to work. If either ref is not attached, clicks on that element will be treated as "outside" clicks.
- **Nested Menus**: This hook manages a single menu level. If you need nested submenus, you will need separate state management for each level or a more complex menu system.
- **Portal Rendering**: If the menu is rendered inside a portal (e.g., using `usePortal`), the `menuRef` must still be attached to the portal content. The click-outside detection uses DOM containment checks, which work regardless of where the element is in the DOM tree.
- **Animation**: The hook provides binary open/close state. If you need enter/exit animations, combine `isProfileMenuOpen` with a CSS transition or an animation library.

## Related Hooks

- [useOnClickOutside](./use-on-click-outside-reference.md) -- Generic click-outside detection that this hook implements internally.
- [usePortal](./use-portal-reference.md) -- Can be combined for rendering the dropdown in a portal to avoid overflow clipping.
- [useCurrentUser](./use-current-user-reference.md) -- Provides user data typically displayed in the profile menu.
