---
id: use-client-item-details-reference
title: useClientItemDetails Hook Reference
sidebar_label: useClientItemDetails
sidebar_position: 71
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useClientItemDetails

Fetches a single client item by ID and provides mutation methods for updating, soft-deleting, and restoring that item. Designed for detail pages and edit forms where you operate on one item at a time.

**Source:** `template/hooks/use-client-item-details.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useClientItemDetails` | Fetch, update, delete, and restore a single client item |

## Exported Types

```ts
export interface UseClientItemDetailsOptions {
  enabled?: boolean;
  onUpdateSuccess?: (result: ClientUpdateItemResponse) => void;
  onDeleteSuccess?: () => void;
  onRestoreSuccess?: (result: ClientRestoreItemResponse) => void;
}
```

---

## Signature

```ts
function useClientItemDetails(
  id: string | null | undefined,
  options?: UseClientItemDetailsOptions,
): UseClientItemDetailsReturn;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string \| null \| undefined` | — | The item ID to fetch. Query is disabled when `null`/`undefined`. |
| `options` | `UseClientItemDetailsOptions` | `{}` | Optional callbacks and control flags |

#### Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Disable the query entirely when `false` |
| `onUpdateSuccess` | `(result: ClientUpdateItemResponse) => void` | — | Callback after a successful update mutation |
| `onDeleteSuccess` | `() => void` | — | Callback after a successful delete mutation |
| `onRestoreSuccess` | `(result: ClientRestoreItemResponse) => void` | — | Callback after a successful restore mutation |

---

## Return Values

```ts
const {
  // Data
  item,               // ClientSubmissionData | null -- The fetched item
  engagement,         // { views: number; likes: number } -- Engagement metrics

  // Loading states
  isLoading,          // boolean -- True on initial fetch with no cache
  isFetching,         // boolean -- True during any fetch (including background)
  isUpdating,         // boolean -- True while the update mutation runs
  isDeleting,         // boolean -- True while the delete mutation runs
  isRestoring,        // boolean -- True while the restore mutation runs
  isSubmitting,       // boolean -- True if any mutation is in-flight

  // Error
  error,              // Error | null -- Fetch error
  notFound,           // boolean -- True if the error message contains 'not found'

  // Actions
  updateItem,         // (data: ClientUpdateItemRequest) => Promise<boolean>
  deleteItem,         // () => Promise<boolean>
  restoreItem,        // () => Promise<boolean>

  // Utility
  refetch,            // () => void -- Re-execute the detail query
} = useClientItemDetails(id, options);
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['client', 'items', 'detail', id]` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `retry` | 2 attempts |
| `enabled` | `options.enabled && !!id` |

---

## Implementation Details

- **Shared query keys:** Uses `CLIENT_ITEMS_QUERY_KEYS` from `use-client-items.ts`, so any mutation that invalidates the `['client', 'items']` prefix also refreshes this detail query.
- **Engagement data:** The API response includes an `engagement` object (`{ views, likes }`) which is extracted separately from the item data, defaulting to `{ views: 0, likes: 0 }`.
- **Not-found detection:** The `notFound` return flag checks whether the error message includes the string `'not found'`, enabling 404 UI without inspecting the error object manually.
- **Status change toast:** When an update causes the item status to change (e.g., from approved back to pending), a special toast message is displayed to inform the user of the re-review requirement.
- **Callback hooks:** The `onUpdateSuccess`, `onDeleteSuccess`, and `onRestoreSuccess` callbacks fire after successful mutations and cache invalidation, allowing parent components to trigger navigation or other side effects.
- **Null-safe actions:** `updateItem`, `deleteItem`, and `restoreItem` all return `false` immediately if `id` is `null` or `undefined`.

---

## Usage: Item Detail Page

```tsx
function ItemDetailPage({ itemId }: { itemId: string }) {
  const {
    item,
    engagement,
    isLoading,
    notFound,
    error,
  } = useClientItemDetails(itemId);

  if (isLoading) return <Skeleton />;
  if (notFound) return <NotFoundMessage />;
  if (error) return <ErrorBanner message={error.message} />;
  if (!item) return null;

  return (
    <div>
      <h1>{item.name}</h1>
      <p>{item.description}</p>
      <div className="flex gap-4">
        <span>Views: {engagement.views}</span>
        <span>Likes: {engagement.likes}</span>
      </div>
    </div>
  );
}
```

## Usage: Edit Form with Success Callback

```tsx
function ItemEditForm({ itemId }: { itemId: string }) {
  const router = useRouter();

  const {
    item,
    updateItem,
    isUpdating,
    isLoading,
  } = useClientItemDetails(itemId, {
    onUpdateSuccess: (result) => {
      if (result.statusChanged) {
        // Redirect to pending review page
        router.push('/client/items?status=pending');
      }
    },
  });

  if (isLoading || !item) return <Skeleton />;

  const handleSave = async (formData: ClientUpdateItemRequest) => {
    const success = await updateItem(formData);
    if (success) {
      router.push(`/client/items/${itemId}`);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave({ name: 'New Name' }); }}>
      <input defaultValue={item.name} name="name" />
      <button type="submit" disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

## Usage: Delete with Confirmation

```tsx
function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();

  const { deleteItem, isDeleting } = useClientItemDetails(itemId, {
    onDeleteSuccess: () => {
      router.push('/client/items');
    },
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem();
    }
  };

  return (
    <button onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete Item'}
    </button>
  );
}
```

## Usage: Conditional Fetching

```tsx
function ConditionalDetail({ itemId }: { itemId: string | null }) {
  const { item, isLoading } = useClientItemDetails(itemId, {
    enabled: !!itemId, // Only fetch when an ID is selected
  });

  if (!itemId) return <p>Select an item to view details</p>;
  if (isLoading) return <Skeleton />;

  return <ItemPreview item={item} />;
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
| `./use-client-items` | `CLIENT_ITEMS_QUERY_KEYS` for shared cache key structure |

## Related Hooks

- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- List-level fetching and mutations (shares the same query key prefix)
- [`useClientItemFilters`](/docs/template/hooks/use-client-item-filters-reference) -- Filter state management for the items list
- [`useDetailForm`](/docs/template/hooks/use-detail-form-reference) -- Multi-step form state for editing item details
- [`useDeletedClientItems`](/docs/template/hooks/use-deleted-client-items-reference) -- Manages soft-deleted items with restore capability
