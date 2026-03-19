---
id: use-logout-reference
title: useLogout Hook Reference
sidebar_label: useLogout
sidebar_position: 92
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useLogout

A client-side hook that provides a logout function. Clears the user query cache, signs out via NextAuth, and redirects to the home page.

**Source file:** `template/hooks/use-logout.ts`

## Overview

`useLogout` encapsulates the full logout flow for the application. It handles three concerns in order: clearing the TanStack Query cache for the current user, calling NextAuth's `signOut` function, and performing a hard navigation to the home page. Error handling ensures that even if the sign-out API call fails, the local cache is still cleared to prevent stale user data from persisting.

This is a client component hook (marked with `"use client"`).

## Signature

```ts
function useLogout(): {
  logout: () => Promise<void>;
}
```

## Parameters

None. This hook takes no arguments.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `logout` | `() => Promise<void>` | Async function that executes the full logout flow |

## Implementation Details

The `logout` function performs the following steps:

1. **Clear user query cache** -- Removes all queries matching `CURRENT_USER_QUERY_KEY` from the TanStack Query cache. This ensures no stale user data is retained.
2. **Sign out via NextAuth** -- Calls `signOut({ redirect: false })` to invalidate the session server-side without an automatic redirect.
3. **Hard redirect** -- Sets `window.location.href = "/"` to navigate to the home page with a full page reload, ensuring all client state is reset.

### Error Handling

If the `signOut` call throws an error:
- The error is logged to the console.
- The query cache is cleared again as a safety measure to prevent stale user data.
- The function does not throw, so UI components will not crash.

## Usage Examples

### Logout button

```tsx
import { useLogout } from '@/hooks/use-logout';

function LogoutButton() {
  const { logout } = useLogout();

  return (
    <button onClick={logout}>
      Sign Out
    </button>
  );
}
```

### In a dropdown menu

```tsx
import { useLogout } from '@/hooks/use-logout';

function UserMenu() {
  const { logout } = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuItem>Profile</DropdownMenuItem>
      <DropdownMenuItem>Settings</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={logout}>
        Sign Out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
```

### With loading state

```tsx
import { useLogout } from '@/hooks/use-logout';
import { useState } from 'react';

function LogoutWithFeedback() {
  const { logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    // Note: the page will redirect, so this may not execute
  };

  return (
    <button onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `next-auth/react` | Provides `signOut` for session invalidation |
| `@tanstack/react-query` | Provides `useQueryClient` for cache management |
| `use-current-user` | Exports `CURRENT_USER_QUERY_KEY` for cache invalidation |

## Related Hooks

- [`useCurrentUser`](/template/hooks/use-current-user-reference) -- Fetches the current user; cache is cleared by `useLogout`
- [`useLoginModal`](/template/hooks/use-login-modal-reference) -- Opens the login modal for re-authentication
