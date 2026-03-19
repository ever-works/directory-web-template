---
id: use-client-items-reference
title: useClientItems Hook Reference
sidebar_label: useClientItems
sidebar_position: 70
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useClientItems

Manages the full lifecycle of client-submitted items: listing with pagination, updating, soft-deleting, and restoring. Fetches item statistics independently for dashboard widgets and exposes prefetching for seamless pagination.

**Source:** `template/hooks/use-client-items.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useClientItems` | Fetch, update, delete, and restore client items with pagination |

## Exported Types

```ts
export interface ClientItemsListResponse {
  items: ClientSubmissionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: ClientItemStats;
  success: boolean;
  error?: string;
}

export interface ClientStatsResponse {
  success: boolean;
  stats: ClientItemStats;
  error?: string;
}
```

## Exported Constants

```ts
export const CLIENT_ITEMS_QUERY_KEYS = {
  clientItems: ['client', 'items'] as const,
  clientItemsList: (params: ClientItemsListParams) =>
    [...CLIENT_ITEMS_QUERY_KEYS.clientItems, 'list', params] as const,
  clientItemStats: () =>
    [...CLIENT_ITEMS_QUERY_KEYS.clientItems, 'stats'] as const,
  clientItemDetail: (id: string) =>
    [...CLIENT_ITEMS_QUERY_KEYS.clientItems, 'detail', id] as const,
} as const;
```

These query keys are exported for use in sibling hooks such as `useClientItemDetails` and `useDeletedClientItems`.

---

## Signature

```ts
function useClientItems(params?: ClientItemsListParams): UseClientItemsReturn;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `params` | `ClientItemsListParams` | `{}` | Filtering, pagination, and sorting options |

#### ClientItemsListParams

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | — | Page number (1-based) |
| `limit` | `number` | — | Items per page |
| `status` | `ClientStatusFilter` | — | Filter by status: `'all'`, `'approved'`, `'pending'`, `'rejected'` |
| `search` | `string` | — | Free-text search term |
| `sortBy` | `'name' \| 'updated_at' \| 'status' \| 'submitted_at'` | — | Sort field |
| `sortOrder` | `'asc' \| 'desc'` | — | Sort direction |

---

## Return Values

```ts
const {
  // Data
  items,              // ClientSubmissionData[] -- Current page of items
  total,              // number -- Total item count across all pages
  page,               // number -- Current page number
  limit,              // number -- Items per page
  totalPages,         // number -- Total number of pages
  stats,              // ClientItemStats -- Status breakdown counts

  // Loading states
  isLoading,          // boolean -- True on initial load with no cached data
  isFetching,         // boolean -- True during any fetch (including background)
  isStatsLoading,     // boolean -- True while stats query is loading
  isUpdating,         // boolean -- True while an update mutation is in-flight
  isDeleting,         // boolean -- True while a delete mutation is in-flight
  isRestoring,        // boolean -- True while a restore mutation is in-flight
  isSubmitting,       // boolean -- True if any mutation is in-flight

  // Error
  error,              // Error | null -- Fetch error if any

  // Actions
  updateItem,         // (id: string, data: ClientUpdateItemRequest) => Promise<boolean>
  deleteItem,         // (id: string) => Promise<boolean>
  restoreItem,        // (id: string) => Promise<boolean>

  // Utility
  refetch,            // () => void -- Re-execute the items query
  refreshData,        // () => void -- Invalidate all client item queries
  prefetchNextPage,   // (nextPage: number) => void -- Prefetch the next page into cache
} = useClientItems(params);
```

### Stats Shape

```ts
interface ClientItemStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key (items) | `['client', 'items', 'list', params]` |
| Query key (stats) | `['client', 'items', 'stats']` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `retry` | 3 attempts (items), default (stats) |

---

## Implementation Details

- **Dual queries:** Items and stats are fetched with separate `useQuery` calls so that refreshing stats does not re-fetch the paginated list and vice versa.
- **Optimistic cache invalidation:** All three mutations (`update`, `delete`, `restore`) invalidate every query under the `['client', 'items']` prefix on success, keeping both the list and stats in sync.
- **Toast notifications:** Success and error toasts are emitted automatically via `sonner`. Update responses that include a `statusChanged` flag display a special message indicating the item was re-queued for review.
- **Prefetching:** `prefetchNextPage` populates the cache for an upcoming page using the same `staleTime`, enabling instant page transitions.
- **Action return values:** `updateItem`, `deleteItem`, and `restoreItem` all return `Promise<boolean>` -- `true` on success, `false` on error -- making them easy to use in conditional UI flows.

---

## Usage: Basic Item Listing

```tsx
function ClientItemsPage() {
  const { items, isLoading, total, totalPages, page } = useClientItems({
    page: 1,
    limit: 10,
    status: 'approved',
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });

  if (isLoading) return <Skeleton />;

  return (
    <div>
      <p>Showing {items.length} of {total} items</p>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      <Pagination current={page} total={totalPages} />
    </div>
  );
}
```

## Usage: Update and Delete Actions

```tsx
function ItemActions({ itemId }: { itemId: string }) {
  const { updateItem, deleteItem, isUpdating, isDeleting } = useClientItems();

  const handleUpdate = async () => {
    const success = await updateItem(itemId, {
      name: 'Updated Name',
      description: 'Updated description',
    });
    if (success) {
      console.log('Item updated');
    }
  };

  const handleDelete = async () => {
    const success = await deleteItem(itemId);
    if (success) {
      console.log('Item soft-deleted');
    }
  };

  return (
    <div>
      <button onClick={handleUpdate} disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Update'}
      </button>
      <button onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

## Usage: Dashboard Stats

```tsx
function SubmissionStats() {
  const { stats, isStatsLoading } = useClientItems();

  if (isStatsLoading) return <Skeleton />;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Approved" value={stats.approved} />
      <StatCard label="Pending" value={stats.pending} />
      <StatCard label="Rejected" value={stats.rejected} />
      <StatCard label="Total" value={stats.total} />
    </div>
  );
}
```

## Usage: Prefetching Next Page

```tsx
function PaginatedList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPages, prefetchNextPage } = useClientItems({
    page: currentPage,
    limit: 10,
  });

  // Prefetch the next page when the current page renders
  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchNextPage(currentPage + 1);
    }
  }, [currentPage, totalPages, prefetchNextPage]);

  return (
    <div>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      <button onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
    </div>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Query caching, mutations, cache invalidation |
| `sonner` | Toast notifications for mutation feedback |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |
| `@/lib/types/client-item` | Type definitions for request/response shapes |

## Related Hooks

- [`useClientItemDetails`](/template/hooks/use-client-item-details-reference) -- Single item detail fetching (reuses `CLIENT_ITEMS_QUERY_KEYS`)
- [`useClientItemFilters`](/template/hooks/use-client-item-filters-reference) -- Filter/sort/pagination state that produces `ClientItemsListParams`
- [`useDeletedClientItems`](/template/hooks/use-deleted-client-items-reference) -- Manages soft-deleted items (shares the same query key prefix)
- [`useDetailForm`](/template/hooks/use-detail-form-reference) -- Form state for creating or editing item details
