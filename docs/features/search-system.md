---
id: search-system
title: "Search System"
sidebar_label: "Search System"
sidebar_position: 26
---

# Search System

The template implements a multi-layered search and filtering system that combines URL-based state, debounced text input, category and tag filters, and sort controls. The system is designed for fast perceived performance with debounced queries and automatic page resets.

## Architecture Overview

```
components/filters/
  index.ts                              -- Barrel exports
  types.ts                              -- Filter type definitions
  constants.ts                          -- Default values and configuration
  context/filter-context.tsx            -- FilterProvider and useFilters hook
  hooks/
    use-filter-state.ts                 -- URL-synced filter state
    use-sticky-header.ts                -- Sticky filter bar behavior
    use-tag-visibility.ts               -- Tag expand/collapse logic
  components/
    categories/                         -- Category filter components
    tags/                               -- Tag filter components
    controls/filter-controls.tsx        -- Sort and layout controls
    active-filters/active-filters.tsx   -- Active filter chips
    pagination/paginate.tsx             -- Pagination component
  utils/
    text-utils.ts                       -- Text formatting utilities
    style-utils.ts                      -- Dynamic style generation

hooks/
  use-debounced-search.ts              -- Debounced search hook
  use-debounced-value.ts               -- Generic debounce value hook
  use-client-item-filters.ts           -- Client-side filter state
  use-client-items.ts                  -- Item data fetching with filters

components/filters/filter-url-parser.tsx -- URL parameter parsing
```

## Filter Module Exports

The filters module provides a clean barrel export:

```tsx
// components/filters/index.ts
export * from './types';
export * from './constants';
export { FilterProvider, FilterContext, useFilters } from './context/filter-context';
export { useFilterState } from './hooks/use-filter-state';
export { useStickyHeader } from './hooks/use-sticky-header';
export { useTagVisibility } from './hooks/use-tag-visibility';
export { Categories } from './components/categories/categories-section';
export { Tags } from './components/tags/tags-section';
export { Paginate } from './components/pagination/paginate';
export { FilterControls } from './components/controls/filter-controls';
export { ActiveFilters } from './components/active-filters/active-filters';
export { CategoriesList, CategoryItem } from './components/categories';
export { TagsList, TagItem } from './components/tags';
export { SortControl } from './components/controls';
```

## Debounced Search

The `useDebounceSearch` hook at `hooks/use-debounced-search.ts` provides search-with-delay functionality:

```tsx
// hooks/use-debounced-search.ts
interface UseDebounceSearchProps {
  searchValue: string;
  delay?: number;
  onSearch: (value: string) => void | Promise<void>;
}

export function useDebounceSearch({
  searchValue,
  delay = 300,
  onSearch,
}: UseDebounceSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedValue = useDebounceValue(searchValue, delay);
  const previousValue = useRef<string>('');

  useEffect(() => {
    if (debouncedValue === previousValue.current) return;
    previousValue.current = debouncedValue;

    if (debouncedValue.trim() === '') {
      setIsSearching(false);
      onSearch('');
      return;
    }

    setIsSearching(true);
    onSearch(debouncedValue).finally(() => setIsSearching(false));
  }, [debouncedValue]);

  return { debouncedValue, isSearching, clearSearch };
}
```

Key behaviors:
- **Default delay**: 300ms debounce prevents excessive API calls during typing
- **Duplicate prevention**: compares against the previous value to skip redundant searches
- **Loading state**: `isSearching` is `true` while the debounced value has not yet settled OR while the search callback is running
- **Clear function**: resets internal state for programmatic clearing

## Client Item Filters

The `useClientItemFilters` hook at `hooks/use-client-item-filters.ts` manages all filter dimensions:

```tsx
// hooks/use-client-item-filters.ts
export function useClientItemFilters(options = {}) {
  const {
    defaultStatus = 'all',
    defaultSearch = '',
    defaultPage = 1,
    defaultLimit = 10,
    defaultSortBy = 'updated_at',
    defaultSortOrder = 'desc',
    searchDebounceMs = 300,
  } = options;

  const [status, setStatusState] = useState(defaultStatus);
  const [search, setSearchState] = useState(defaultSearch);
  const [page, setPageState] = useState(defaultPage);
  const [sortBy, setSortByState] = useState(defaultSortBy);
  const [sortOrder, setSortOrderState] = useState(defaultSortOrder);

  const debouncedSearch = useDebounceValue(search, searchDebounceMs);

  // Combined params object for API calls
  const params = useMemo(() => ({
    page, limit, status,
    search: debouncedSearch || undefined,
    sortBy, sortOrder,
  }), [page, limit, status, debouncedSearch, sortBy, sortOrder]);

  return {
    status, search, debouncedSearch, page, limit, sortBy, sortOrder,
    params,
    setStatus, setSearch, setPage, setLimit,
    setSortBy, setSortOrder, toggleSortOrder,
    resetFilters, goToPage, nextPage, prevPage,
    isSearching, hasActiveFilters,
  };
}
```

### Automatic Page Reset

When filters change, the page is automatically reset to 1 to avoid showing empty result pages:

```tsx
const setStatus = useCallback((newStatus) => {
  setStatusState(newStatus);
  setPageState(1); // Reset to page 1
}, []);

const setSortBy = useCallback((newSortBy) => {
  setSortByState(newSortBy);
  setPageState(1); // Reset to page 1
}, []);
```

### Active Filter Detection

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Filter Context

The filter system uses a React Context to share filter state across deeply nested components:

```tsx
// Usage pattern
<FilterProvider>
  <Categories />
  <Tags />
  <FilterControls />
  <ActiveFilters />
  <ItemGrid />
  <Paginate />
</FilterProvider>
```

Components access the shared state via the `useFilters` hook:

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Search API Integration

Search queries flow through the API layer to the backend. The typical pattern:

1. User types in the search input
2. `useDebounceSearch` waits 300ms after the last keystroke
3. The debounced value updates `params.search` in the filter hook
4. React Query detects the params change and triggers a new fetch
5. Results are displayed with loading indicators

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Pagination

The filter system includes built-in pagination helpers:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

The `Paginate` component from the filter module renders page controls and syncs with the filter context.

## Sort Controls

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## URL-Synced State

The `useFilterState` hook synchronizes filter values with URL query parameters, enabling shareable filtered views:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

The `filter-url-parser.tsx` utility handles parsing filter parameters from the URL on initial page load.

## Sticky Filter Header

The `useStickyHeader` hook manages the sticky behavior of the filter bar:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

When the user scrolls past a threshold, the filter bar becomes sticky with a blur backdrop and shadow effect.

## Active Filter Chips

The `ActiveFilters` component displays currently applied filters as dismissible chips:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## File Reference

| File | Purpose |
|------|---------|
| `components/filters/index.ts` | Barrel exports for the filter module |
| `components/filters/context/filter-context.tsx` | FilterProvider and useFilters hook |
| `components/filters/hooks/use-filter-state.ts` | URL-synced filter state |
| `components/filters/hooks/use-sticky-header.ts` | Sticky filter bar behavior |
| `components/filters/components/categories/` | Category filter UI |
| `components/filters/components/tags/` | Tag filter UI |
| `components/filters/components/controls/` | Sort and layout controls |
| `components/filters/components/active-filters/` | Active filter chips |
| `components/filters/components/pagination/` | Pagination component |
| `hooks/use-debounced-search.ts` | Debounced search with loading state |
| `hooks/use-debounced-value.ts` | Generic debounce value utility |
| `hooks/use-client-item-filters.ts` | Client-side filter state management |
