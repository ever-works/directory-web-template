---
id: use-client-item-filters-reference
title: useClientItemFilters Hook Reference
sidebar_label: useClientItemFilters
sidebar_position: 72
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useClientItemFilters

Manages filter, sort, search, and pagination state for client item listings. Produces a `params` object compatible with `useClientItems` and handles debounced search, automatic page resets on filter changes, and pagination helpers.

**Source:** `template/hooks/use-client-item-filters.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useClientItemFilters` | Manage filter/sort/search/pagination state for client items |

## Exported Types

```ts
export interface UseClientItemFiltersOptions {
  defaultStatus?: ClientStatusFilter;
  defaultSearch?: string;
  defaultPage?: number;
  defaultLimit?: number;
  defaultSortBy?: ClientItemsListParams['sortBy'];
  defaultSortOrder?: ClientItemsListParams['sortOrder'];
  searchDebounceMs?: number;
}

export interface UseClientItemFiltersReturn {
  // Current filter values
  status: ClientStatusFilter;
  search: string;
  debouncedSearch: string;
  page: number;
  limit: number;
  sortBy: ClientItemsListParams['sortBy'];
  sortOrder: ClientItemsListParams['sortOrder'];

  // Combined params for API calls
  params: ClientItemsListParams;

  // Actions
  setStatus: (status: ClientStatusFilter) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortBy: (sortBy: ClientItemsListParams['sortBy']) => void;
  setSortOrder: (sortOrder: ClientItemsListParams['sortOrder']) => void;
  toggleSortOrder: () => void;
  resetFilters: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // State flags
  isSearching: boolean;
  hasActiveFilters: boolean;
}
```

---

## Signature

```ts
function useClientItemFilters(
  options?: UseClientItemFiltersOptions,
): UseClientItemFiltersReturn;
```

### Parameters (Options)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultStatus` | `ClientStatusFilter` | `'all'` | Initial status filter |
| `defaultSearch` | `string` | `''` | Initial search string |
| `defaultPage` | `number` | `1` | Initial page number |
| `defaultLimit` | `number` | `10` | Initial items per page |
| `defaultSortBy` | `'name' \| 'updated_at' \| 'status' \| 'submitted_at'` | `'updated_at'` | Initial sort field |
| `defaultSortOrder` | `'asc' \| 'desc'` | `'desc'` | Initial sort direction |
| `searchDebounceMs` | `number` | `300` | Debounce delay for search input in milliseconds |

---

## Return Values

```ts
const {
  // Current filter values
  status,             // ClientStatusFilter -- Current status filter
  search,             // string -- Raw (un-debounced) search input
  debouncedSearch,    // string -- Debounced search value used in API params
  page,               // number -- Current page (1-based)
  limit,              // number -- Items per page (clamped 1-100)
  sortBy,             // string -- Current sort field
  sortOrder,          // 'asc' | 'desc' -- Current sort direction

  // Combined params
  params,             // ClientItemsListParams -- Ready-to-use object for useClientItems

  // Actions
  setStatus,          // (status) => void -- Set status and reset to page 1
  setSearch,          // (search) => void -- Set raw search (debounce handles the rest)
  setPage,            // (page) => void -- Set page number (min: 1)
  setLimit,           // (limit) => void -- Set limit (clamped 1-100), resets to page 1
  setSortBy,          // (sortBy) => void -- Set sort field, resets to page 1
  setSortOrder,       // (sortOrder) => void -- Set sort direction, resets to page 1
  toggleSortOrder,    // () => void -- Toggle between 'asc' and 'desc', resets to page 1
  resetFilters,       // () => void -- Reset all filters to their default values
  goToPage,           // (page) => void -- Navigate to a specific page (min: 1)
  nextPage,           // () => void -- Increment page by 1
  prevPage,           // () => void -- Decrement page by 1 (min: 1)

  // State flags
  isSearching,        // boolean -- True when raw search differs from debounced
  hasActiveFilters,   // boolean -- True when status != 'all' or search is non-empty
} = useClientItemFilters(options);
```

---

## Implementation Details

