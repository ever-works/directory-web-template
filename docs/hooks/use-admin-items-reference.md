---
id: use-admin-items-reference
title: useAdminItems Hook Reference
sidebar_label: useAdminItems
sidebar_position: 50
---

# useAdminItems

## Overview

`useAdminItems` is a comprehensive React hook for managing items in the admin panel. It provides full CRUD operations, item review workflows (approve/reject), bulk actions, paginated listing with filtering and sorting, and real-time statistics. Built on top of TanStack React Query and the internal `serverClient` API layer.

**Source:** `template/hooks/use-admin-items.ts`

## Signature / Parameters

```typescript
function useAdminItems(params?: ItemsListParams): UseAdminItemsReturn
```

### `ItemsListParams`

| Parameter    | Type                                                  | Default     | Description                                |
|-------------|-------------------------------------------------------|-------------|--------------------------------------------|
| `page`      | `number`                                              | `undefined` | Current page number for pagination         |
| `limit`     | `number`                                              | `undefined` | Number of items per page                   |
| `status`    | `string`                                              | `undefined` | Filter by item status                      |
| `categories`| `string[]`                                            | `undefined` | Filter by category IDs                     |
| `tags`      | `string[]`                                            | `undefined` | Filter by tag IDs                          |
| `search`    | `string`                                              | `undefined` | Search term for text matching              |
| `sortBy`    | `'name' \| 'updated_at' \| 'status' \| 'submitted_at'` | `undefined` | Field to sort results by                   |
| `sortOrder` | `'asc' \| 'desc'`                                     | `undefined` | Sort direction                             |

## Return Values

The hook returns an object with the following shape:

### Data

| Property     | Type              | Description                                       |
|-------------|-------------------|---------------------------------------------------|
| `items`     | `ItemData[]`      | Array of items for the current page                |
| `total`     | `number`          | Total number of items matching current filters     |
| `page`      | `number`          | Current page number (defaults to `1`)              |
| `totalPages`| `number`          | Total number of pages (defaults to `1`)            |
| `stats`     | `ItemStatsResponse`| Aggregate counts by status                        |

### `ItemStatsResponse`

```typescript
interface ItemStatsResponse {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}
```

### Loading States

| Property           | Type                                         | Description                                              |
|-------------------|----------------------------------------------|----------------------------------------------------------|
| `isLoading`       | `boolean`                                    | `true` only on initial load (no cached data)             |
| `isFetching`      | `boolean`                                    | `true` when fetching, including background refetch       |
| `isStatsLoading`  | `boolean`                                    | `true` while stats are being fetched                     |
| `isSubmitting`    | `boolean`                                    | `true` when any mutation is pending                      |
| `isApproving`     | `boolean`                                    | `true` when a review-approve mutation is in flight       |
| `isRejecting`     | `boolean`                                    | `true` when a review-reject mutation is in flight        |
| `isDeleting`      | `boolean`                                    | `true` when a delete mutation is in flight               |
| `pendingItemId`   | `string \| null`                             | ID of the item currently being mutated                   |
| `isBulkProcessing`| `boolean`                                    | `true` when a bulk action is in progress                 |
| `bulkActionType`  | `'approve' \| 'reject' \| 'delete' \| null`  | Type of bulk action currently processing                 |

### Actions

| Method         | Signature                                                                       | Description                                    |
|---------------|---------------------------------------------------------------------------------|------------------------------------------------|
| `createItem`  | `(data: CreateItemRequest) => Promise<boolean>`                                 | Create a new item. Returns `true` on success.  |
| `updateItem`  | `(id: string, data: UpdateItemRequest) => Promise<boolean>`                     | Update an existing item by ID.                 |
| `deleteItem`  | `(id: string) => Promise<boolean>`                                              | Delete an item by ID.                          |
| `reviewItem`  | `(id: string, status: 'approved' \| 'rejected', notes?: string) => Promise<boolean>` | Approve or reject an item with optional notes. |

### Bulk Actions

