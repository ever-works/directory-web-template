---
id: caching-strategy
title: "Caching Strategy"
sidebar_label: "Caching Strategy"
sidebar_position: 16
---

# Caching Strategy

The template uses a multi-layer caching architecture combining **Next.js server-side caching** with **React Query client-side caching**. This dual approach ensures fast page loads, efficient data fetching, and minimal unnecessary network requests.

## Architecture Overview

```
lib/cache-config.ts          # Cache TTL values and tag definitions
lib/cache-invalidation.ts    # Server-side cache invalidation functions
lib/react-query-config.ts    # React Query client configuration
```

The two caching layers serve different purposes:

| Layer | Technology | Scope | Purpose |
|-------|-----------|-------|---------|
| Server | Next.js `unstable_cache` / `revalidateTag` | SSR, API routes | Cache filesystem reads and database queries |
| Client | React Query (`@tanstack/react-query`) | Browser | Cache API responses and manage stale data |

## Server-Side Cache Configuration

### Cache TTL

All TTL values are defined in `lib/cache-config.ts` as seconds:

```ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

The uniform 10-minute TTL reduces filesystem reads while ensuring content updates propagate within a reasonable window.

### Cache Tags

Cache tags enable targeted invalidation. The `CACHE_TAGS` object provides both static tags and dynamic tag factories:

```ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
  TAGS_LOCALE: (locale: string) => `tags:${locale}`,
  COLLECTIONS_LOCALE: (locale: string) => `collections:${locale}`,
} as const;
```

### Tag Hierarchy

Tags follow a hierarchical pattern for efficient invalidation:

| Tag | Scope | Invalidates |
|-----|-------|-------------|
| `content` | Master | All content-related caches |
| `items` | Collection | All items across all locales |
| `items:en` | Locale-specific | English items only |
| `item:my-tool` | Individual | One specific item |
| `categories` | Collection | All categories |
| `categories:fr` | Locale-specific | French categories only |
| `config` | Global | Site configuration |
| `pages` | Collection | All static pages |
| `page:about` | Individual | One specific page |

### Using Cache Tags in Data Fetching

```ts
import { unstable_cache } from 'next/cache';
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    return await fetchItems(locale);
  },
  ['items'],
  {
    revalidate: CACHE_TTL.CONTENT,
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.ITEMS_LOCALE(locale)],
  }
);
```

## Cache Invalidation

### Invalidation Functions

The `lib/cache-invalidation.ts` module provides three invalidation functions:

```ts
// Invalidate ALL content caches (after repository sync)
await invalidateContentCaches();

// Invalidate a specific item
await invalidateItemCache('my-tool-slug');

// Invalidate a specific page
await invalidatePageCache('about');
```

### Full Content Invalidation

The `invalidateContentCaches` function clears all content-related caches and the in-memory fetch cache:

```ts
export async function invalidateContentCaches(): Promise<void> {
  safeRevalidateTag(CACHE_TAGS.CONTENT);
  safeRevalidateTag(CACHE_TAGS.ITEMS);
  safeRevalidateTag(CACHE_TAGS.CATEGORIES);
  safeRevalidateTag(CACHE_TAGS.TAGS);
  safeRevalidateTag(CACHE_TAGS.COLLECTIONS);
  safeRevalidateTag(CACHE_TAGS.PAGES);

  await clearFetchItemsCache();
}
```

This is typically called after a Git repository sync completes, ensuring fresh content is served.

### Safe Revalidation

The `safeRevalidateTag` wrapper handles a critical edge case: calling `revalidateTag` during a React render phase throws an error in Next.js. The wrapper catches this specific error and logs a warning instead:

```ts
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(
        `[CACHE] Skipping cache invalidation during render phase (tag: ${tag})`
      );
    } else {
      throw error;
    }
  }
}
```

The render phase detection checks multiple patterns to be resilient against Next.js error message changes:

```ts
function isRenderPhaseError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('during render') ||
    message.includes('render phase') ||
    (message.includes('revalidate') && message.includes('render')) ||
    (message.includes('unsupported') && message.includes('render'))
  );
}
```

## Client-Side Cache (React Query)

### QueryClient Configuration

The `lib/react-query-config.ts` module exports a pre-configured `QueryClient`:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('4')) return false;
        if (error instanceof Error && error.message.includes('401')) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        const baseDelay = 1000 * Math.pow(2, attemptIndex);
        const jitter = Math.random() * 0.3 + 0.85;
        return Math.min(baseDelay * jitter, 30000);
      },
      notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Default Query Behavior

| Setting | Value | Purpose |
|---------|-------|---------|
| `staleTime` | 5 minutes | Data is fresh for 5 min before background refetch |
| `gcTime` | 10 minutes | Inactive data is garbage collected after 10 min |
| `refetchOnWindowFocus` | `true` | Refetch when user returns to the tab |
| `refetchOnReconnect` | `true` | Refetch when network reconnects |
| `refetchOnMount` | `true` | Refetch stale data when component mounts |
| `retry` | Up to 3 | Retries server errors, skips 4xx and 401 |
| `retryDelay` | Exponential + jitter | Base delay doubles each attempt, capped at 30 seconds |

### Query Key Factory

The `queryKeys` factory ensures consistent cache key management across the application:

```ts
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
    payments: () => [...queryKeys.admin.all, 'payments'] as const,
  },
};
```

Using the factory in queries:

```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-config';

