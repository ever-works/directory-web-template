---
id: use-admin-collections-reference
title: useAdminCollections Hook Reference
sidebar_label: useAdminCollections
sidebar_position: 70
---

# useAdminCollections

## Overview

`useAdminCollections` is a React hook for managing collections in the admin panel. It provides full CRUD operations, item assignment to collections, paginated listing with search and sorting, and automatic cache invalidation. Built on top of TanStack React Query and the internal `serverClient` API layer.

**Source:** `template/hooks/use-admin-collections.ts`

## Signature / Parameters

```typescript
function useAdminCollections(params?: CollectionListParams): UseAdminCollectionsReturn
```

### `CollectionListParams`

| Parameter         | Type                                       | Default     | Description                                  |
|-------------------|--------------------------------------------|-------------|----------------------------------------------|
| `page`            | `number`                                   | `undefined` | Current page number for pagination           |
| `limit`           | `number`                                   | `undefined` | Number of collections per page               |
| `search`          | `string`                                   | `undefined` | Search term to filter collections by name    |
| `includeInactive` | `boolean`                                  | `undefined` | Whether to include inactive collections      |
| `sortBy`          | `'name' \| 'item_count' \| 'created_at'`   | `undefined` | Field to sort results by                     |
| `sortOrder`       | `'asc' \| 'desc'`                          | `undefined` | Sort direction                               |

## Return Values

The hook returns an object with the following shape:

### Data

| Property      | Type            | Description                                          |
|---------------|-----------------|------------------------------------------------------|
| `collections` | `Collection[]`  | Array of collections for the current page            |
| `total`       | `number`        | Total number of collections matching current filters |
| `page`        | `number`        | Current page number (defaults to `1`)                |
| `totalPages`  | `number`        | Total number of pages (defaults to `1`)              |
| `limit`       | `number`        | Current page size (defaults to param `limit` or `10`)|

### Loading States

| Property       | Type      | Description                                               |
|----------------|-----------|-----------------------------------------------------------|
| `isLoading`    | `boolean` | `true` only on initial load (no cached data)              |
| `isSubmitting` | `boolean` | `true` when any mutation (create/update/delete/assign) is pending |

### Actions

| Method              | Signature                                                                  | Description                                              |
|---------------------|---------------------------------------------------------------------------|----------------------------------------------------------|
| `createCollection`  | `(data: CreateCollectionRequest) => Promise<boolean>`                     | Create a new collection. Returns `true` on success.      |
| `updateCollection`  | `(id: string, data: UpdateCollectionRequest) => Promise<boolean>`         | Update an existing collection by ID.                     |
| `deleteCollection`  | `(id: string) => Promise<boolean>`                                        | Delete a collection by ID.                               |
| `assignItems`       | `(id: string, itemSlugs: string[]) => Promise<boolean>`                   | Assign items to a collection by their slugs.             |
| `fetchAssignedItems`| `(id: string) => Promise<Array<{ id: string; name: string; slug: string }>>` | Fetch items currently assigned to a collection.       |

### Utility

| Method        | Signature    | Description                                              |
|---------------|-------------|----------------------------------------------------------|
| `refetch`     | `() => void` | Re-execute the collections list query                    |
| `refreshData` | `() => void` | Clear server cache and invalidate all collection queries |

## Implementation Details

- **Query caching:** Uses TanStack React Query with a 5-minute `staleTime` and 10-minute `gcTime`.
- **Toast notifications:** All mutation success and error states trigger `sonner` toast notifications automatically.
- **Cache invalidation:** After every successful mutation, the server-side API cache is cleared via `apiUtils.clearCache()` and all queries under the `['admin', 'collections']` key are invalidated.
- **Error handling:** All action handlers return `boolean` -- `true` on success, `false` on failure. Errors are caught internally and surfaced via toast.

### Query Keys

```typescript
const QUERY_KEYS = {
  collections: ['admin', 'collections'],
  collectionsList: (params) => ['admin', 'collections', 'list', params],
  collection: (id) => ['admin', 'collections', 'detail', id],
  collectionItems: (id) => ['admin', 'collections', 'items', id],
};
```

### API Endpoints

| Operation       | Method   | Endpoint                                |
|-----------------|----------|-----------------------------------------|
| List            | `GET`    | `/api/admin/collections`                |
| Create          | `POST`   | `/api/admin/collections`                |
| Update          | `PUT`    | `/api/admin/collections/:id`            |
| Delete          | `DELETE` | `/api/admin/collections/:id`            |
| Fetch items     | `GET`    | `/api/admin/collections/:id/items`      |
| Assign items    | `POST`   | `/api/admin/collections/:id/items`      |

## Usage Examples

### Basic collection listing with pagination

```tsx
import { useAdminCollections } from '@/hooks/use-admin-collections';

function CollectionsPage() {
  const [page, setPage] = useState(1);

  const {
    collections,
    total,
    totalPages,
    isLoading,
  } = useAdminCollections({ page, limit: 20 });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>{total} collections found</p>
      <CollectionsTable collections={collections} />
      <Pagination current={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Searching and sorting

```tsx
const { collections, isLoading } = useAdminCollections({
  page: 1,
  limit: 10,
  search: 'featured',
  sortBy: 'item_count',
  sortOrder: 'desc',
  includeInactive: true,
});
```

### Creating a collection

```tsx
const { createCollection, isSubmitting } = useAdminCollections();

const handleCreate = async () => {
  const success = await createCollection({
    name: 'Top Picks',
    description: 'Curated top picks for the homepage',
    isActive: true,
  });
  if (success) {
    // Collection created, data auto-refreshes
  }
};
```

### Assigning items to a collection

```tsx
const { assignItems, fetchAssignedItems } = useAdminCollections();

// Fetch currently assigned items
const currentItems = await fetchAssignedItems('collection-id-123');

// Assign new items by slug
const success = await assignItems('collection-id-123', [
  'my-item-slug',
  'another-item-slug',
]);
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Manage items that can be assigned to collections.
- [`useAdminCategories`](./use-admin-categories-reference.md) -- Manage categories, a related organizational concept.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management for admin panels.
