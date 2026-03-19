---
id: use-current-user-reference
title: useCurrentUser Hook Reference
sidebar_label: useCurrentUser
sidebar_position: 36
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCurrentUser

Fetches and caches the current authenticated user's session data. Provides methods for cache management, prefetching, and manual data updates. The companion `useUserCache` hook offers global cache utilities.

**Source:** `template/hooks/use-current-user.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useCurrentUser` | Fetch and manage the current user's session data |
| `useUserCache` | Utility hook for user cache operations across the app |

## Exported Constants

```ts
const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;
```

This query key is exported so other hooks and components can reference it for cache operations.

---

## useCurrentUser

### Return Values

```ts
const {
  user,                // User | undefined -- NextAuth User object
  isLoading,           // boolean -- True while fetching with no cached data
  isError,             // boolean -- True if fetch failed
  error,               // UseCurrentUserError | null -- Error details
  refetch,             // () => void -- Manually refetch user data
  invalidateUserCache, // () => void -- Remove user data from cache entirely
  prefetchUser,        // () => Promise<void> -- Prefetch user data into cache
  setUserData,         // (userData: User | null) => void -- Manually set cached user data
} = useCurrentUser();
```

### User Type

The `User` type comes from `next-auth` and typically includes:

```ts
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  // Additional fields from your NextAuth configuration
}
```

### Error Type

```ts
interface UseCurrentUserError {
  message: string;
  status?: number;  // HTTP status code if available
}
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['auth-session']` |
| `staleTime` | 10 minutes |
| `gcTime` | 30 minutes |
| `refetchOnWindowFocus` | `false` |
| `refetchOnMount` | `false` |

### Retry Strategy

The hook uses a smart retry strategy that avoids retrying on expected error conditions:

| Error Type | Retry? |
|------------|--------|
| `401 Unauthorized` | No |
| `403 Forbidden` | No |
| `204 No Content` (no user data) | No |
| Network/server errors | Up to 2 attempts |

### Usage: Auth-Gated Content

```tsx
function ProfileSection() {
  const { user, isLoading, isError } = useCurrentUser();

  if (isLoading) return <Skeleton />;
  if (isError || !user) return <LoginPrompt />;

  return (
    <div>
      <Avatar src={user.image} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Usage: Prefetch on App Mount

```tsx
function AppLayout({ children }) {
  const { prefetchUser } = useCurrentUser();

  useEffect(() => {
    prefetchUser();
  }, [prefetchUser]);

  return <main>{children}</main>;
}
```

### Usage: Logout with Cache Clear

```tsx
function LogoutButton() {
  const { invalidateUserCache } = useCurrentUser();

  const handleLogout = async () => {
    invalidateUserCache();
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Usage: Optimistic Profile Update

```tsx
function ProfileForm() {
  const { user, setUserData, refetch } = useCurrentUser();

  const handleSave = async (formData) => {
    // Optimistically update the cache
    setUserData({ ...user, ...formData });

    try {
      await updateProfile(formData);
      // Refetch to get server-confirmed data
      refetch();
    } catch {
      // Rollback on error
      refetch();
    }
  };
}
```

---

## useUserCache

A utility hook for managing the user cache from anywhere in the application. Useful for cross-component cache coordination.

### Return Values

```ts
const {
  invalidateAllUserData, // () => void -- Mark user cache as stale, trigger refetch
  clearUserCache,        // () => void -- Completely remove user data from cache
  getUserFromCache,      // () => User | undefined -- Read user data without triggering a fetch
  setUserInCache,        // (userData: User | null) => void -- Write user data to cache
  isUserCached,          // () => boolean -- Check if user data exists in cache
} = useUserCache();
```

### Usage: Cache Check Before Protected Route

```tsx
function ProtectedRoute({ children }) {
  const { isUserCached, getUserFromCache } = useUserCache();

  if (!isUserCached()) {
    return <Redirect to="/login" />;
  }

  const user = getUserFromCache();
  if (!user) {
    return <Redirect to="/login" />;
  }

  return children;
}
```

### Usage: Cross-Component Cache Sync

```tsx
function AuthCallback() {
  const { setUserInCache } = useUserCache();

  useEffect(() => {
    // After OAuth callback, manually set user data
    // before the query has a chance to refetch
    const userData = parseCallbackData();
    if (userData) {
      setUserInCache(userData);
    }
  }, []);
}
```

## Cache Invalidation Patterns

| Scenario | Method | Effect |
|----------|--------|--------|
| User logs out | `invalidateUserCache()` or `clearUserCache()` | Removes all cached session data |
| Profile updated | `refetch()` | Fetches fresh data from server |
| Optimistic update | `setUserData(newData)` | Writes directly to cache |
| Check auth state | `isUserCached()` + `getUserFromCache()` | Reads cache without network request |

## Error Handling

The hook wraps all errors into a consistent `UseCurrentUserError` format:

```tsx
function AuthErrorBanner() {
  const { isError, error } = useCurrentUser();

  if (!isError || !error) return null;

  if (error.status === 401) {
    return <Banner>Please sign in to continue</Banner>;
  }

  return <Banner>Something went wrong: {error.message}</Banner>;
}
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Query caching and state management |
| `next-auth` | `User` type definition |
| `@/lib/api/server-api-client` | API communication |

## Related Hooks

- [`useSubscription`](/template/hooks/use-subscription-reference) - Subscription management (depends on user auth)
- [`useFavorites`](/template/hooks/use-favorites-reference) - Gated by `user.id`
- [`useItemVote`](/template/hooks/use-voting-reference) - Requires authenticated user for voting
- [`useComments`](/template/hooks/use-comments-reference) - Requires authenticated user for commenting
- [`useIsDevOrAdmin`](/template/hooks/auth-hooks) - Role-based access control
- [`useRolePermissions`](/template/hooks/auth-hooks) - Permission checking
