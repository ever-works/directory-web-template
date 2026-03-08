---
id: use-item-history-reference
title: useItemHistory Hook Reference
sidebar_label: useItemHistory
sidebar_position: 73
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useItemHistory

Fetches paginated audit history for a specific item from the admin API. Each log entry records an action (create, update, status change, etc.), who performed it, and what changed. Supports filtering by action type and uses `keepPreviousData` for smooth pagination transitions.

**Source:** `template/hooks/use-item-history.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useItemHistory` | Fetch paginated audit log entries for a single item |

## Exported Types

```ts
export interface ItemAuditLogEntry {
  id: string;
  itemId: string;
  itemName: string;
  action: ItemAuditActionValues;
  previousStatus: string | null;
  newStatus: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  performedBy: string | null;
  performedByName: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  performer: {
    id: string;
    email: string | null;
  } | null;
}

export interface ItemHistoryResponse {
  success: boolean;
  data: {
    logs: ItemAuditLogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

export interface UseItemHistoryParams {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
  enabled?: boolean;
}
```

## Exported Constants

```ts
export const ITEM_HISTORY_QUERY_KEYS = {
  all: ['admin', 'items', 'history'] as const,
  item: (itemId: string) =>
    [...ITEM_HISTORY_QUERY_KEYS.all, itemId] as const,
  itemWithParams: (itemId: string, params: { page?: number; actionFilter?: ItemAuditActionValues[] }) =>
    [...ITEM_HISTORY_QUERY_KEYS.item(itemId), params] as const,
} as const;
```

---

## Signature

```ts
function useItemHistory(params: UseItemHistoryParams): UseQueryResult<ItemHistoryResponse['data']>;
```

### Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `itemId` | `string` | — | **Required.** The item ID whose history to fetch. |
| `page` | `number` | `1` | Page number (1-based) |
| `limit` | `number` | `20` | Number of log entries per page |
| `actionFilter` | `ItemAuditActionValues[]` | — | Optional array of action types to filter by |
| `enabled` | `boolean` | `true` | Disable the query when `false` |

---

## Return Values

This hook returns a standard `@tanstack/react-query` `UseQueryResult` object. The `data` field contains:

```ts
{
  logs: ItemAuditLogEntry[];  // Array of audit log entries
  total: number;              // Total number of matching entries
  page: number;               // Current page
  limit: number;              // Entries per page
  totalPages: number;         // Total number of pages
}
```

Common fields from the query result:

```ts
const {
  data,               // ItemHistoryResponse['data'] | undefined
  isLoading,          // boolean -- True on initial fetch
  isFetching,         // boolean -- True during any fetch
  isError,            // boolean -- True if fetch failed
  error,              // Error | null
  isPlaceholderData,  // boolean -- True when showing previous page data
  refetch,            // () => void -- Re-execute the query
} = useItemHistory(params);
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['admin', 'items', 'history', itemId, { page, actionFilter }]` |
| `staleTime` | 30 seconds |
| `placeholderData` | `keepPreviousData` (shows old page while fetching new) |
| `enabled` | `params.enabled && !!params.itemId` |

---

## Implementation Details

- **Admin API:** Fetches from `/api/admin/items/:itemId/history`, encoding the item ID for URL safety.
- **Action filtering:** When `actionFilter` is provided and non-empty, the filter values are joined with commas and sent as the `action` query parameter.
- **keepPreviousData:** The `placeholderData: keepPreviousData` option ensures that when paginating, the previous page's data remains visible until the new page loads, preventing layout flash.
- **Short stale time:** Uses 30-second `staleTime` (vs. the typical 5 minutes for item data) because audit logs can change frequently as admins take actions.
- **Changes tracking:** Each `ItemAuditLogEntry` includes a `changes` field that maps field names to `{ old, new }` pairs, enabling detailed diff display.

---

## Usage: Basic Audit History

```tsx
function ItemHistory({ itemId }: { itemId: string }) {
  const { data, isLoading } = useItemHistory({ itemId });

  if (isLoading) return <Skeleton />;

  return (
    <div>
      <h3>Audit History ({data?.total} entries)</h3>
      {data?.logs.map((entry) => (
        <div key={entry.id} className="border-b py-2">
          <span className="font-medium">{entry.action}</span>
          <span className="text-muted-foreground ml-2">
            by {entry.performedByName || 'System'}
          </span>
          <span className="text-sm ml-2">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
          {entry.previousStatus && entry.newStatus && (
            <span className="ml-2">
              {entry.previousStatus} &rarr; {entry.newStatus}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Usage: Paginated with Action Filter

```tsx
function FilteredHistory({ itemId }: { itemId: string }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ItemAuditActionValues[]>([]);

  const { data, isLoading, isPlaceholderData } = useItemHistory({
    itemId,
    page,
    limit: 10,
    actionFilter: filter.length > 0 ? filter : undefined,
  });

  return (
    <div>
      <select
        multiple
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, (o) => o.value);
          setFilter(values as ItemAuditActionValues[]);
          setPage(1);
        }}
      >
        <option value="created">Created</option>
        <option value="updated">Updated</option>
        <option value="status_changed">Status Changed</option>
        <option value="deleted">Deleted</option>
      </select>

      <div style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data?.logs.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Previous
        </button>
        <span>Page {page} of {data?.totalPages || 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= (data?.totalPages || 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Usage: Display Field Changes

```tsx
function ChangesDiff({ changes }: { changes: Record<string, { old: unknown; new: unknown }> | null }) {
  if (!changes) return null;

  return (
    <div className="bg-muted p-2 rounded text-sm">
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field}>
          <span className="font-medium">{field}:</span>{' '}
          <span className="line-through text-red-500">{String(oldVal)}</span>{' '}
          <span className="text-green-500">{String(newVal)}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery`, `keepPreviousData` for paginated caching |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |
| `@/lib/db/schema` | `ItemAuditActionValues` type for action enum |

## Related Hooks

- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Client-side item listing
- [`useClientItemDetails`](/docs/template/hooks/use-client-item-details-reference) -- Single item details (item being audited)
- [`useItemCompany`](/docs/template/hooks/use-item-company-reference) -- Company associations may appear in audit history
