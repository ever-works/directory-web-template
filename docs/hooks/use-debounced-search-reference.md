---
id: use-debounced-search-reference
title: useDebouncedSearch / useDebounceValue
sidebar_label: useDebouncedSearch
sidebar_position: 37
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useDebouncedSearch / useDebounceValue

Two complementary hooks for debouncing values and search operations. `useDebounceValue` is a low-level primitive that delays value updates, while `useDebouncedSearch` builds on it to provide a complete search-with-debounce pattern including loading state tracking and duplicate-search prevention.

## Import

```typescript
import { useDebounceSearch } from '@/hooks/use-debounced-search';
import { useDebounceValue } from '@/hooks/use-debounced-value';
```

## API Reference

### `useDebounceSearch`

```typescript
function useDebounceSearch(props: UseDebounceSearchProps): UseDebounceSearchReturn;
```

#### `UseDebounceSearchProps`

| Property | Type | Default | Description |
|---|---|---|---|
| `searchValue` | `string` | *required* | The raw search input value (updates on every keystroke). |
| `delay` | `number` | `300` | Debounce delay in milliseconds. |
| `onSearch` | `(value: string) => void \| Promise<void>` | *required* | Callback invoked with the debounced search value. Can be async. |

#### `UseDebounceSearchReturn`

| Property | Type | Description |
|---|---|---|
| `debouncedValue` | `string` | The debounced version of `searchValue`, updated after `delay` milliseconds of inactivity. |
| `isSearching` | `boolean` | `true` while a search is pending or the debounced value has not yet caught up to the input value. |
| `clearSearch` | `() => void` | Resets the internal search state, clearing the previous-value tracker. |

---

### `useDebounceValue`

```typescript
function useDebounceValue<T>(value: T, delay?: number): T;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `value` | `T` | *required* | The value to debounce. |
| `delay` | `number` | `300` | Debounce delay in milliseconds. |

**Returns:** The debounced value of type `T`, which updates `delay` milliseconds after the last change to `value`.

## Usage Examples

### Search Input with Loading Indicator

```tsx
function SearchBar() {
  const [query, setQuery] = useState('');

  const { debouncedValue, isSearching } = useDebounceSearch({
    searchValue: query,
    delay: 400,
    onSearch: async (value) => {
      const results = await fetchSearchResults(value);
      setSearchResults(results);
    },
  });

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {isSearching && (
        <Spinner className="absolute right-3 top-3" />
      )}
      <p className="text-sm text-gray-500">
        {debouncedValue ? `Showing results for "${debouncedValue}"` : 'Type to search'}
      </p>
    </div>
  );
}
```

### Debounced Filter

```tsx
function FilteredList({ items }: { items: Item[] }) {
  const [filterText, setFilterText] = useState('');
  const debouncedFilter = useDebounceValue(filterText, 250);

  const filteredItems = useMemo(
    () => items.filter((item) =>
      item.name.toLowerCase().includes(debouncedFilter.toLowerCase())
    ),
    [items, debouncedFilter]
  );

  return (
    <div>
      <input
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        placeholder="Filter items..."
      />
      {filteredItems.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Search with URL Sync

```tsx
function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const { isSearching } = useDebounceSearch({
    searchValue: query,
    delay: 500,
    onSearch: (value) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      router.push(`?${params.toString()}`);
    },
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search and update URL..."
      />
      {isSearching && <p>Searching...</p>}
    </div>
  );
}
```

## Configuration

These hooks are purely client-side and require no server configuration or providers. Both are marked with `"use client"` (via the search hook) and use standard React state and effects.

### Delay Tuning

| Use Case | Recommended Delay | Rationale |
|---|---|---|
| API search queries | 300-500ms | Balances responsiveness with server load reduction. |
| Local filtering | 150-250ms | Faster feedback since no network round-trip. |
| URL parameter sync | 500ms | Avoids excessive browser history entries. |
| Form validation | 300ms | Provides timely feedback without flicker. |

## Edge Cases and Gotchas

- **Empty String Handling**: When `searchValue` becomes empty (or whitespace-only), `useDebouncedSearch` immediately calls `onSearch('')` without waiting for the debounce delay and sets `isSearching` to `false`. This ensures the UI clears promptly when the user erases their input.
- **Duplicate Prevention**: The hook tracks the previous search value via a `useRef`. If the debounced value has not changed since the last search, `onSearch` is not called again. This prevents redundant API calls when the user types and then deletes back to the same text.
- **isSearching Composite State**: `isSearching` is `true` in two cases: (1) the `onSearch` callback is currently executing, or (2) the raw `searchValue` differs from `debouncedValue` (meaning a debounce is pending). This provides a comprehensive "busy" indicator.
- **Cleanup on Unmount**: `useDebounceValue` clears its timeout on unmount via the effect cleanup. No pending state updates will fire after the component is removed.
- **Async onSearch**: The `onSearch` callback can be async. The hook awaits it and sets `isSearching` to `false` in a `finally` block, ensuring the loading state is always cleared even if the search throws an error.
- **clearSearch Purpose**: Call `clearSearch()` when you need to reset the search state externally (e.g., when switching tabs or clearing filters programmatically). It resets the `previousValue` ref so the next search will always fire.
- **Generic Type Support**: `useDebounceValue` is generic and works with any type (`string`, `number`, objects, arrays). However, for objects and arrays, ensure referential stability or the debounce will re-trigger on every render.

## Related Hooks

- [useUrlExtraction](./use-url-extraction-reference.md) -- Debounce URL input before triggering extraction.
- [useInfiniteLoading](./use-infinite-loading-reference.md) -- Combine debounced search with infinite scroll for paginated search results.
- [useGeolocation](./use-geolocation-reference.md) -- Debounce location-based searches after coordinate changes.