const { data } = useQuery({
  queryKey: queryKeys.billing.subscription(),
  queryFn: fetchSubscription,
});
```

### Prefetch Strategies

The `prefetchStrategies` object provides pre-built prefetch functions for common navigation patterns:

```ts
export const prefetchStrategies = {
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => { /* fetch subscription */ },
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.payments(),
      queryFn: async () => { /* fetch payments */ },
      staleTime: 10 * 60 * 1000,
    });
  },
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => { /* fetch profile */ },
      staleTime: 10 * 60 * 1000,
    });
  },
};
```

Call these when the user is likely to navigate to a related page:

```tsx
<Link href="/settings" onMouseEnter={() => prefetchStrategies.billing()}>
  Settings
</Link>
```

### Cache Invalidation Utilities

The `cacheUtils` object provides targeted invalidation helpers:

```ts
export const cacheUtils = {
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  invalidatePayments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.payments() });
  },
  removeBilling: () => {
    queryClient.removeQueries({ queryKey: queryKeys.billing.all });
  },
  resetCache: () => {
    queryClient.clear();
  },
};
```

Use after mutations to refresh affected data:

```ts
const mutation = useMutation({
  mutationFn: updateSubscription,
  onSuccess: () => {
    cacheUtils.invalidateSubscription();
  },
});
```

## Cache Interaction Between Layers

The server and client caches work together in a typical request flow:

1. **Initial page load** -- Next.js serves the page from its server-side cache (10-minute TTL)
2. **Client hydration** -- React Query initializes with server-rendered data
3. **Background refetch** -- React Query refetches after 5 minutes of staleness
4. **User action** -- Mutation triggers `cacheUtils.invalidate*()` on the client
5. **Content sync** -- Git webhook triggers `invalidateContentCaches()` on the server

### Cache Timing Summary

| Cache Layer | Fresh Duration | Maximum Age | Invalidation |
|-------------|---------------|-------------|--------------|
| Next.js server | 10 minutes | Until `revalidateTag` | Tag-based via `safeRevalidateTag` |
| React Query | 5 minutes | 10 minutes (GC) | Key-based via `cacheUtils` |

## Best Practices

1. **Use cache tags for server data** -- always tag cached queries for targeted invalidation
2. **Use query key factories** -- never construct query keys manually
3. **Invalidate after mutations** -- call the appropriate `cacheUtils` method in `onSuccess`
4. **Prefetch on hover** -- use `prefetchStrategies` to load data before the user navigates
5. **Call `invalidateContentCaches()` after syncs** -- ensures fresh content after repository updates
6. **Avoid over-invalidation** -- use specific tags (`CACHE_TAGS.ITEM(slug)`) instead of broad tags (`CACHE_TAGS.CONTENT`) when possible
7. **Handle render phase errors** -- always use `safeRevalidateTag` instead of `revalidateTag` directly

## Related Files

| Path | Description |
|------|-------------|
| `lib/cache-config.ts` | Cache TTL constants and tag definitions |
| `lib/cache-invalidation.ts` | Server-side invalidation functions |
| `lib/react-query-config.ts` | React Query client and utilities |
| `lib/content.ts` | Content fetching with cache integration |
