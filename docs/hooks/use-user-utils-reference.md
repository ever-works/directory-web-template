---
id: use-user-utils-reference
title: useUserUtils Hook Reference
sidebar_label: useUserUtils
sidebar_position: 118
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useUserUtils

Derives commonly needed user properties -- profile path, admin status, display role label, and online status -- from the current authenticated user. Wraps `useCurrentUser` and memoizes all computed values to avoid unnecessary re-computation.

**Source:** `template/hooks/use-user-utils.ts`

## Signature

```ts
function useUserUtils(): UseUserUtilsResult;
```

## Parameters

This hook takes no parameters.

## Return Value

```ts
const {
  user,          // ExtendedUser | null -- The current authenticated user, or null if not logged in
  profilePath,   // string -- URL path to the user's profile page
  isAdmin,       // boolean -- Whether the user has admin privileges
  displayRole,   // RoleLabel -- Human-readable role label (e.g., "Admin", "User")
  onlineStatus,  // PresenceStatus -- Current online/presence status
  isLoading,     // boolean -- True while the user session is being fetched
} = useUserUtils();
```

### Type Definitions

```ts
type UseUserUtilsResult = {
  user: ExtendedUser | null;
  profilePath: string;
  isAdmin: boolean;
  displayRole: RoleLabel;
  onlineStatus: PresenceStatus;
  isLoading: boolean;
};
```

The `ExtendedUser`, `RoleLabel`, and `PresenceStatus` types are imported from `@/types/profile-button.types`.

| Property | Type | Default (when no user) | Description |
|----------|------|------------------------|-------------|
| `user` | `ExtendedUser \| null` | `null` | The full user object from the session |
| `profilePath` | `string` | Result of `getProfilePath(null)` | Computed profile URL path |
| `isAdmin` | `boolean` | `false` | `true` when `user.isAdmin === true` |
| `displayRole` | `RoleLabel` | `"User"` | Label derived from admin status via `getDisplayRole` |
| `onlineStatus` | `PresenceStatus` | `"online"` | Current presence state via `getOnlineStatus` |
| `isLoading` | `boolean` | -- | Proxied from `useCurrentUser` |

## Implementation Details

1. **Data source** -- Delegates user fetching entirely to `useCurrentUser()`, inheriting its caching and error handling.
2. **Two-level memoization** -- The hook uses two `useMemo` calls:
   - **Inner memo** (`userData`) -- Recomputes `profilePath`, `isAdmin`, `displayRole`, and `onlineStatus` only when the `user` reference changes.
   - **Outer memo** (`result`) -- Assembles the final return object, recomputing only when `userData` or `isLoading` changes. This ensures a stable object reference for consumers using shallow comparison.
3. **Null safety** -- When no user is available, sensible defaults are returned (`null` user, default profile path, `false` admin, `"User"` role, `"online"` status).
4. **Utility functions** -- All derivation logic is delegated to utility functions from `@/utils/profile-button.utils`:
   - `getProfilePath(user)` -- Builds the profile URL for the given user
   - `getDisplayRole(isAdmin)` -- Returns the human-readable role label
   - `getOnlineStatus()` -- Returns the current presence/online status

## Usage Examples

### Profile Button

```tsx
import { useUserUtils } from '@/hooks/use-user-utils';

function ProfileButton() {
  const { user, profilePath, displayRole, onlineStatus, isLoading } = useUserUtils();

  if (isLoading) return <Skeleton className="h-10 w-10 rounded-full" />;
  if (!user) return <LoginButton />;

  return (
    <Link href={profilePath}>
      <Avatar src={user.image} alt={user.name} />
      <span>{user.name}</span>
      <Badge>{displayRole}</Badge>
      <StatusIndicator status={onlineStatus} />
    </Link>
  );
}
```

### Admin Guard

```tsx
function AdminPanel({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useUserUtils();

  if (isLoading) return <Spinner />;
  if (!isAdmin) return <AccessDenied />;

  return <>{children}</>;
}
```

### Navigation with Role Display

```tsx
function UserNav() {
  const { user, displayRole, profilePath } = useUserUtils();

  if (!user) return null;

  return (
    <nav>
      <Link href={profilePath}>
        {user.name} ({displayRole})
      </Link>
    </nav>
  );
}
```

### Conditional Admin Actions

```tsx
function ItemActions({ itemId }: { itemId: string }) {
  const { isAdmin } = useUserUtils();

  return (
    <div>
      <ViewButton itemId={itemId} />
      {isAdmin && (
        <>
          <EditButton itemId={itemId} />
          <DeleteButton itemId={itemId} />
        </>
      )}
    </div>
  );
}
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@/hooks/use-current-user` | `useCurrentUser` -- Provides the authenticated user and loading state |
| `@/utils/profile-button.utils` | `getProfilePath`, `getDisplayRole`, `getOnlineStatus` -- Derivation logic |
| `@/types/profile-button.types` | `ExtendedUser`, `RoleLabel`, `PresenceStatus` type definitions |

## Related Hooks

- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) -- The underlying hook that fetches and caches user session data
- [`useProfileMenu`](/docs/template/hooks/use-profile-menu-reference) -- Profile dropdown menu state (often uses these same user properties)
- [`useIsDevOrAdmin`](/docs/template/hooks/use-is-dev-or-admin-reference) -- Lightweight admin/developer role check
- [`useRolePermissions`](/docs/template/hooks/use-role-permissions-reference) -- Granular permission checking based on user role
