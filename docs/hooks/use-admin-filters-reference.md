---
id: use-admin-filters-reference
title: useAdminFilters Hook Reference
sidebar_label: useAdminFilters
sidebar_position: 58
---

# useAdminFilters

## Overview

`useAdminFilters` is a generic React hook that provides unified filter state management for admin pages. It combines debounced search (via `useDebounceSearch`), a status filter, and multiple multi-select filters into a single composable unit. The hook is designed to be consumed by domain-specific hooks like `useAdminUsers` and `useAdminItems`, but can also be used directly in components.

**Source:** `template/hooks/use-admin-filters.ts`

## Signature / Parameters

```typescript
function useAdminFilters<TStatus extends string = string>(
  config?: AdminFiltersConfig<TStatus>
): UseAdminFiltersReturn<TStatus>
```

The `TStatus` generic parameter constrains the allowed values for the status filter (e.g., `'active' | 'inactive'` or `'draft' | 'pending' | 'approved' | 'rejected'`).

### `AdminFiltersConfig<TStatus>`

| Parameter            | Type                          | Default | Description                                                   |
|---------------------|-------------------------------|---------|---------------------------------------------------------------|
| `minSearchLength`   | `number`                      | `2`     | Minimum character count before search triggers debounce       |
| `debounceDelay`     | `number`                      | `300`   | Debounce delay in milliseconds                                |
| `initialStatus`     | `TStatus \| ''`               | `''`    | Initial status filter value                                   |
| `initialMultiFilters`| `Record<string, string[]>`   | `{}`    | Initial multi-select filter values keyed by filter name       |
| `onFiltersChange`   | `() => void`                  | `undefined` | Callback fired when any filter changes (useful for page reset). Does not need to be memoized. |

## Return Values

### Search State

| Property              | Type                       | Description                                                     |
|----------------------|----------------------------|-----------------------------------------------------------------|
| `searchTerm`         | `string`                   | Current raw search input value                                  |
| `setSearchTerm`      | `(value: string) => void`  | Update the search input                                         |
| `debouncedSearchTerm`| `string`                   | Debounced search value (only set when `>= minSearchLength`)     |
| `isSearching`        | `boolean`                  | `true` when debounce is pending                                 |
| `hasActiveSearch`    | `boolean`                  | `true` when trimmed search meets minimum length                 |
| `clearSearch`        | `() => void`               | Reset the search term to empty string                           |

### Status Filter

| Property         | Type                              | Description                    |
|-----------------|-----------------------------------|--------------------------------|
| `statusFilter`  | `TStatus \| ''`                   | Current status filter value    |
| `setStatusFilter`| `(status: TStatus \| '') => void`| Update the status filter       |

### Multi-Select Filters

| Property                | Type                                                  | Description                                              |
|------------------------|-------------------------------------------------------|----------------------------------------------------------|
| `multiFilters`         | `Record<string, string[]>`                            | Current multi-select filter values by filter name        |
| `setMultiFilter`       | `(filterName: string, values: string[]) => void`      | Set all values for a named filter                        |
| `toggleMultiFilterValue`| `(filterName: string, value: string) => void`         | Toggle a single value within a named filter              |
| `clearMultiFilter`     | `(filterName: string) => void`                        | Clear all values for a named filter (sets to `[]`)       |

### Active Filter Utilities

| Property                    | Type         | Description                                            |
|----------------------------|--------------|--------------------------------------------------------|
| `activeFilterCount`        | `number`     | Total number of active filters (search + status + multi-filter values) |
| `hasActiveFilters`         | `boolean`    | `true` when any filter is active                       |
| `clearAllFilters`          | `() => void` | Reset all filters to their default empty state         |
| `calculateActiveFilterCount`| `() => number` | Utility function to manually calculate filter count |

## Implementation Details

