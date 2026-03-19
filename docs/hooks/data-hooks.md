---
id: data-hooks
title: Data Fetching Hooks
sidebar_label: Data Fetching Hooks
sidebar_position: 6
---

# Data Fetching Hooks

Hooks for paginated queries, infinite scroll loading, and retry logic with exponential backoff. These hooks build on top of `@tanstack/react-query` and the template's API client.

## usePaginatedQuery

Wraps `useInfiniteQuery` from React Query to provide cursor-based pagination against the template's REST API endpoints.

```
usePaginatedQuery<T>(options: UsePaginatedQueryOptions): UseInfiniteQueryResult
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | -- | API endpoint path (e.g., `"/api/items"`) |
| `limit` | `number` | `10` | Items per page |
| `sort` | `string` | -- | Sort field name |
| `order` | `'asc' \| 'desc'` | -- | Sort direction |
| `filters` | `Record<string, string \| number \| boolean \| undefined>` | `{}` | Additional query parameters |
| `enabled` | `boolean` | `true` | Whether the query should execute |

### Return Values

Returns the standard React Query `UseInfiniteQueryResult` object with automatic page parameter handling. The query key includes all options for proper cache isolation.

| Key Behavior | Description |
|--------------|-------------|
| Query Key | `[endpoint, { limit, sort, order, ...filters }]` |
| Page Param | Starts at `1`, increments based on `meta.totalPages` |
| Next Page | Automatically calculated from `lastPage.meta.page + 1` |

```tsx
import { usePaginatedQuery } from '@/hooks/use-paginated-query';

function ItemList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = usePaginatedQuery<Item>({
    endpoint: '/api/items',
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
    filters: { status: 'approved' },
  });

  const allItems = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      {allItems.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load More
        </button>
      )}
    </div>
  );
}
```

---

## useInfiniteLoading

Client-side infinite loading hook that progressively reveals items from an already-fetched array. Works with the template's `paginationType` setting from `LayoutThemeContext`.

```
useInfiniteLoading<T>(props: UseInfiniteLoadingProps<T>): UseInfiniteLoadingResult<T>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | -- | Full array of items to paginate through |
| `initialPage` | `number` | -- | Starting page number |
| `perPage` | `number` | `PER_PAGE` | Items shown per page increment |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `displayedItems` | `T[]` | Currently visible items (grows as pages load) |
| `hasMore` | `boolean` | Whether more items are available |
| `isLoading` | `boolean` | Loading state during page advancement |
| `error` | `Error \| null` | Error if page advancement fails |
| `loadMore` | `() => Promise<void>` | Trigger the next page of items |

The hook only loads more items when `paginationType` is `"infinite"`, making it safe to use alongside traditional pagination modes.

```tsx
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';

function InfiniteItemList({ allItems }) {
  const { displayedItems, hasMore, isLoading, loadMore } = useInfiniteLoading({
    items: allItems,
    initialPage: 1,
    perPage: 12,
  });

  return (
    <div>
      {displayedItems.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Show More'}
        </button>
      )}
    </div>
  );
}
```

---

## useRetry

Provides a generic retry mechanism with exponential backoff, jitter, and abort support. Useful for wrapping unreliable API calls.

```
useRetry(config?: Partial<RetryConfig>): UseRetryReturn
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `retryDelay` | `number` | `1000` | Base delay in ms between retries |
| `backoffMultiplier` | `number` | `2` | Multiplier for exponential backoff |
| `maxDelay` | `number` | `10000` | Maximum delay cap in ms |
| `jitter` | `boolean` | `true` | Add randomization (85-115%) to delay |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `retry` | `<T>(fn: () => Promise<T>) => Promise<T>` | Execute a function with retry logic |
| `reset` | `() => void` | Abort ongoing retries and reset state |
| `state` | `RetryState` | Current retry state |

### RetryState

| Property | Type | Description |
|----------|------|-------------|
| `attempt` | `number` | Current attempt number (0-based) |
| `isRetrying` | `boolean` | Whether a retry is in progress |
| `lastError` | `Error \| null` | Most recent error encountered |

```tsx
import { useRetry } from '@/hooks/use-retry';

function DataFetcher() {
  const { retry, state } = useRetry({
    maxRetries: 5,
    retryDelay: 2000,
  });

  const fetchData = async () => {
    const data = await retry(async () => {
      const res = await fetch('/api/unstable-endpoint');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    setData(data);
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch</button>
      {state.isRetrying && <p>Retrying (attempt {state.attempt})...</p>}
    </div>
  );
}
```

### useRetryOperation

A convenience wrapper that combines `useRetry` with a specific operation function and manages its result data and loading state.

```
useRetryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): UseRetryOperationReturn<T>
```

| Property | Type | Description |
|----------|------|-------------|
| `execute` | `() => Promise<T>` | Run the operation with retry |
| `reset` | `() => void` | Reset state and abort |
| `data` | `T \| null` | Result from last successful execution |
| `loading` | `boolean` | Whether the operation is in progress |
| `attempt` | `number` | Current retry attempt |
| `isRetrying` | `boolean` | Whether actively retrying |
| `lastError` | `Error \| null` | Last error encountered |

```tsx
const { execute, data, loading } = useRetryOperation(
  () => fetch('/api/data').then((r) => r.json()),
  { maxRetries: 3 }
);
```

---

## Key Design Patterns

### Client-side vs Server-side Pagination

- **`usePaginatedQuery`** -- Server-side pagination via React Query's `useInfiniteQuery`. Each page triggers a new API request.
- **`useInfiniteLoading`** -- Client-side pagination. All items are loaded upfront; the hook progressively reveals them.

### Retry Behavior

The `useRetry` hook skips retries for:
- **Abort errors** (`AbortError`) -- The user or code intentionally cancelled
- **Client errors (4xx)** -- These are typically not transient

Delay calculation: `min(retryDelay * backoffMultiplier^attempt, maxDelay) * jitter`

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `usePaginatedQuery` | Server-side infinite query pagination | `use-paginated-query.ts` |
| `useInfiniteLoading` | Client-side progressive item display | `use-infinite-loading.ts` |
| `useRetry` | Generic retry with exponential backoff | `use-retry.ts` |
| `useRetryOperation` | Retry wrapper for a specific async operation | `use-retry.ts` |
