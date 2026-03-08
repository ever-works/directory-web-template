---
id: how-to-add-a-new-hook
title: "How to Add a New Hook"
sidebar_label: "Add a New Hook"
sidebar_position: 6
---

# How to Add a New Hook

This guide covers best practices for creating custom React hooks in the template, including naming conventions, React Query integration, cache key management, error handling, and testing.

## Prerequisites

- Familiarity with React hooks and React Query (TanStack Query)
- Understanding of the `serverClient` API client from `@/lib/api/server-api-client`
- Development server running (`pnpm dev`)

---

## Architecture Overview

Custom hooks live in the `hooks/` directory and follow consistent patterns:

```
hooks/
  index.ts                        # Re-exports (barrel file)
  use-current-user.ts             # Auth/session hooks
  use-admin-items.ts              # Admin data hooks
  use-comments.ts                 # Feature-specific hooks
  use-bookmarks.ts                # Your new hook
  use-debounced-value.ts          # Utility hooks
```

Most hooks wrap React Query and the shared API client to provide a clean interface for components.

---

## Naming Conventions

| Pattern | Purpose | Examples |
|---------|---------|---------|
| `use-{feature}.ts` | Client-facing feature data | `use-comments.ts`, `use-favorites.ts` |
| `use-admin-{feature}.ts` | Admin panel data | `use-admin-items.ts`, `use-admin-users.ts` |
| `use-{utility}.ts` | Generic reusable utility | `use-debounced-value.ts`, `use-local-storage.ts` |
| `use-{provider}-{feature}.ts` | Provider-specific logic | `use-stripe-products.ts`, `use-polar-checkout.ts` |

File names always use **kebab-case**. The exported function uses **camelCase**: `use-bookmarks.ts` exports `useBookmarks()`.

---

## Step 1: Create the Hook File

```ts
// hooks/use-notifications.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
```

Always start with the `'use client'` directive since hooks run on the client.

---

## Step 2: Define Types and Query Keys

Define your data types and query key constants at the top of the file:

```ts
// Types
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface NotificationParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// Query keys -- centralized and composable
const QUERY_KEYS = {
  notifications: ['notifications'] as const,
  notificationList: (params: NotificationParams) =>
    [...QUERY_KEYS.notifications, 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};
```

**Query key conventions:**
- Use `as const` for type safety.
- Nest keys hierarchically so you can invalidate at different levels.
- Include parameters in the key array for automatic refetching when params change.

---

## Step 3: Implement the Fetch Function

Extract the API call into a standalone async function:

```ts
// API fetch functions
const fetchNotifications = async (
  params: NotificationParams,
): Promise<NotificationListResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true');

  const response = await serverClient.get<NotificationListResponse>(
    `/api/notifications?${searchParams}`,
  );

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch notifications');
  }

  return response.data;
};
```

---

## Step 4: Build the Query Hook

```ts
export function useNotifications(params: NotificationParams = {}) {
  const queryClient = useQueryClient();

  // --- Queries ---
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.notificationList(params),
    queryFn: () => fetchNotifications(params),
    staleTime: 2 * 60 * 1000,        // 2 minutes
    gcTime: 10 * 60 * 1000,           // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // --- Mutations ---
  const { mutateAsync: markAsRead, isPending: isMarkingRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await serverClient.patch(
        `/api/notifications/${notificationId}`,
        { read: true },
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate both the list and unread count
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications,
      });
    },
  });

  const { mutateAsync: markAllAsRead } = useMutation({
    mutationFn: async () => {
      const response = await serverClient.post(
        '/api/notifications/mark-all-read',
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications,
      });
    },
  });

  // --- Derived state ---
  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    isError,
    error,
    refetch,
    markAsRead,
    isMarkingRead,
    markAllAsRead,
  };
}
```

---

## Step 5: Add Cache Management Utilities (Optional)

For hooks that manage important state, provide cache utility functions:

```ts
/**
 * Utility hook for managing notification cache
 */
export function useNotificationCache() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.notifications,
    });
  };

  const clearCache = () => {
    queryClient.removeQueries({
      queryKey: QUERY_KEYS.notifications,
    });
  };

  const setNotificationsInCache = (notifications: Notification[]) => {
    queryClient.setQueryData(
      QUERY_KEYS.notificationList({}),
      (old: any) => ({
        ...old,
        notifications,
      }),
    );
  };

  return { invalidateAll, clearCache, setNotificationsInCache };
}
```

---

## Step 6: Add Optimistic Updates (When Appropriate)

For actions where the user expects instant feedback:

