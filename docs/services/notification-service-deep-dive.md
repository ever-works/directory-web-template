---
id: notification-service-deep-dive
title: "Notification Service Deep Dive"
sidebar_label: "Notification Service"
sidebar_position: 46
---

# Notification Service

## Overview

The Notification Service manages the in-app notification system for administrators and users. It provides a static class-based API for creating, reading, and managing notifications across six distinct notification types: item submissions, comment reports, item reports, user registrations, payment failures, and system alerts. The service includes read/unread tracking, batch operations, statistics, and automated cleanup of old notifications.

## Architecture

The Notification Service interacts directly with the database via Drizzle ORM, operating on the `notifications` table. It is implemented as a static class (`NotificationService`) so that methods can be called without instantiation. The service is consumed by admin dashboards, webhook handlers, and moderation workflows.

```
Admin Actions / Webhooks / Moderation
        |
   notification.service.ts  (static class)
        |
   Drizzle ORM
        |
   Database (notifications table)
```

## API Reference

### Types

#### `CreateNotificationData`

Input type for creating a notification.

```typescript
interface CreateNotificationData {
  userId: string;
  type: "item_submission" | "comment_reported" | "item_reported"
      | "user_registered" | "payment_failed" | "system_alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
```

#### `NotificationStats`

Aggregated notification statistics for a user.

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Creation Methods

#### `NotificationService.create(data: CreateNotificationData)`

Base creation method. Inserts a notification record with optional JSON metadata.

**Returns:** `{ success: boolean; notification?: Notification; error?: string }`

---

#### `NotificationService.createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy)`

Creates a notification when a new item is submitted for review.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `adminUserId` | `string` | Admin user to notify |
| `itemId` | `string` | Submitted item ID |
| `itemName` | `string` | Name of the submitted item |
| `submittedBy` | `string` | Name/ID of the submitter |

**Metadata includes:** `itemId`, `itemName`, `submittedBy`, `actionUrl` (`/admin/items/{itemId}`)

---

#### `NotificationService.createCommentReportedNotification(adminUserId, commentId, commentContent, reportedBy)`

Creates a notification when a comment is reported. Comment content is truncated to 100 characters in the metadata.

---

#### `NotificationService.createItemReportedNotification(adminUserId, reportId, itemId, itemName, reportedBy, reason)`

Creates a notification when an item is reported, including the report reason.

**Metadata includes:** `reportId`, `itemId`, `itemName`, `reportedBy`, `reason`, `actionUrl` (`/admin/reports`)

---

#### `NotificationService.createUserRegisteredNotification(adminUserId, userId, userEmail)`

Creates a notification when a new user registers.

---

#### `NotificationService.createPaymentFailedNotification(adminUserId, userId, userEmail, amount, reason)`

Creates a notification when a payment fails, including the amount and failure reason.

---

#### `NotificationService.createSystemAlertNotification(adminUserId, title, message, data?)`

Creates a generic system alert notification with custom title, message, and optional data.

### Read/Management Methods

#### `NotificationService.getNotificationStats(userId: string): Promise<NotificationStats>`

Returns aggregated statistics for a user's notifications: total count, unread count, and count broken down by type.

---

#### `NotificationService.markAsRead(notificationId: string, userId: string)`

Marks a single notification as read. Sets `isRead = true` and records the `readAt` timestamp. Uses a compound WHERE clause to ensure users can only mark their own notifications.

**Returns:** `{ success: boolean; notification?: Notification; error?: string }`

---

#### `NotificationService.markAllAsRead(userId: string)`

Marks all unread notifications for a user as read in a single batch update.

**Returns:** `{ success: boolean; updatedCount?: number; error?: string }`

---

#### `NotificationService.cleanupOldNotifications(daysOld?: number)`

Deletes old read notifications for maintenance. Defaults to removing read notifications older than 90 days.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `daysOld` | `number` | Age threshold in days (default: 90) |

**Returns:** `{ success: boolean; deletedCount?: number; error?: string }`

## Implementation Details

- **Static class pattern:** All methods are `static async`, allowing direct invocation without instantiation (`NotificationService.create(...)` rather than `new NotificationService().create(...)`).
- **JSON metadata serialization:** The optional `data` field is serialized to JSON string via `JSON.stringify` before storage and can contain arbitrary key-value pairs.
- **Action URLs:** Each notification type includes an `actionUrl` in its metadata, providing a direct link to the relevant admin page for quick navigation.
- **Comment truncation:** Comment content in report notifications is truncated to 100 characters (plus ellipsis) to prevent oversized notification messages.
- **Ownership scoping:** The `markAsRead` method uses `AND(eq(id, notificationId), eq(userId, userId))` to prevent cross-user notification manipulation.
- **Batch read operations:** `markAllAsRead` filters on `isRead = false` to only update unread notifications, avoiding unnecessary database writes.

## Database Interactions

| Operation | Method | Table |
|-----------|--------|-------|
| Insert notification | `db.insert(notifications)` | `notifications` |
| Get all for user | `db.select().where(eq(userId))` | `notifications` |
| Mark as read | `db.update().set({ isRead: true })` | `notifications` |
| Mark all as read | `db.update().where(AND(userId, isRead=false))` | `notifications` |
| Delete old | `db.delete().where(AND(isRead=true))` | `notifications` |

**Table columns used:** `id`, `userId`, `type`, `title`, `message`, `data` (JSON), `isRead`, `readAt`, `createdAt`, `updatedAt`

## Error Handling

- Every method wraps its logic in try/catch and returns a structured result object with `success: boolean` and optional `error: string`.
- Errors are logged to console with `"Error [operation]:"` prefix.
- `getNotificationStats` returns a zero-value stats object on error: `{ total: 0, unread: 0, byType: {} }`.
- No method throws exceptions to the caller -- all errors are captured in the return value.

## Usage Examples

```typescript
import { NotificationService } from '@/lib/services/notification.service';

// Create an item submission notification for admins
await NotificationService.createItemSubmissionNotification(
  adminUserId,
  'item-123',
  'New SaaS Tool',
  'john@example.com'
);

// Create a system alert
await NotificationService.createSystemAlertNotification(
  adminUserId,
  'Database Migration Complete',
  'All 500 records migrated successfully.',
  { migratedCount: 500, duration: '2.3s' }
);

// Get notification stats for the dashboard
const stats = await NotificationService.getNotificationStats(adminUserId);
console.log(`${stats.unread} unread of ${stats.total} total`);

// Mark a notification as read
await NotificationService.markAsRead(notificationId, userId);

// Mark all as read
await NotificationService.markAllAsRead(userId);

// Cleanup old notifications (90+ days)
const cleanup = await NotificationService.cleanupOldNotifications(90);
console.log(`Cleaned up ${cleanup.deletedCount} old notifications`);
```

## Configuration

This service has no environment variable dependencies. It relies on the Drizzle ORM database connection being properly configured via `lib/db/drizzle`.

## Related Services

- [Moderation Service](./moderation-service-deep-dive.md) -- Creates notifications for reported content
- [Subscription Service](./subscription-service-deep-dive.md) -- Payment failure notifications
- [Report Service](./report-service.md) -- Report events trigger notifications
- [Email System](./mail-system.md) -- Email notifications complement in-app notifications