- **Debounced search:** Uses the companion `useDebounceSearch` hook internally. The raw `searchTerm` is trimmed and only debounced if it meets the `minSearchLength` threshold. If below the threshold, the debounced value is set to an empty string.
- **Ref-based callback:** The `onFiltersChange` callback is stored in a `useRef` to avoid dependency issues. This means consumers do not need to memoize the callback.
- **Initial mount guard:** A `useRef` boolean (`isInitialMount`) prevents `onFiltersChange` from firing on the initial render. This avoids unnecessary page resets when filters initialize.
- **Filter change detection:** A `useEffect` watches `statusFilter` and `multiFilters` and calls `onFiltersChange` on change (after initial mount). The debounced search triggers `onFiltersChange` via the `useDebounceSearch` `onSearch` callback.
- **Clear all:** The `clearAllFilters` function resets search, status, and multi-filters, then immediately calls `onFiltersChange` (bypassing debounce) for consistent page reset behavior.
- **Active filter counting:** Counts search (if active) as 1, status (if set) as 1, and each individual multi-filter value as 1. For example, if a user has an active search, a status filter, and 3 selected categories, `activeFilterCount` would be 5.

## Usage Examples

### Direct usage in a component

```tsx
import { useAdminFilters } from '@/hooks/use-admin-filters';

type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected';

function ItemsFilterBar({ onPageReset }: { onPageReset: () => void }) {
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    isSearching,
    statusFilter,
    setStatusFilter,
    multiFilters,
    setMultiFilter,
    toggleMultiFilterValue,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
  } = useAdminFilters<ItemStatus>({
    minSearchLength: 2,
    debounceDelay: 300,
    initialMultiFilters: { categories: [], tags: [] },
    onFiltersChange: onPageReset,
  });

  return (
    <div>
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        isLoading={isSearching}
      />

      <StatusSelect
        value={statusFilter}
        onChange={setStatusFilter}
        options={['draft', 'pending', 'approved', 'rejected']}
      />

      <CategoryMultiSelect
        selected={multiFilters.categories || []}
        onChange={(values) => setMultiFilter('categories', values)}
      />

      <TagMultiSelect
        selected={multiFilters.tags || []}
        onToggle={(tag) => toggleMultiFilterValue('tags', tag)}
      />

      {hasActiveFilters && (
        <Button onClick={clearAllFilters}>
          Clear All ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
```

### Used inside a domain hook (as in `useAdminUsers`)

```tsx
const {
  searchTerm,
  setSearchTerm,
  debouncedSearchTerm,
  isSearching,
  hasActiveSearch,
  statusFilter,
  setStatusFilter,
  multiFilters,
  setMultiFilter,
  activeFilterCount,
  hasActiveFilters,
  clearAllFilters,
} = useAdminFilters<'active' | 'inactive'>({
  minSearchLength: 2,
  debounceDelay: 300,
  initialStatus: '',
  initialMultiFilters: { role: [] },
});

// Derive a single-select role filter from multi-filters
const roleFilter = multiFilters.role?.[0] || '';
const setRoleFilter = (role: string) => setMultiFilter('role', role ? [role] : []);
```

### Passing debounced values to a query

```tsx
const { debouncedSearchTerm, statusFilter, multiFilters } = useAdminFilters({
  onFiltersChange: () => setPage(1),
});

const { data } = useQuery({
  queryKey: ['items', { search: debouncedSearchTerm, status: statusFilter, categories: multiFilters.categories }],
  queryFn: () => fetchItems({
    search: debouncedSearchTerm || undefined,
    status: statusFilter || undefined,
    categories: multiFilters.categories,
  }),
});
```

## Related Hooks

- [`useAdminUsers`](./use-admin-users-reference.md) -- Consumes `useAdminFilters` internally for user search, role, and status filtering.
- [`useAdminItems`](./use-admin-items-reference.md) -- Item management with category and tag filtering.
- [`useAdminReports`](./use-admin-reports-reference.md) -- Report filtering by status, content type, and reason.
- [`useAdminClients`](./use-admin-clients-reference.md) -- Client filtering by status, plan, provider, and date ranges.