```ts
const { mutateAsync: toggleRead } = useMutation({
  mutationFn: async (notificationId: string) => {
    const response = await serverClient.patch(
      `/api/notifications/${notificationId}/toggle-read`,
    );
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    return response.data;
  },
  // Optimistic update
  onMutate: async (notificationId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: QUERY_KEYS.notifications,
    });

    // Snapshot previous state
    const previous = queryClient.getQueryData(
      QUERY_KEYS.notificationList(params),
    );

    // Optimistically update
    queryClient.setQueryData(
      QUERY_KEYS.notificationList(params),
      (old: any) => ({
        ...old,
        notifications: old.notifications.map((n: Notification) =>
          n.id === notificationId ? { ...n, read: !n.read } : n,
        ),
      }),
    );

    return { previous };
  },
  onError: (_err, _id, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(
        QUERY_KEYS.notificationList(params),
        context.previous,
      );
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.notifications,
    });
  },
});
```

---

## Step 7: Export from the Barrel File

Add your hook to the `hooks/index.ts` barrel file:

```ts
// hooks/index.ts

export { useNotifications, useNotificationCache } from './use-notifications';
```

---

## Stale Time and Cache Time Guidelines

| Data Type | `staleTime` | `gcTime` | Notes |
|-----------|-------------|----------|-------|
| Session/auth data | 10 min | 30 min | Rarely changes, reduce requests |
| Admin lists | 30 sec | 5 min | Needs fresher data for multi-user admin |
| User content | 2 min | 10 min | Balance between freshness and performance |
| Static config | 30 min | 60 min | Rarely changes, safe to cache aggressively |
| Real-time data | 0 | 1 min | Always refetch, minimal caching |

---

## Error Handling Patterns

### Don't Retry Auth Errors

```ts
retry: (failureCount, error) => {
  if (error.status === 401 || error.status === 403) return false;
  return failureCount < 2;
},
```

### Show Login Modal on Unauthorized

```ts
import { useLoginModal } from './use-login-modal';

// Inside mutation
onError: (error) => {
  if (error.message.includes('Unauthorized')) {
    loginModal.onOpen('Please sign in to continue');
  }
},
```

### Toast Notifications for Mutations

```ts
import { toast } from 'sonner';

onSuccess: () => {
  toast.success('Notification marked as read');
},
onError: (error) => {
  toast.error(error.message || 'Something went wrong');
},
```

---

## Utility Hooks (Non-Query)

Not all hooks use React Query. Utility hooks follow simpler patterns:

```ts
// hooks/use-debounced-value.ts

'use client';

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

---

## Complete File Template

```ts
// hooks/use-{feature}.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { toast } from 'sonner';

// --- Types ---
interface FeatureItem {
  id: string;
  // ... fields
}

interface FeatureParams {
  page?: number;
  limit?: number;
}

// --- Query Keys ---
const QUERY_KEYS = {
  feature: ['feature'] as const,
  featureList: (params: FeatureParams) =>
    [...QUERY_KEYS.feature, 'list', params] as const,
};

// --- API Functions ---
const fetchFeatureItems = async (params: FeatureParams) => {
  const response = await serverClient.get(`/api/feature?page=${params.page}`);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data;
};

// --- Hook ---
export function useFeature(params: FeatureParams = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.featureList(params),
    queryFn: () => fetchFeatureItems(params),
    staleTime: 2 * 60 * 1000,
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: async (item: Partial<FeatureItem>) => {
      const response = await serverClient.post('/api/feature', item);
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feature });
      toast.success('Item created');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    createItem,
  };
}
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Hook causes infinite re-renders | Ensure query keys include all parameters as dependencies. Avoid creating new object references on every render. |
| Mutation does not update the list | Check that `invalidateQueries` uses the correct parent key (e.g., `QUERY_KEYS.feature`, not the specific list key). |
| Stale data after navigation | Use `refetchOnMount: true` or reduce `staleTime` for data that changes frequently. |
| Missing `'use client'` directive | All hooks that use React Query or browser APIs must start with `'use client'`. |
| Cache not shared between pages | Ensure both components use the exact same query key structure. |

---

## Checklist

- [ ] Hook file created in `hooks/` with `use-` prefix and kebab-case filename
- [ ] `'use client'` directive at the top of the file
- [ ] Types defined for data structures and parameters
- [ ] Query keys defined as constants with `as const`
- [ ] Fetch function extracted from the hook for testability
- [ ] `staleTime` and `gcTime` set appropriately for the data type
- [ ] Error handling: auth errors not retried, user-friendly error messages
- [ ] Mutations include `onSuccess` cache invalidation
- [ ] Toast notifications for user-facing mutations
- [ ] Hook exported from `hooks/index.ts`
- [ ] Return value is a well-typed object (not positional)
- [ ] `pnpm tsc --noEmit` passes

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
- [How to Add a New Component](./how-to-add-a-new-component.md)
