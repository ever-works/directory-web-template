---
id: audit-service
title: "Item Audit Service"
sidebar_label: "Item Audit"
sidebar_position: 26
---

# Item Audit Service

The Item Audit Service provides comprehensive change tracking and audit trail capabilities for items in the template. Every creation, update, review, deletion, and restoration is logged with full context -- who made the change, what changed, and when it happened.

**Source:** `lib/services/item-audit.service.ts`

## Overview

The audit service is designed to be **non-blocking** -- audit logging failures are caught and logged to the console but never throw exceptions that would interrupt the primary operation. This ensures that item CRUD operations remain reliable even if audit storage encounters issues.

Key capabilities:

- **Change detection** -- field-level diffing between item states
- **Action logging** -- creation, update, review, deletion, restoration
- **Status tracking** -- separate logging when item status changes
- **Paginated history** -- query audit logs per item with pagination
- **User attribution** -- every action records who performed it

## Types and Interfaces

### AuditUser

Identifies the user who performed an auditable action:

```ts
interface AuditUser {
  id: string;
  name?: string | null;
}
```

### LogActionParams

Parameters accepted by the internal `logAction` function:

```ts
interface LogActionParams {
  itemId: string;
  itemName: string;
  action: ItemAuditActionValues;
  previousStatus?: string | null;
  newStatus?: string | null;
  changes?: ItemAuditChanges | null;
  performedBy?: AuditUser | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

## Tracked Fields

The service monitors the following fields for change detection:

| Field           | Description                        |
|-----------------|------------------------------------|
| `name`          | Item display name                  |
| `description`   | Item description text              |
| `source_url`    | External URL reference             |
| `category`      | Category assignment                |
| `tags`          | Tag list (array comparison)        |
| `collections`   | Collection memberships             |
| `featured`      | Featured flag                      |
| `icon_url`      | Icon image URL                     |
| `status`        | Item publication status            |

These are defined in the `TRACKED_FIELDS` constant:

```ts
const TRACKED_FIELDS = [
  'name',
  'description',
  'source_url',
  'category',
  'tags',
  'collections',
  'featured',
  'icon_url',
  'status'
] as const;
```

## Change Detection

The `detectChanges` function compares two item states and returns an object describing what changed at the field level. It handles both primitive values and arrays (sorted before comparison):

```ts
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, currentItem);

// Returns null if no changes detected
// Otherwise returns an object like:
// {
//   name: { old: 'Old Name', new: 'New Name' },
//   tags: { old: ['tag1'], new: ['tag1', 'tag2'] }
// }
```

The internal `isEqual` function performs deep equality checks:
- Primitive values use strict equality (`===`)
- Arrays are sorted before element-wise comparison
- `null` and `undefined` are handled gracefully

## Logging Actions

### Log Item Creation

Records when a new item is created, capturing its initial state:

```ts
import { itemAuditService } from '@/lib/services/item-audit.service';

await itemAuditService.logCreation(item, {
  id: session.user.id,
  name: session.user.name
});
```

The creation log includes metadata such as the item slug, category, and initial tags.

### Log Item Update

Automatically detects changes between the previous and current item states. If the status changed, the action is logged as `STATUS_CHANGED` instead of `UPDATED`:

```ts
await itemAuditService.logUpdate(previousItem, updatedItem, {
  id: session.user.id,
  name: session.user.name
});
```

If no actual changes are detected (all tracked fields are identical), the update is **not logged** -- preventing noise in the audit trail.

### Log Item Review

Records approval or rejection decisions with optional review notes:

```ts
await itemAuditService.logReview(
  item,
  'pending',          // previousStatus
  'Approved - good quality content',  // review notes
  { id: adminUser.id, name: adminUser.name }
);
```

### Log Item Deletion

Supports both soft and hard deletes via the `isSoftDelete` parameter:

```ts
// Soft delete (default)
await itemAuditService.logDeletion(item, performedBy);

// Hard delete
await itemAuditService.logDeletion(item, performedBy, false);
```

Deletion metadata includes the item slug and whether it was a soft delete.

### Log Item Restoration

Records when a soft-deleted item is restored:

```ts
await itemAuditService.logRestoration(item, performedBy);
```

## Querying Audit History

Retrieve paginated audit logs for a specific item:

```ts
const history = await itemAuditService.getHistory({
  itemId: 'item-uuid-here',
  page: 1,
  limit: 20
});

// history: PaginatedItemHistory
// {
//   data: ItemAuditLog[],
//   total: number,
//   page: number,
//   limit: number,
//   totalPages: number
// }
```

This delegates to the `getItemHistory` database query, which supports pagination parameters.

## Service API Reference

The `itemAuditService` singleton exports these methods:

| Method           | Description                                    |
|------------------|------------------------------------------------|
| `logCreation`    | Log item creation with initial metadata        |
| `logUpdate`      | Log item update with field-level change diff   |
| `logReview`      | Log item review with notes                     |
| `logDeletion`    | Log item deletion (soft or hard)               |
| `logRestoration` | Log item restoration from soft delete          |
| `getHistory`     | Get paginated audit history for an item        |
| `detectChanges`  | Compare two item states and return differences |

## Audit Action Types

The service uses the `ItemAuditAction` enum from the database schema:

| Action           | When Used                             |
|------------------|---------------------------------------|
| `CREATED`        | New item is created                   |
| `UPDATED`        | Item fields are modified              |
| `STATUS_CHANGED` | Item status specifically changes      |
| `REVIEWED`       | Admin approves or rejects an item     |
| `DELETED`        | Item is deleted (soft or hard)        |
| `RESTORED`       | Soft-deleted item is restored         |

## Error Handling

All audit logging is wrapped in try-catch blocks. Failures are logged to the console with the `[ItemAuditService]` prefix but never propagate exceptions:

```ts
// Internal error handling pattern
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

This design ensures that audit logging is a **best-effort** operation that never disrupts the user's workflow.

## Database Dependencies

The audit service depends on these database query functions:

- `createItemAuditLog` -- inserts a new audit log entry
- `getItemHistory` -- retrieves paginated audit logs for an item

Both are imported from `@/lib/db/queries/item-audit.queries`.

## Integration Example

A typical integration in an API route handler:

```ts
import { itemAuditService } from '@/lib/services/item-audit.service';

// In an update API handler
export async function PUT(request: Request) {
  const session = await getSession();
  const previousItem = await getItemById(itemId);
  const updatedItem = await updateItem(itemId, updateData);

  // Non-blocking audit log
  await itemAuditService.logUpdate(previousItem, updatedItem, {
    id: session.user.id,
    name: session.user.name,
  });

  return Response.json(updatedItem);
}
```
