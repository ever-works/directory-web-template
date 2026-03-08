---
id: state-management
title: "State Management"
sidebar_label: "State Management"
sidebar_position: 26
---

# State Management

The template uses a layered state management approach: **React Query** (TanStack Query) for server state, **React Context** for global UI settings, and **local component state** for ephemeral UI concerns. This page covers each layer, the query client configuration, and patterns used throughout the codebase.

## State Categories

| Category | Tool | Examples |
|----------|------|----------|
| Server state | React Query | User data, items, categories, admin stats |
| Global UI state | React Context | Theme, layout, pagination type, container width |
| Local UI state | `useState` / `useReducer` | Modal open/close, form inputs, dropdown visibility |
| Persisted preferences | `localStorage` via Context | Theme key, layout key, items per page |

## React Query Configuration

The query client is created in `lib/query-client.ts` using a factory function that handles both server and browser environments:

```tsx
// lib/query-client.ts
import { isServer, QueryClient } from '@tanstack/react-query';

export function createQueryClientInstance(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: (failureCount) => failureCount < 2,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          toast.error(`Mutation Error: ${error.message}`);
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return createQueryClientInstance();
  } else {
    if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
    return browserQueryClient;
  }
};
```

Key design decisions:
- **Server isolation**: a fresh `QueryClient` is created per server request to prevent data leaking between users
- **Browser singleton**: a single instance is reused across the browser session
- **Conservative refetching**: `refetchOnWindowFocus` and `refetchOnMount` are disabled by default to minimize network traffic
- **Exponential backoff**: retry delays double with each attempt, capped at 30 seconds

## Query Key Factory

A dedicated `react-query-config.ts` file defines query key factories for consistent cache management:

```tsx
// lib/react-query-config.ts
export const queryKeys = {
  billing: {
    all: ['billing'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    payments: () => [...queryKeys.billing.all, 'payments'] as const,
    user: (userId: string) => [...queryKeys.billing.all, 'user', userId] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
  },
};
```

This factory pattern enables targeted cache invalidation. For example, `invalidateQueries({ queryKey: queryKeys.billing.all })` clears all billing-related queries at once.

## Cache Invalidation Utilities

```tsx
// lib/react-query-config.ts
export const cacheUtils = {
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  resetCache: () => {
    queryClient.clear();
  },
};
```

## Prefetch Strategies

```tsx
export const prefetchStrategies = {
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => { /* API call */ },
      staleTime: 5 * 60 * 1000,
    });
  },
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => { /* API call */ },
      staleTime: 10 * 60 * 1000,
    });
  },
};
```

These are called proactively when users navigate to pages that will need this data.

## Hook Pattern: useCurrentUser

The `hooks/use-current-user.ts` hook demonstrates the standard data-fetching hook pattern:

```tsx
// hooks/use-current-user.ts
export const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error, refetch } =
    useQuery<User, UseCurrentUserError>({
      queryKey: CURRENT_USER_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 2;
      },
    });

  const invalidateUserCache = () => {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  };

  return { user, isLoading, isError, error, refetch, invalidateUserCache };
}
```

Pattern highlights:
- **Exported query key**: allows other hooks to invalidate or read this cache
- **Smart retry**: authentication errors are never retried
- **Cache helpers**: `invalidateUserCache`, `prefetchUser`, and `setUserData` are exposed for external use

## Optimistic Updates: useFavorites

The `hooks/use-favorites.ts` hook demonstrates optimistic update patterns:

```tsx
// hooks/use-favorites.ts (simplified)
const addFavoriteMutation = useMutation({
  mutationFn: addFavorite,
  onMutate: async (newFavorite) => {
    await queryClient.cancelQueries({ queryKey: ['favorites'] });
    const previousFavorites =
      queryClient.getQueryData<Favorite[]>(['favorites']) ?? [];

    // Optimistically add the item
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
      ...old,
      { id: `temp-${Date.now()}`, ...newFavorite },
    ]);

    return { previousFavorites };
  },
  onError: (err, _newFavorite, context) => {
    // Rollback on failure
    if (context) {
      queryClient.setQueryData(['favorites'], context.previousFavorites);
    }
    toast.error(err.message || 'Failed to add to favorites');
  },
  onSuccess: (realFavorite) => {
    // Replace temp item with server response
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
      old.map((fav) =>
        fav.id.startsWith('temp-') && fav.itemSlug === realFavorite.itemSlug
          ? realFavorite
          : fav
      )
    );
  },
});
```

The pattern follows three steps:
1. **onMutate**: cancel in-flight queries, snapshot state, apply optimistic update
2. **onError**: rollback to the snapshot
3. **onSuccess**: replace the optimistic data with the real server response

## Global UI State: LayoutThemeContext

The `components/context/LayoutThemeContext.tsx` provides a React Context for all global UI preferences:

```tsx
// components/context/LayoutThemeContext.tsx
interface LayoutThemeContextType {
  layoutKey: LayoutKey;
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;
  paginationType: PaginationType;
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
  // ... more settings
}
```

Each setting follows the same internal pattern using dedicated manager hooks:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);

  return { themeKey, setThemeKey, currentTheme };
};
```

Design principles:
- **Hydration safety**: state always initializes with defaults; localStorage is only read in `useEffect` after mount
- **Validation**: every setter validates input before applying
- **Persistence**: all preferences are synced to `localStorage` automatically
- **CSS variable sync**: theme changes immediately update CSS custom properties on `document.documentElement`

## Per-Hook Query Keys in Admin Hooks

Each admin CRUD hook defines its own query key namespace:

```tsx
// hooks/use-admin-categories.ts
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

Mutations invalidate at the namespace level to ensure all related queries are refreshed:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## File Reference

| File | Purpose |
|------|---------|
| `lib/query-client.ts` | Query client factory (server vs browser) |
| `lib/react-query-config.ts` | Query key factories, cache utilities, prefetch strategies |
| `lib/api/constants.ts` | Default stale times and query configuration constants |
| `components/context/LayoutThemeContext.tsx` | Global UI settings context with localStorage persistence |
| `hooks/use-current-user.ts` | Example data-fetching hook with cache management |
| `hooks/use-favorites.ts` | Example optimistic update pattern |
| `hooks/use-admin-categories.ts` | Example admin CRUD hook with query key namespacing |
