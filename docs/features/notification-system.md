---
id: notification-system
title: "Notification System Deep Dive"
sidebar_label: "Notification System"
sidebar_position: 34
---

# Notification System Deep Dive

The template provides an in-app notification system backed by PostgreSQL. Notifications are created by server-side services and consumed through a REST API, primarily by the admin dashboard. The system supports multiple notification types, batch operations, and extensible type definitions.

## Architecture Overview

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## Database Schema

Notifications are stored in the `notifications` table:

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### Schema Design

- **`type` column** -- freeform string categorizing the notification. Not enforced by an enum, allowing new types without migrations.
- **`data` column** -- stores additional context as a JSON string. Parsed on read to access item IDs, comment content, or event-specific information.
- **`isRead` / `readAt`** -- boolean flag for quick unread counts plus a timestamp for auditing.
- **Four indexes** -- cover user lookup, type filtering, unread filtering, and chronological listing.

## Notification Types

The system uses string-based type identifiers. Built-in types include:

| Type | Trigger | Typical Recipient |
|------|---------|-------------------|
| `item_approved` | Admin approves a submitted item | Item submitter |
| `item_rejected` | Admin rejects a submitted item | Item submitter |
| `comment_received` | Someone comments on a user's item | Item owner |
| `comment_reported` | A comment is flagged for review | Admin |
| `item_reported` | An item is flagged for review | Admin |
| `user_registered` | A new user signs up | Admin |
| `payment_failed` | A payment attempt fails | Affected user |
| `system_alert` | System-level warning or notice | Admin |

### Adding Custom Types

1. Choose a descriptive type string (e.g. `survey_response_received`).
2. Add a convenience method to `NotificationService` that builds the correct payload.
3. Call the method from the relevant API route or service.
4. Optionally update the admin notification dropdown to render a custom icon.

No database migration is required since `type` is a freeform text column.

## NotificationService

Located at `lib/services/notification.service.ts`, the service provides convenience methods for creating notifications from server-side code:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

Each convenience method constructs the correct `type`, `title`, `message`, and `data` payload before delegating to the generic `create` method.

### Usage

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## API Endpoints

All notification endpoints require admin authentication.

### GET /api/admin/notifications

Retrieves the 50 most recent notifications for the authenticated admin, sorted newest-first. Returns notifications and unread count in a single response.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

The unread count uses a separate `SELECT count(*)` with `isRead = false` for efficiency.

### POST /api/admin/notifications

Creates a new notification for a specific user.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Notification category identifier |
| `title` | Yes | Short heading text |
| `message` | Yes | Body text |
| `userId` | Yes | Recipient user ID |
| `data` | No | Extra payload (auto-stringified) |

### POST /api/admin/notifications/mark-all-read

Marks all unread notifications for the current admin as read. Sets `isRead = true` and `readAt` to the current timestamp in a single batch update.

### PATCH /api/admin/notifications/[id]/read

Marks a single notification as read by ID.

## Admin Dashboard Integration

The admin header displays a bell icon with an unread count badge. The dropdown component:

1. Fetches notifications from the GET endpoint.
2. Renders each notification with type-specific icons and color coding.
3. Marks individual notifications as read on click.
4. Provides a "Mark All as Read" bulk action.
5. Polls on a timer or refreshes on admin navigation.

## Real-Time Considerations

The current implementation uses polling-based refresh. For real-time updates, the architecture supports extension points:

- **Server-Sent Events** -- add an SSE endpoint that streams new notifications.
- **WebSocket** -- integrate with a WebSocket provider for bidirectional communication.
- **Polling interval** -- adjustable via the admin notification component's refresh timer.

## Email Integration

The notification system focuses on in-app notifications. Outbound email notifications are handled separately through the email service (Resend/Novu), but share the same trigger points. When a notification is created via `NotificationService`, the calling code can optionally trigger an email in the same operation.

## Data Payload Structure

The `data` column stores JSON strings with event-specific context:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

This flexible schema allows notification renderers to deep-link to relevant pages and display contextual information.

## Accessibility

- The bell icon badge uses `aria-label` to announce the unread count to screen readers.
- Notification items in the dropdown are focusable and keyboard-navigable.
- Type-specific icons are decorative (`aria-hidden="true"`) with text labels providing context.
- The "Mark All as Read" button provides clear feedback via toast notification.
- Timestamps use relative formatting ("2 hours ago") with full date in `title` attributes.

## Related Documentation

- [Admin Components](/docs/template/components/admin-components) -- Admin notification UI
- [Dashboard Components](/docs/template/components/dashboard-components) -- Notification stats
- [Reports and Moderation](/docs/template/features/reports-moderation) -- Report-triggered notifications
- [Voting & Comments](/docs/template/features/voting-comments) -- Comment-triggered notifications
