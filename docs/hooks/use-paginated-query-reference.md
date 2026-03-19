---
id: use-paginated-query-reference
title: "usePaginatedQuery Reference"
sidebar_label: "usePaginatedQuery"
sidebar_position: 43
---

# usePaginatedQuery

## Overview

`usePaginatedQuery` wraps TanStack React Query's `useInfiniteQuery` to provide a standardized interface for fetching paginated data from the template's API endpoints. It handles page parameter management, automatic next-page detection, and integrates with the shared `fetcherPaginated` utility from the API client. Use this hook whenever you need to load data in pages with "load more" or infinite scroll patterns.

## Import

```typescript
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
```

## API Reference

### Parameters

The hook accepts a single options object:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `endpoint` | `string` | Yes | -- | The API endpoint path to fetch from (e.g., `"/api/items"`). |
| `limit` | `number` | No | `10` | Number of items to fetch per page. |
| `sort` | `string` | No | `undefined` | Field name to sort results by. |
| `order` | `"asc" \| "desc"` | No | `undefined` | Sort direction. Only applied when `sort` is also provided. |
| `filters` | `Record<string, string \| number \| boolean \| undefined>` | No | `{}` | Key-value pairs for query parameter filtering. `undefined` values are excluded. |
| `enabled` | `boolean` | No | `true` | When `false`, the query will not execute. Useful for conditional fetching. |

### Generic Type Parameter

| Parameter | Description |
|-----------|-------------|
| `T` | The type of individual items in the paginated response. |

### Return Value

Returns the full `UseInfiniteQueryResult` from TanStack React Query, which includes:

| Property | Type | Description |
|----------|------|-------------|
| `data` | `InfiniteData<PaginatedResponse<T>>` | The accumulated pages of data. Access items via `data.pages[n].data`. |
| `fetchNextPage` | `() => Promise<...>` | Fetches the next page of results. |
| `hasNextPage` | `boolean` | Whether more pages are available. |
| `isFetchingNextPage` | `boolean` | Whether the next page is currently being fetched. |
| `isLoading` | `boolean` | Whether the initial page is loading. |
| `isError` | `boolean` | Whether an error occurred. |
| `error` | `Error \| null` | The error object if the query failed. |
| `refetch` | `() => Promise<...>` | Manually re-fetches all pages. |

The `PaginatedResponse<T>` type (when successful) has the shape:

```typescript
{
  success: true;
  data: T[];
  meta: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}
```

## Usage Examples

### Basic Usage

```typescript
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

interface Item {
  id: string;
  name: string;
  slug: string;
}

function ItemList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = usePaginatedQuery<Item>({
    endpoint: "/api/items",
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;

  const items = data?.pages.flatMap((page) =>
    page.success ? page.data : []
  ) ?? [];

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

### Advanced Usage

```typescript
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { useDebounceValue } from "@/hooks/use-debounced-value";
import { useState } from "react";

interface Item {
  id: string;
  name: string;
  category: string;
}

function FilteredItemList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounceValue(search, 300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
  } = usePaginatedQuery<Item>({
    endpoint: "/api/items",
    limit: 15,
    sort: "name",
    order: "asc",
    filters: {
      search: debouncedSearch || undefined,
      category,
    },
    enabled: true,
  });

  const items = data?.pages.flatMap((page) =>
    page.success ? page.data : []
  ) ?? [];

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
      />
      <select
        value={category ?? ""}
        onChange={(e) => setCategory(e.target.value || undefined)}
      >
        <option value="">All Categories</option>
        <option value="tools">Tools</option>
        <option value="services">Services</option>
      </select>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        items.map((item) => <div key={item.id}>{item.name}</div>)
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  );
}
```

## Integration Patterns

The hook constructs a query key from `[endpoint, { limit, sort, order, ...filters }]`, so TanStack React Query automatically refetches when any of these parameters change. It uses `fetcherPaginated` from `@/lib/api/api-client`, which handles authentication headers, base URL resolution, and response parsing. The `getNextPageParam` function checks the `meta.page` and `meta.totalPages` fields in the `PaginatedResponse` to determine whether more pages exist.

## Best Practices

- **Flatten pages for rendering** using `data.pages.flatMap(page => page.success ? page.data : [])` to get a single array of items.
- **Set `enabled: false`** when required filter values are not yet available to prevent unnecessary initial requests.
- **Use `filters` with `undefined` values** for optional parameters -- they are excluded from the query automatically.
- **Combine with `useDebounceValue`** for search and filter inputs to avoid excessive API calls while the user is typing.
- **Keep `limit` reasonable** (10--50 items per page) to balance between network efficiency and user experience.

## Related Hooks

- [useDebounceValue](./use-debounced-value-reference.md) -- Debounce filter/search inputs before passing them to `usePaginatedQuery`.
- [useInfiniteLoading](./use-infinite-loading-reference.md) -- Scroll-based infinite loading that can build on paginated query results.
- [useFilters](./use-filters-reference.md) -- Manages filter state that feeds into paginated queries.
