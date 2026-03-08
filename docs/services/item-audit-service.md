---
id: item-audit-service
title: "Item Audit Service Deep Dive"
sidebar_label: "Item Audit Service"
sidebar_position: 44
---

# Item Audit Service

## Overview

The Item Audit Service provides comprehensive audit trail functionality for item lifecycle events. It tracks creation, updates, reviews, deletions, and restorations with field-level change detection. The service is designed to be non-blocking -- audit logging failures never prevent the primary operation from succeeding. It supports both individual function exports and a unified service object for flexible consumption.

## Architecture

The Item Audit Service sits as a cross-cutting concern that is called after item operations complete. It delegates database writes to the item audit queries module and operates independently from the primary item CRUD pipeline. The service is intentionally fire-and-forget for most operations.

```
Item CRUD Operations
        |
   item-audit.service.ts   (change detection + logging)
        |
   item-audit.queries.ts   (persistence)
        |
   Database (item_audit_logs table)
```

## API Reference

### Types

#### `AuditUser`

Represents the user who performed an audited action.

```typescript
interface AuditUser {
  id: string;
  name?: string | null;
}
```

#### `LogActionParams`

Parameters for the base `logAction` function.

```typescript
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

### Functions

#### `detectChanges(previous: Partial<ItemData>, current: Partial<ItemData>): ItemAuditChanges | null`

Compares two item states and returns an object describing field-level changes. Returns `null` if no changes are detected.

**Tracked fields:** `name`, `description`, `source_url`, `category`, `tags`, `collections`, `featured`, `icon_url`, `status`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `previous` | `Partial<ItemData>` | Item state before the change |
| `current` | `Partial<ItemData>` | Item state after the change |

**Returns:** `ItemAuditChanges | null` -- An object with `{ [field]: { old: value, new: value } }` for each changed field, or `null` if no differences exist.

---

#### `logCreation(item: ItemData, performedBy?: AuditUser | null): Promise<void>`

Logs the creation of a new item. Records the item slug, category, and tags as metadata.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `ItemData` | The created item |
| `performedBy` | `AuditUser \| null` | The user who created the item |

---

#### `logUpdate(previousItem: ItemData, updatedItem: ItemData, performedBy?: AuditUser | null): Promise<void>`

Logs an item update with field-level change detection. Only creates a log entry if actual changes are detected. Automatically differentiates between general updates and status changes.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `previousItem` | `ItemData` | Item state before update |
| `updatedItem` | `ItemData` | Item state after update |
| `performedBy` | `AuditUser \| null` | The user who performed the update |

**Behavior:** If the status field changed, the action is logged as `STATUS_CHANGED` instead of `UPDATED`.

---

#### `logReview(item: ItemData, previousStatus: string, notes: string | undefined | null, performedBy?: AuditUser | null): Promise<void>`

Logs an item review action (approve/reject) with the reviewer's notes.

---

#### `logDeletion(item: ItemData, performedBy?: AuditUser | null, isSoftDelete?: boolean): Promise<void>`

Logs item deletion. Tracks whether the deletion was soft or hard via metadata.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `ItemData` | The deleted item |
| `performedBy` | `AuditUser \| null` | The user who deleted the item |
| `isSoftDelete` | `boolean` | Whether this is a soft delete (default: `true`) |

---

#### `logRestoration(item: ItemData, performedBy?: AuditUser | null): Promise<void>`

Logs item restoration from a soft-deleted state.

---

#### `getHistory(params: GetItemHistoryParams): Promise<PaginatedItemHistory>`

Retrieves paginated audit history for an item.

### Service Object

The module also exports a unified `itemAuditService` object with all functions:

```typescript
export const itemAuditService = {
  logCreation,
  logUpdate,
  logReview,
  logDeletion,
  logRestoration,
  getHistory,
  detectChanges,
};
```

## Implementation Details

- **Non-blocking logging:** The base `logAction` function wraps all database operations in a try/catch. Errors are logged to console but never thrown, ensuring that audit failures never block the primary item operation.
- **Smart change detection:** The `detectChanges` function performs deep equality checks including array comparison (sorted before comparison to handle reordered arrays). Only actually changed fields are recorded.
- **Status change differentiation:** When an update includes a status change, the audit action is automatically set to `STATUS_CHANGED` rather than `UPDATED`, making it easy to filter status transitions in the audit log.
- **Tracked fields are explicit:** Only a predefined set of fields is tracked for changes (defined in the `TRACKED_FIELDS` constant). This prevents logging noise from internal/computed fields.
- **No-op for unchanged items:** `logUpdate` returns early without creating a log entry if `detectChanges` returns `null`.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Create audit log | `createItemAuditLog(params)` | `item_audit_logs` |
| Get item history | `getItemHistory(params)` | `item_audit_logs` |

**Audit log record fields:**
- `itemId`, `itemName` -- identifies the item
- `action` -- enum value from `ItemAuditAction` (CREATED, UPDATED, STATUS_CHANGED, REVIEWED, DELETED, RESTORED)
- `previousStatus`, `newStatus` -- status transition tracking
- `changes` -- JSON object with field-level diffs
- `performedBy`, `performedByName` -- who did it
- `notes` -- optional reviewer notes
- `metadata` -- additional context (slug, category, tags, etc.)

## Error Handling

- All logging functions are wrapped in try/catch with `console.error` output prefixed with `[ItemAuditService]`.
- Audit logging is explicitly designed to be non-critical -- failures are swallowed to prevent blocking business operations.
- The `isEqual` helper handles `null`/`undefined` comparison gracefully.

## Usage Examples

```typescript
import { itemAuditService, detectChanges } from '@/lib/services/item-audit.service';

// Log item creation
await itemAuditService.logCreation(newItem, { id: userId, name: userName });

// Log an update with automatic change detection
await itemAuditService.logUpdate(previousItem, updatedItem, {
  id: adminId,
  name: 'Admin User',
});

// Log a review decision
await itemAuditService.logReview(
  reviewedItem,
  'pending',      // previous status
  'Approved - meets quality standards',
  { id: reviewerId, name: 'Reviewer' }
);

// Log deletion
await itemAuditService.logDeletion(item, { id: adminId }, true); // soft delete

// Get audit history
const history = await itemAuditService.getHistory({
  itemId: 'item-123',
  page: 1,
  limit: 20,
});

// Detect changes manually
const changes = detectChanges(oldItem, newItem);
if (changes) {
  console.log('Changed fields:', Object.keys(changes));
}
```

## Configuration

This service has no environment variable dependencies. Audit actions are defined by the `ItemAuditAction` enum from the database schema.

## Related Services

- [Item Service](./item-service.md) -- Primary item CRUD that triggers audit logging
- [Moderation Service](./moderation-service-deep-dive.md) -- Moderation actions that may trigger item status changes
- [Activity Service](./activity-service.md) -- Higher-level activity tracking
