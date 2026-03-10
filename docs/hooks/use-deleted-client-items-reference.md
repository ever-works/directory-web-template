---
id: use-deleted-client-items-reference
title: useDeletedClientItems Hook Reference
sidebar_label: useDeletedClientItems
sidebar_position: 78
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useDeletedClientItems

Fetches and manages soft-deleted (trashed) client items with pagination and restore functionality. Tracks which item is currently being restored for per-row loading indicators. Shares query key infrastructure with `useClientItems` for consistent cache invalidation.

**Source:** `template/hooks/use-deleted-client-items.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useDeletedClientItems` | Fetch deleted items and restore them |

## Exported Types

```ts
export interface DeletedClientItemsResponse {
  items: ClientSubmissionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  error?: string;
}

export interface UseDeletedClientItemsParams {
  page?: number;
  limit?: number;
}
```

---

## Signature

```ts
function useDeletedClientItems(
  params?: UseDeletedClientItemsParams,
): UseDeletedClientItemsReturn;
```

### Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number (1-based) |
| `limit` | `number` | `10` | Items per page |

---

## Return Values

```ts
const {
  // Data
  items,            // ClientSubmissionData[] -- Current page of deleted items
  total,            // number -- Total deleted item count
  page,             // number -- Current page number
  limit,            // number -- Items per page
  totalPages,       // number -- Total number of pages

  // Loading states
  isLoading,        // boolean -- True on initial fetch with no cached data
  isFetching,       // boolean -- True during any fetch (including background)
  restoringItemId,  // string | null -- ID of the item currently being restored

  // Error
  error,            // Error | null -- Fetch error if any

  // Actions
  restoreItem,      // (id: string) => Promise<boolean>

  // Utility
  refetch,          // () => void -- Re-execute the deleted items query
  refreshData,      // () => void -- Invalidate all deleted item queries
} = useDeletedClientItems(params);
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['client', 'items', 'deleted', 'list', { page, limit }]` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `retry` | 3 attempts |

---

## Implementation Details

- **Shared query key prefix:** The deleted items query keys extend `CLIENT_ITEMS_QUERY_KEYS.clientItems` (`['client', 'items']`), so when `useClientItems` mutations invalidate the `['client', 'items']` prefix, the deleted items list is also refreshed. Conversely, the restore mutation here invalidates both the deleted items keys and the main client items keys.
- **Deleted flag:** The fetch function adds `deleted=true` to the API query parameters, reusing the same `/api/client/items` endpoint with a flag to retrieve only soft-deleted items.
- **Per-item restore tracking:** The `restoringItemId` state tracks which specific item is being restored, enabling per-row loading spinners in the UI. The ID is set before the mutation starts and cleared in the `finally` block.
- **Dual invalidation on restore:** The restore mutation invalidates both `DELETED_QUERY_KEYS.deletedItems` and `CLIENT_ITEMS_QUERY_KEYS.clientItems` with `refetchType: 'active'`, ensuring that active queries for both the trash view and the main items list are refreshed.
- **Boolean return:** `restoreItem` returns `Promise<boolean>` -- `true` on success, `false` on error.
- **Toast feedback:** Success and error toasts are displayed automatically via `sonner`.

---

## Usage: Trash View Page

```tsx
function TrashPage() {
  const [page, setPage] = useState(1);

  const {
    items,
    total,
    totalPages,
    isLoading,
    restoringItemId,
    restoreItem,
  } = useDeletedClientItems({ page, limit: 10 });

  if (isLoading) return <Skeleton />;

  if (items.length === 0) {
    return <EmptyState message="No deleted items" />;
  }

  return (
    <div>
      <h2>Trash ({total} items)</h2>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 border-b">
          <div>
            <h3>{item.name}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <button
            onClick={() => restoreItem(item.id)}
            disabled={restoringItemId === item.id}
          >
            {restoringItemId === item.id ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      ))}

      <Pagination
        current={page}
        total={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
```

## Usage: Trash Count Badge

```tsx
function TrashBadge() {
  const { total, isLoading } = useDeletedClientItems({ limit: 1 });

  if (isLoading || total === 0) return null;

  return (
    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
      {total}
    </span>
  );
}
```

## Usage: Restore with Confirmation

```tsx
function RestoreButton({ item }: { item: ClientSubmissionData }) {
  const { restoreItem, restoringItemId } = useDeletedClientItems();
  const isRestoring = restoringItemId === item.id;

  const handleRestore = async () => {
    if (window.confirm(`Restore "${item.name}"?`)) {
      const success = await restoreItem(item.id);
      if (success) {
        console.log('Item restored successfully');
      }
    }
  };

  return (
    <button onClick={handleRestore} disabled={isRestoring}>
      {isRestoring ? (
        <><Spinner size="sm" /> Restoring...</>
      ) : (
        'Restore Item'
      )}
    </button>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `react` | `useState`, `useCallback` for state management |
| `@tanstack/react-query` | `useQuery`, `useMutation`, `useQueryClient` for caching and mutations |
| `sonner` | Toast notifications for mutation feedback |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |
| `@/lib/types/client-item` | `ClientSubmissionData`, `ClientRestoreItemResponse` types |
| `./use-client-items` | `CLIENT_ITEMS_QUERY_KEYS` for shared cache key structure |

## Related Hooks

- [`useClientItems`](/template/hooks/use-client-items-reference) -- Main items listing (shares query key prefix, also has `restoreItem`)
- [`useClientItemDetails`](/template/hooks/use-client-item-details-reference) -- Detail view with restore capability
- [`useClientItemFilters`](/template/hooks/use-client-item-filters-reference) -- Filter state for the main items list