- **Automatic page reset:** Changing `status`, `limit`, `sortBy`, or `sortOrder` automatically resets the page to 1 to prevent viewing empty pages after a filter change.
- **Debounced search:** The `search` value is immediately stored for input binding, while `debouncedSearch` lags behind by `searchDebounceMs` (default 300ms). The `params` object uses `debouncedSearch`, so API requests only fire after the user stops typing.
- **isSearching flag:** Computed as `search !== debouncedSearch && search.trim() !== ''`. Useful for showing a spinner or "typing..." indicator in the search input.
- **hasActiveFilters:** Returns `true` when any filter deviates from the neutral state (`status !== 'all'` or `debouncedSearch` is non-empty). Useful for showing a "Clear Filters" button conditionally.
- **Limit clamping:** `setLimit` clamps the value between 1 and 100, preventing invalid page sizes.
- **Page floor:** `setPage`, `goToPage`, and `prevPage` all enforce a minimum page of 1.
- **Memoized params:** The `params` object is wrapped in `useMemo` and only recalculates when one of its constituent values changes, preventing unnecessary query re-fetches.
- **resetFilters:** Restores every field to its corresponding `default*` value from the options, providing a clean one-call reset.

---

## Usage: Combined with useClientItems

```tsx
function ClientItemsList() {
  const filters = useClientItemFilters({
    defaultLimit: 20,
    defaultSortBy: 'name',
  });

  const { items, isLoading, totalPages } = useClientItems(filters.params);

  return (
    <div>
      {/* Search */}
      <input
        value={filters.search}
        onChange={(e) => filters.setSearch(e.target.value)}
        placeholder="Search items..."
      />
      {filters.isSearching && <Spinner size="sm" />}

      {/* Status tabs */}
      <Tabs value={filters.status} onValueChange={filters.setStatus}>
        <Tab value="all">All</Tab>
        <Tab value="approved">Approved</Tab>
        <Tab value="pending">Pending</Tab>
        <Tab value="rejected">Rejected</Tab>
      </Tabs>

      {/* Items */}
      {isLoading ? <Skeleton /> : items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}

      {/* Pagination */}
      <div className="flex gap-2">
        <button onClick={filters.prevPage} disabled={filters.page <= 1}>
          Previous
        </button>
        <span>Page {filters.page} of {totalPages}</span>
        <button onClick={filters.nextPage} disabled={filters.page >= totalPages}>
          Next
        </button>
      </div>

      {/* Clear filters */}
      {filters.hasActiveFilters && (
        <button onClick={filters.resetFilters}>Clear All Filters</button>
      )}
    </div>
  );
}
```

## Usage: Sort Controls

```tsx
function SortControls() {
  const filters = useClientItemFilters();

  return (
    <div className="flex gap-2">
      <select
        value={filters.sortBy}
        onChange={(e) => filters.setSortBy(e.target.value as any)}
      >
        <option value="updated_at">Last Updated</option>
        <option value="name">Name</option>
        <option value="status">Status</option>
        <option value="submitted_at">Submitted</option>
      </select>
      <button onClick={filters.toggleSortOrder}>
        {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      </button>
    </div>
  );
}
```

## Usage: Custom Defaults

```tsx
function ApprovedItemsPage() {
  const filters = useClientItemFilters({
    defaultStatus: 'approved',
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    defaultLimit: 50,
    searchDebounceMs: 500, // Longer debounce for slow typers
  });

  const { items } = useClientItems(filters.params);

  // ...
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `react` | `useState`, `useCallback`, `useMemo` for state management |
| `./use-debounced-value` | `useDebounceValue` for search input debouncing |
| `@/lib/types/client-item` | `ClientItemsListParams`, `ClientStatusFilter` type definitions |

## Related Hooks

- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Consumes the `params` object produced by this hook
- [`useClientItemDetails`](/docs/template/hooks/use-client-item-details-reference) -- Single item detail fetching
- [`useDebouncedValue`](/docs/template/hooks/use-debounced-value-reference) -- The underlying debounce utility
- [`useDeletedClientItems`](/docs/template/hooks/use-deleted-client-items-reference) -- Manages soft-deleted items list
