---
id: use-home-two-logic-reference
title: useHomeTwoLogic Hook Reference
sidebar_label: useHomeTwoLogic
sidebar_position: 90
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useHomeTwoLogic

Logic hook for the Home Page Variant 2 layout. Handles category-based filtering and pagination of content items.

**Source file:** `template/hooks/use-home-two-logic.ts`

## Overview

`useHomeTwoLogic` provides the filtering and pagination logic used by the second home page layout variant. It accepts a list of items, the current pagination offset, and an array of selected category IDs. It returns both the full filtered item list and a paginated slice, making it straightforward to build category filter UIs with paginated results.

The file also exports a `getTagId` utility for normalizing tag identifiers, and an internal `itemHasCategory` helper that supports items with single or multiple categories in both string and object formats.

## Exported Members

| Export | Kind | Purpose |
|--------|------|---------|
| `useHomeTwoLogic` | Function (hook) | Main hook for filtering + pagination |
| `getTagId` | Function (utility) | Normalize a tag string or `Tag` object to its `id` |

---

## getTagId

Utility function that extracts a string identifier from a tag, whether it is already a plain string or a `Tag` object.

```ts
function getTagId(tag: string | Tag): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tag` | `string \| Tag` | A tag identifier or `Tag` object with an `id` field |

### Returns

`string` -- The tag's string identifier.

---

## useHomeTwoLogic

```ts
function useHomeTwoLogic(props: UseHome2LogicProps): {
  items: ItemData[];
  paginatedItems: ItemData[];
}
```

### Parameters

The hook accepts a single object argument:

```ts
type UseHome2LogicProps = {
  items: ItemData[];
  start: number;
  selectedCategories: string[];
};
```

| Property | Type | Description |
|----------|------|-------------|
| `items` | `ItemData[]` | The full list of content items to filter and paginate |
| `start` | `number` | The pagination offset (zero-based index of the first item to display) |
| `selectedCategories` | `string[]` | Array of category IDs to filter by. An empty array means no filtering (show all) |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `items` | `ItemData[]` | The full list of items after category filtering (before pagination) |
| `paginatedItems` | `ItemData[]` | A page-sized slice of the filtered items, from `start` to `start + PER_PAGE` |

### Implementation Details

1. **Category filtering**: If `selectedCategories` is non-empty, items are filtered using the internal `itemHasCategory` helper. This helper supports items with:
   - A single string category
   - A single object category (with an `id` property)
   - An array of string or object categories
   - Items with no category are excluded when filtering is active.

2. **Pagination**: The filtered results are sliced using the `PER_PAGE` constant (imported from `@/lib/paginate`, currently set to `12`), starting from the `start` offset.

3. **No category filter**: When `selectedCategories` is empty, all items are returned without filtering.

## Usage Examples

### Basic usage with category filter

```tsx
import { useHomeTwoLogic } from '@/hooks/use-home-two-logic';

function HomeTwoPage({ items }: { items: ItemData[] }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const { items: filteredItems, paginatedItems } = useHomeTwoLogic({
    items,
    start: page * 12,
    selectedCategories,
  });

  return (
    <div>
      <CategoryFilter
        selectedCategories={selectedCategories}
        onChange={setSelectedCategories}
      />
      <p>Showing {paginatedItems.length} of {filteredItems.length} results</p>
      <ItemGrid items={paginatedItems} />
      <Pagination
        total={filteredItems.length}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### Using getTagId for tag normalization

```tsx
import { getTagId } from '@/hooks/use-home-two-logic';

// Works with plain strings
getTagId('design-tools'); // => 'design-tools'

// Works with Tag objects
getTagId({ id: 'design-tools', name: 'Design Tools' }); // => 'design-tools'
```

## Related Hooks

- [`useFilters`](/docs/template/hooks/use-filters-reference) -- General-purpose filtering logic for item lists
- [`useInfiniteLoading`](/docs/template/hooks/use-infinite-loading-reference) -- Infinite scroll loading as an alternative to pagination
- [`usePaginatedQuery`](/docs/template/hooks/use-paginated-query-reference) -- Server-side paginated data fetching
- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Client-side item fetching and management
