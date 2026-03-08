---
id: use-infinite-loading-reference
title: useInfiniteLoading
sidebar_label: useInfiniteLoading
sidebar_position: 31
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useInfiniteLoading

A generic React hook for client-side infinite scroll pagination. It slices a pre-loaded array of items into progressively larger views, simulating paginated loading with configurable page sizes.

## Import

```typescript
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';
```

## API Reference

### Parameters

```typescript
function useInfiniteLoading<T>(props: UseInfiniteLoadingProps<T>): UseInfiniteLoadingResult<T>;
```

#### `UseInfiniteLoadingProps<T>`

| Property | Type | Default | Description |
|---|---|---|---|
| `items` | `T[]` | *required* | The full array of items to paginate through. |
| `initialPage` | `number` | *required* | The starting page number (typically `1`). |
| `perPage` | `number` | `PER_PAGE` (12) | Number of items to display per page. Defaults to the global `PER_PAGE` constant. |

### Return Value

#### `UseInfiniteLoadingResult<T>`

| Property | Type | Description |
|---|---|---|
| `displayedItems` | `T[]` | The subset of items currently visible, based on the current page. |
| `hasMore` | `boolean` | Whether there are more items to load beyond the current page. |
| `isLoading` | `boolean` | Whether a load-more operation is currently in progress. |
| `error` | `Error \| null` | Error object if the last load-more operation failed. |
| `loadMore` | `() => Promise<void>` | Triggers loading the next page of items. No-ops if already loading, no more items exist, or pagination type is not `"infinite"`. |

## Usage Examples

### Basic Infinite Scroll

```tsx
function ItemList({ allItems }: { allItems: Item[] }) {
  const { displayedItems, hasMore, isLoading, loadMore } = useInfiniteLoading({
    items: allItems,
    initialPage: 1,
    perPage: 20,
  });

  return (
    <div>
      {displayedItems.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### With Intersection Observer

```tsx
function InfiniteScrollList({ items }: { items: Product[] }) {
  const { displayedItems, hasMore, isLoading, loadMore } = useInfiniteLoading({
    items,
    initialPage: 1,
  });
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div>
      {displayedItems.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {hasMore && <div ref={sentinelRef} className="h-10" />}
      {isLoading && <Spinner />}
    </div>
  );
}
```

### With Error Handling

```tsx
function ResilientList({ items }: { items: Post[] }) {
  const { displayedItems, hasMore, isLoading, error, loadMore } = useInfiniteLoading({
    items,
    initialPage: 1,
    perPage: 15,
  });

  return (
    <div>
      {displayedItems.map((post) => (
        <PostPreview key={post.id} post={post} />
      ))}
      {error && (
        <div className="text-red-500 p-4">
          <p>Failed to load more items.</p>
          <button onClick={loadMore}>Retry</button>
        </div>
      )}
      {hasMore && !error && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Show More'}
        </button>
      )}
    </div>
  );
}
```

## Configuration

### Pagination Type Dependency

This hook reads `paginationType` from the `useLayoutTheme()` context. The `loadMore` function only executes when `paginationType === "infinite"`. If the layout is configured for traditional pagination, `loadMore` will no-op.

Ensure the `LayoutThemeProvider` is present in your component tree and configured with the desired pagination type.

### PER_PAGE Constant

The default page size comes from `@/lib/paginate`:

```typescript
export const PER_PAGE = 12;
```

Override this by passing a custom `perPage` value to the hook.

## Edge Cases and Gotchas

- **Client-Side Only**: This hook paginates through an already-loaded array. It does not fetch data from the server. All items must be available in memory when the hook is initialized.
- **Artificial Delay**: The hook includes an `ARTIFICIAL_DELAY` constant (set to `300ms` by default in development). For production, this should be set to `0` in the source file to avoid unnecessary delays.
- **Pagination Type Guard**: The `loadMore` function checks `paginationType !== "infinite"` and returns early. If your load-more button never triggers, verify that your `LayoutThemeProvider` has `paginationType` set to `"infinite"`.
- **Re-renders on Items Change**: If the `items` array reference changes (e.g., from a re-fetch), the `displayedItems` slice recalculates automatically. However, the `currentPage` state persists, so previously loaded pages remain visible.
- **hasMore Accuracy**: `hasMore` is `false` when `currentPage >= totalPages` or when all items are already displayed. It correctly handles arrays that are not evenly divisible by `perPage`.

## Related Hooks

- [useDebouncedSearch](./use-debounced-search-reference.md) -- Combine with infinite loading for search-as-you-type with paginated results.
- [useIsMobile](./use-mobile-reference.md) -- Adjust `perPage` based on device type for better mobile UX.
