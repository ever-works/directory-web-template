---
id: pagination-system
title: "Pagination System"
sidebar_label: "Pagination System"
sidebar_position: 45
---

# Pagination System

## Overview

The Pagination System provides server-side pagination computation and client-side page navigation utilities. It consists of two small, focused modules: `lib/paginate.ts` for calculating page metadata (page numbers, offsets) and `utils/pagination.ts` for safely clamping page numbers and triggering scroll-to-top behavior on page changes.

## Architecture

The pagination system is intentionally lightweight and split across two layers:

- **`lib/paginate.ts`** (Server/shared) -- Pure functions for pagination math. Used in API routes, server components, and data-fetching logic to compute which slice of data to return.
- **`utils/pagination.ts`** (Client) -- A UI helper that clamps page numbers to valid ranges and scrolls the page to the top. Used by pagination components and list views.

Both modules are consumed by the pagination UI components and the content listing pages. The `ConfigManager` provides the `itemsPerPage` value that feeds into these calculations.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## API Reference

### Exports from `lib/paginate.ts`

#### `PER_PAGE: number`

Default items per page constant. Value: `12`.

#### `totalPages(size: number, perPage?: number): number`

Calculates the total number of pages for a given collection size. Uses `Math.ceil()` to ensure the last partial page is included.

**Parameters:**
- `size` -- Total number of items in the collection
- `perPage` -- Items per page (defaults to `PER_PAGE`)

**Returns:** Total page count (minimum 1 for non-empty collections)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Computes pagination metadata from a raw page parameter (which may come as a string from URL query params).

**Parameters:**
- `rawPage` -- The requested page number (defaults to `1`). Accepts both `number` and `string`.
- `perPage` -- Items per page (defaults to `PER_PAGE`)

**Returns:**
- `page` -- The parsed page number as an integer
- `start` -- The zero-based index offset for slicing the data array

### Exports from `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Safely navigates to a new page by clamping the value to the valid range `[1, total]`, updating the page state, and scrolling the window to the top with smooth animation.

**Parameters:**
- `newPage` -- The requested page number (can be out of range)
- `total` -- Total number of pages
- `setPage` -- React state setter function for the current page

**Behavior:**
- Clamps `NaN` values to page 1
- Clamps values below 1 to page 1
- Clamps values above `total` to `total`
- Calls `window.scrollTo({ top: 0, behavior: 'smooth' })` (safe for SSR; checks `typeof window`)

## Implementation Details

**String parsing**: `paginateMeta` accepts `string | number` for the `rawPage` parameter because URL query parameters arrive as strings. It uses `parseInt()` for conversion.

**Zero-based offset**: The `start` value returned by `paginateMeta` is calculated as `(page - 1) * perPage`, providing a zero-based index suitable for `Array.slice()` or SQL `OFFSET` clauses.

**SSR safety**: `clampAndScrollToTop` checks `typeof window !== 'undefined'` before calling `window.scrollTo()`, making it safe to call in server-side rendering contexts.

**NaN handling**: `clampAndScrollToTop` converts the input with `Number()` and falls back to page 1 if the result is `NaN`.

## Configuration

The default page size (`PER_PAGE = 12`) is a constant in `lib/paginate.ts`. The runtime page size can be overridden through the `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

The `ConfigManager` supports two pagination types:
- `'standard'` -- Traditional page-by-page navigation
- `'infinite'` -- Infinite scroll / load-more pattern

## Usage Examples

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Best Practices

- Always use `paginateMeta()` to parse page parameters from URL query strings to handle type coercion and defaults safely.
- Pass the `perPage` override from `ConfigManager` rather than relying on the hardcoded `PER_PAGE` constant when the admin may have changed the page size.
- Use `clampAndScrollToTop()` in all client-side page navigation to prevent out-of-range page numbers and provide consistent UX.
- For infinite scroll implementations, use the `start` offset from `paginateMeta()` to calculate the next slice of items to append.
- Consider the pagination `type` from `ConfigManager` (`'standard'` vs `'infinite'`) when choosing which pagination UI component to render.

## Related Modules

- [Config Manager System](./config-manager-system) -- Provides runtime pagination configuration (`type`, `itemsPerPage`)
- [Content Library](/docs/template/architecture/content-library) -- Uses pagination for content listing pages