| Method         | Signature                                                                      | Description                                     |
|---------------|--------------------------------------------------------------------------------|-------------------------------------------------|
| `bulkApprove` | `(ids: string[]) => Promise<BulkActionResponse \| null>`                       | Approve multiple items at once.                 |
| `bulkReject`  | `(ids: string[], reason: string) => Promise<BulkActionResponse \| null>`       | Reject multiple items with a reason.            |
| `bulkDelete`  | `(ids: string[]) => Promise<BulkActionResponse \| null>`                       | Delete multiple items at once.                  |

### `BulkActionResponse`

```typescript
interface BulkActionResponse {
  success: boolean;
  message: string;
  results: { id: string; success: boolean; error?: string }[];
  summary: { total: number; successful: number; failed: number };
}
```

### Utility

| Method        | Signature      | Description                                         |
|--------------|----------------|-----------------------------------------------------|
| `refetch`    | `() => void`   | Re-execute the items list query                     |
| `refreshData`| `() => void`   | Clear server cache and refetch both items and stats |

## Implementation Details

- **Query caching:** Uses TanStack React Query with a 5-minute `staleTime` and 10-minute `gcTime`. Background refetch interval is set to 5 minutes.
- **Placeholder data:** Uses `keepPreviousData` so that paginated transitions do not flash empty states.
- **Stats filtering:** The stats query receives the same `search`, `categories`, and `tags` filters as the items list, so status counters update in sync with the active filter set.
- **Toast notifications:** All mutation success and error states trigger `sonner` toast notifications automatically.
- **Cache invalidation:** After every successful mutation, `refreshData` is called, which clears the `serverClient` cache and refetches both items and stats queries.
- **Error handling:** All action handlers return `boolean` -- `true` on success, `false` on failure. Errors are caught internally and surfaced via toast.
- **Bulk action feedback:** Bulk handlers provide granular feedback: full success shows a success toast, partial success shows a warning, and complete failure shows an error toast.

### Query Keys

```typescript
const QUERY_KEYS = {
  items: ['admin', 'items'],
  itemsList: (params) => ['admin', 'items', 'list', params],
  itemStats: (params) => ['admin', 'items', 'stats', params],
};
```

## Usage Examples

### Basic item listing with pagination

```tsx
import { useAdminItems } from '@/hooks/use-admin-items';

function ItemsPage() {
  const [page, setPage] = useState(1);

  const {
    items,
    total,
    totalPages,
    isLoading,
    stats,
  } = useAdminItems({ page, limit: 20 });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <StatsBar stats={stats} />
      <ItemsTable items={items} />
      <Pagination
        current={page}
        total={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
```

### Filtering and searching

```tsx
const { items, isLoading } = useAdminItems({
  page: 1,
  limit: 10,
  status: 'pending',
  search: 'react',
  categories: ['cat-1', 'cat-2'],
  sortBy: 'submitted_at',
  sortOrder: 'desc',
});
```

### Reviewing an item

```tsx
const { reviewItem, isApproving, isRejecting, pendingItemId } = useAdminItems();

const handleApprove = async (itemId: string) => {
  const success = await reviewItem(itemId, 'approved', 'Looks great!');
  if (success) {
    // Item was approved, data auto-refreshes
  }
};

const handleReject = async (itemId: string) => {
  const success = await reviewItem(itemId, 'rejected', 'Does not meet guidelines');
};
```

### Bulk operations

```tsx
const { bulkApprove, bulkDelete, isBulkProcessing, bulkActionType } = useAdminItems();

const handleBulkApprove = async (selectedIds: string[]) => {
  const result = await bulkApprove(selectedIds);
  if (result) {
    console.log(`${result.summary.successful} of ${result.summary.total} approved`);
  }
};
```

## Related Hooks

- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management with debounced search, used by many admin hooks.
- [`useAdminCategories`](./use-admin-categories-reference.md) -- Manage category data used for item filtering.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Dashboard-level platform statistics.
- [`useAdminNotifications`](./use-admin-notifications-reference.md) -- Notifications triggered by item submissions and reviews.
