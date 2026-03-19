---
id: use-admin-featured-items-reference
title: useAdminFeaturedItems Hook Reference
sidebar_label: useAdminFeaturedItems
sidebar_position: 71
---

# useAdminFeaturedItems

## Overview

`useAdminFeaturedItems` is a React hook for managing featured items in the admin panel. It provides CRUD operations, ordering control, client-side search filtering, pagination, and access to the full items catalog for cross-referencing. Built on top of TanStack React Query and the internal `serverClient` API layer.

**Source:** `template/hooks/use-admin-featured-items.ts`

## Signature / Parameters

```typescript
function useAdminFeaturedItems(
  options?: UseAdminFeaturedItemsOptions
): UseAdminFeaturedItemsReturn
```

### `UseAdminFeaturedItemsOptions`

| Parameter        | Type      | Default | Description                                  |
|------------------|-----------|---------|----------------------------------------------|
| `page`           | `number`  | `1`     | Initial page number for pagination           |
| `limit`          | `number`  | `10`    | Number of featured items per page            |
| `showActiveOnly` | `boolean` | `true`  | Whether to show only active featured items   |
| `searchTerm`     | `string`  | `""`    | Initial search term for client-side filtering|

## Return Values

The hook returns an object implementing `UseAdminFeaturedItemsReturn`:

### Data

| Property        | Type              | Description                                                        |
|-----------------|-------------------|--------------------------------------------------------------------|
| `featuredItems` | `FeaturedItem[]`  | Array of featured items from the current server page               |
| `allItems`      | `ItemData[]`      | Full catalog of all items (up to 1000), for cross-referencing      |
| `filteredItems` | `FeaturedItem[]`  | Featured items filtered by the current `searchTerm` (client-side)  |

### `FeaturedItem`

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;
  featuredUntil?: string;
  isActive: boolean;
  featuredBy: string;
  featuredAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### Loading States

| Property       | Type      | Description                                                 |
|----------------|-----------|-------------------------------------------------------------|
| `isLoading`    | `boolean` | `true` when either featured items or all items are loading  |
| `isSubmitting` | `boolean` | `true` when any create/update/delete mutation is pending    |

### Pagination

| Property      | Type     | Description                           |
|---------------|----------|---------------------------------------|
| `currentPage` | `number` | Current page number                   |
| `totalPages`  | `number` | Total number of pages (defaults to 1) |
| `totalItems`  | `number` | Total number of featured items        |

### Filters

| Property         | Type      | Description                              |
|------------------|-----------|------------------------------------------|
| `searchTerm`     | `string`  | Current client-side search filter value  |
| `showActiveOnly` | `boolean` | Current active-only filter state         |

### Actions

| Method               | Signature                                                    | Description                                        |
|----------------------|--------------------------------------------------------------|----------------------------------------------------|
| `createFeaturedItem` | `(data: Partial<FeaturedItem>) => Promise<boolean>`          | Feature a new item. Returns `true` on success.     |
| `updateFeaturedItem` | `(id: string, data: Partial<FeaturedItem>) => Promise<boolean>` | Update a featured item by ID.                   |
| `deleteFeaturedItem` | `(id: string) => Promise<boolean>`                           | Remove an item from featured.                      |
| `updateOrder`        | `(id: string, newOrder: number) => Promise<boolean>`         | Change the display order of a featured item.       |

### Filter Actions

| Method             | Signature                     | Description                         |
|--------------------|-------------------------------|-------------------------------------|
| `setSearchTerm`    | `(term: string) => void`      | Update the client-side search term  |
| `setShowActiveOnly`| `(active: boolean) => void`   | Toggle active-only filter           |
| `setCurrentPage`   | `(page: number) => void`      | Navigate to a specific page         |

### Utility

| Method          | Signature                                    | Description                                                |
|-----------------|----------------------------------------------|------------------------------------------------------------|
| `getItemBySlug` | `(slug: string) => ItemData \| undefined`    | Look up a full item record by slug from the all-items cache|
| `refreshData`   | `() => void`                                 | Invalidate all featured items and all-items queries        |

## Implementation Details

- **Dual queries:** The hook runs two parallel queries -- one for paginated featured items (5-minute `staleTime`, 10-minute `gcTime`, 5-minute refetch interval, 3 retries) and one for the full items catalog (10-minute `staleTime`, 30-minute `gcTime`).
- **Client-side filtering:** The `filteredItems` property applies `searchTerm` locally against `itemName` and `itemSlug`, providing instant search without additional server requests.
- **Toast notifications:** All mutation success and error states trigger `sonner` toast notifications automatically.
- **Cache invalidation:** On mutation success, both the `featured-items` and `all-items` query families are invalidated.
- **Error handling:** All action handlers return `boolean` -- `true` on success, `false` on failure.
- **Memoization:** The `allItems` array and `getItemBySlug` callback are memoized to prevent unnecessary re-renders.

### Query Keys

```typescript
const featuredItemsQueryKeys = {
  all: ['featured-items'],
  lists: () => ['featured-items', 'list'],
  list: (filters) => ['featured-items', 'list', filters],
  details: () => ['featured-items', 'detail'],
  detail: (id) => ['featured-items', 'detail', id],
};

const allItemsQueryKeys = {
  all: ['all-items'],
  lists: () => ['all-items', 'list'],
};
```

### API Endpoints

| Operation | Method   | Endpoint                        |
|-----------|----------|---------------------------------|
| List      | `GET`    | `/api/admin/featured-items`     |
| Create    | `POST`   | `/api/admin/featured-items`     |
| Update    | `PUT`    | `/api/admin/featured-items/:id` |
| Delete    | `DELETE` | `/api/admin/featured-items/:id` |
| All items | `GET`    | `/api/admin/items?page=1&limit=1000` |

## Usage Examples

### Basic featured items listing

```tsx
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

function FeaturedItemsPage() {
  const {
    featuredItems,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
  } = useAdminFeaturedItems({ limit: 20 });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>{totalItems} featured items</p>
      <FeaturedItemsTable items={featuredItems} />
      <Pagination
        current={currentPage}
        total={totalPages}
        onChange={setCurrentPage}
      />
    </div>
  );
}
```

### Client-side search filtering

```tsx
const {
  filteredItems,
  searchTerm,
  setSearchTerm,
} = useAdminFeaturedItems();

return (
  <div>
    <SearchInput value={searchTerm} onChange={setSearchTerm} />
    <FeaturedItemsList items={filteredItems} />
  </div>
);
```

### Featuring an item and reordering

```tsx
const {
  createFeaturedItem,
  updateOrder,
  isSubmitting,
} = useAdminFeaturedItems();

// Feature a new item
const handleFeature = async (itemSlug: string) => {
  const success = await createFeaturedItem({
    itemSlug,
    featuredOrder: 1,
    isActive: true,
  });
};

// Change display order
const handleReorder = async (id: string, newPosition: number) => {
  await updateOrder(id, newPosition);
};
```

### Cross-referencing items

```tsx
const { featuredItems, getItemBySlug } = useAdminFeaturedItems();

// Look up full item data for a featured item
const fullItem = getItemBySlug(featuredItems[0]?.itemSlug);
console.log(fullItem?.name, fullItem?.description);
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Full item CRUD management in the admin panel.
- [`useAdminCollections`](./use-admin-collections-reference.md) -- Manage curated collections of items.
- [`useFeaturedItemsClient`](./use-featured-items-client-reference.md) -- Client-facing hook for displaying featured items on the public site.
