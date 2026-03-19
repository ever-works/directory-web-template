---
id: use-debounced-value-reference
title: "useDebounceValue Reference"
sidebar_label: "useDebounceValue"
sidebar_position: 42
---

# useDebounceValue

## Overview

`useDebounceValue` delays updating a value until a specified time has elapsed since the last change. This is essential for performance-sensitive scenarios such as search inputs, filter controls, and API query parameters where you want to avoid firing requests on every keystroke. The hook returns the debounced value, which only updates after the caller stops changing the input for the given delay period.

## Import

```typescript
import { useDebounceValue } from "@/hooks/use-debounced-value";
```

## API Reference

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `value` | `T` (generic) | Yes | -- | The value to debounce. Can be any type (string, number, object, etc.). |
| `delay` | `number` | No | `300` | Debounce delay in milliseconds. The debounced value updates only after this period of inactivity. |

### Generic Type Parameter

| Parameter | Description |
|-----------|-------------|
| `T` | The type of the value being debounced. Inferred automatically from the `value` argument. |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| *(return)* | `T` | The debounced value. Initially equals the input value and updates only after the delay has passed without further changes. |

## Usage Examples

### Basic Usage

```typescript
import { useDebounceValue } from "@/hooks/use-debounced-value";
import { useState } from "react";

function SearchInput() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounceValue(query, 400);

  // debouncedQuery updates 400ms after the user stops typing
  useEffect(() => {
    if (debouncedQuery) {
      fetchSearchResults(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Advanced Usage

```typescript
import { useDebounceValue } from "@/hooks/use-debounced-value";
import { useState, useMemo } from "react";

interface FilterState {
  category: string;
  minPrice: number;
  maxPrice: number;
}

function FilterPanel({ onFiltersChange }: { onFiltersChange: (f: FilterState) => void }) {
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    minPrice: 0,
    maxPrice: 1000,
  });

  const debouncedFilters = useDebounceValue(filters, 500);

  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  return (
    <div>
      <select
        value={filters.category}
        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
      >
        <option value="all">All</option>
        <option value="tools">Tools</option>
      </select>
      <input
        type="range"
        min={0}
        max={1000}
        value={filters.maxPrice}
        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
      />
    </div>
  );
}
```

## Integration Patterns

`useDebounceValue` is a low-level building block used by higher-level hooks like `useDebouncedSearch`. It works with any React state that changes frequently and needs rate-limiting before triggering side effects. The hook uses a `setTimeout`/`clearTimeout` pattern internally and properly cleans up timers when the component unmounts or when dependencies change.

## Best Practices

- **Use 200--500ms for search inputs** to balance responsiveness with API load reduction. A delay of 300ms (the default) works well for most search scenarios.
- **Use longer delays (500--1000ms) for expensive operations** like complex filter recalculations or heavy API queries.
- **Debounce the value, not the handler** -- this hook debounces the output state rather than the event handler, which is simpler to compose with `useEffect`.
- **Remember that the initial render uses the non-debounced value**, so downstream consumers receive the initial value immediately.
- **Combine with loading indicators** to signal to users that results are pending while the debounce timer is active.

## Related Hooks

- [useDebouncedSearch](./use-debounced-search-reference.md) -- Higher-level search hook that uses debouncing internally.
- [useFilters](./use-filters-reference.md) -- Filter management hook that benefits from debounced inputs.
- [usePaginatedQuery](./use-paginated-query-reference.md) -- Paginated data fetching that often consumes debounced filter values.
