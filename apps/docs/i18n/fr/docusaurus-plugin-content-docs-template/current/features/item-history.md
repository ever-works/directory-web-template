---
id: item-history
title: Historique et audit des éléments
sidebar_label: Historique et audit des éléments
sidebar_position: 17
---

# Historique et audit des éléments

The Ever Works Template includes a comprehensive audit trail system that tracks all changes made to items throughout their lifecycle. Every creation, update, status change, review, deletion, and restoration is logged with detailed change information, performer identity, and timestamps.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Service layer for logging audit actions |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Database queries for audit log CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | React Query hook for fetching audit logs |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Modal UI for viewing item history |

## Audit Actions

The system tracks six types of actions:

| Action | Constant | Description |
|---|---|---|
| Created | `ItemAuditAction.CREATED` | Item was created |
| Updated | `ItemAuditAction.UPDATED` | Item fields were modified |
| Status Changed | `ItemAuditAction.STATUS_CHANGED` | Item status was changed |
| Reviewed | `ItemAuditAction.REVIEWED` | Item was reviewed (approved/rejected) |
| Deleted | `ItemAuditAction.DELETED` | Item was deleted (soft or hard) |
| Restored | `ItemAuditAction.RESTORED` | Item was restored from deletion |

## Tracked Fields

The audit service monitors the following fields for change detection:

| Field | Type |
|---|---|
| `name` | Item name |
| `description` | Item description |
| `source_url` | Source/product URL |
| `category` | Category assignment |
| `tags` | Tag array |
| `collections` | Collection assignments |
| `featured` | Featured status |
| `icon_url` | Icon/logo URL |
| `status` | Item status |

## Item Audit Service

The `itemAuditService` provides high-level logging methods that are called from API routes and services.

### Logging Item Creation

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Logging Item Updates

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Logging Reviews

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Logging Deletion and Restoration

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Non-Blocking Design

All audit logging is wrapped in try-catch blocks and will not throw errors that could block the primary operation:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Change Detection

The `detectChanges` function compares two item states and returns a detailed diff:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Example output:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

The function handles deep equality for arrays (sorted comparison) and returns `null` if no changes are detected.

## Database Layer

### Audit Log Schema

Each audit log entry contains:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique ID |
| `itemId` | `string` | Item slug/ID |
| `itemName` | `string` | Item name at time of action |
| `action` | `ItemAuditActionValues` | Action type |
| `previousStatus` | `string \| null` | Status before action |
| `newStatus` | `string \| null` | Status after action |
| `changes` | `JSON \| null` | Field-level change details |
| `performedBy` | `string \| null` | User ID who performed the action |
| `performedByName` | `string \| null` | User display name |
| `notes` | `string \| null` | Additional notes (e.g., review comments) |
| `metadata` | `JSON \| null` | Extra context data |
| `createdAt` | `timestamp` | When the action occurred |

### Query Functions

| Function | Description |
|---|---|
| `createItemAuditLog(data)` | Create a new audit log entry |
| `getItemHistory(params)` | Get paginated history with performer info |
| `getLatestItemAuditLog(itemId)` | Get most recent log entry |
| `getAuditLogsByAction(action, limit)` | Filter logs by action type |
| `getAuditLogsByPerformer(userId, limit)` | Filter logs by performer |
| `getItemAuditStats(itemId)` | Get count breakdown by action type |

### Paginated History Query

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

The query joins with the `users` table to include performer email alongside each log entry.

## The `useItemHistory` Hook

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Hook Configuration

| Option | Default | Description |
|---|---|---|
| `itemId` | required | Item ID/slug to fetch history for |
| `page` | `1` | Page number |
| `limit` | `20` | Items per page |
| `actionFilter` | `undefined` | Array of action types to filter by |
| `enabled` | `true` | Whether the query is active |
| `staleTime` | 30 seconds | Cache freshness duration |

## Item History Modal

The `ItemHistoryModal` component provides a complete UI for viewing item audit history:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Modal Features

| Feature | Description |
|---|---|
| Action filtering | Dropdown to filter by action type (Created, Updated, etc.) |
| Color-coded entries | Each action type has a distinct icon and color scheme |
| Expandable changes | Click to expand field-level change details |
| Relative timestamps | "2h ago", "3d ago" with full date on hover |
| Performer display | Shows user name, email, or "System" for automated actions |
| Review context | Shows "Approved"/"Rejected" labels and rejection reasons |
| Pagination | Built-in pagination for long histories |
| Keyboard support | Escape key closes the modal |

### Action Color Scheme

| Action | Color | Icon |
|---|---|---|
| Created | Green | Plus |
| Updated | Blue | Edit2 |
| Status Changed | Yellow | RefreshCw |
| Reviewed | Purple | CheckCircle |
| Deleted | Red | Trash2 |
| Restored | Teal | RotateCcw |

## Key Files

| File | Path |
|---|---|
| Audit Service | `lib/services/item-audit.service.ts` |
| Audit Queries | `lib/db/queries/item-audit.queries.ts` |
| History Hook | `hooks/use-item-history.ts` |
| History Modal | `components/admin/items/item-history-modal.tsx` |