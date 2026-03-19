---
id: use-admin-notifications-reference
title: useAdminNotifications Hook Reference
sidebar_label: useAdminNotifications
sidebar_position: 59
---

# useAdminNotifications

## Overview

`useAdminNotifications` is a React hook for managing admin notifications. It provides notification fetching, read status management (single and bulk), notification creation, computed statistics, and navigation helpers for notification deep links. The hook integrates with `next-auth` to gate queries on an active session and uses optimistic cache updates for read-status mutations.

**Source:** `template/hooks/use-admin-notifications.ts`

## Signature / Parameters

```typescript
function useAdminNotifications(): UseAdminNotificationsReturn
```

This hook takes no parameters. It requires an active `next-auth` session -- the notifications query is disabled until `session.user.id` is available.

## Return Values

### Data

| Property         | Type                  | Description                                |
|-----------------|-----------------------|--------------------------------------------|
| `notifications` | `Notification[]`      | Array of notifications for the current user|
| `stats`         | `NotificationStats`   | Computed notification statistics            |

### `Notification`

```typescript
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;        // JSON-encoded string with type-specific data
  isRead: boolean;
  createdAt: string;
}
```

### `NotificationStats`

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

Stats are computed client-side from the notifications array -- `total` is the array length, `unread` comes from the API `unreadCount`, and `byType` is a count of notifications grouped by `type`.

### Loading States

| Property             | Type      | Description                                 |
|---------------------|-----------|---------------------------------------------|
| `isLoading`         | `boolean` | `true` on initial load                      |
| `isFetching`        | `boolean` | `true` during fetching including background |
| `isMarkingAsRead`   | `boolean` | `true` when mark-as-read mutation is pending|
| `isMarkingAllAsRead`| `boolean` | `true` when mark-all-as-read is pending     |
| `isCreating`        | `boolean` | `true` when create mutation is pending      |

### Error Handling

| Property | Type             | Description                   |
|---------|------------------|-------------------------------|
| `error` | `string \| null` | Error message string or null  |

### Actions

| Method                    | Signature                                                                    | Description                                        |
|--------------------------|------------------------------------------------------------------------------|----------------------------------------------------|
| `fetchNotifications`     | `() => void`                                                                 | Manually refetch the notifications list             |
| `markAsRead`             | `(notificationId: string) => Promise<{ success: boolean; ... }>`             | Mark a single notification as read                  |
| `markAllAsRead`          | `() => Promise<{ success: boolean; updatedCount?: number; ... }>`            | Mark all notifications as read                      |
| `createNotification`     | `(data: CreateNotificationData) => Promise<{ success: boolean; ... }>`       | Create a new notification                           |
| `getNotificationLink`    | `(notification: Notification) => string \| null`                             | Get the admin deep link URL for a notification      |
| `handleNotificationClick`| `(notification: Notification) => Promise<void>`                              | Open notification link and mark as read             |

### `CreateNotificationData`

```typescript
interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}
```

### Mutation States (raw access)

| Property                     | Type              | Description                                    |
|-----------------------------|-------------------|------------------------------------------------|
| `markAsReadMutation`        | `UseMutationResult`| Raw TanStack mutation for mark-as-read         |
| `markAllAsReadMutation`     | `UseMutationResult`| Raw TanStack mutation for mark-all-as-read     |
| `createNotificationMutation`| `UseMutationResult`| Raw TanStack mutation for creating notifications|

## Implementation Details

- **Session gating:** The query is enabled only when `session?.user?.id` is truthy, preventing unauthenticated API calls.
- **Polling:** Notifications refetch every 5 minutes with `refetchInterval`. Background polling is disabled (`refetchIntervalInBackground: false`).
- **Query caching:** 2-minute `staleTime`, 10-minute `gcTime`.
- **Optimistic updates:** Both `markAsRead` and `markAllAsRead` perform optimistic cache updates via `queryClient.setQueryData`, immediately updating the notification's `isRead` flag and decrementing the `unreadCount` without waiting for the server response.
- **Stats invalidation:** After read-status mutations, the `['notifications', 'stats']` query key is invalidated for consistency.
- **Deep links:** The `getNotificationLink` method parses the JSON `data` field and maps notification types to admin routes:
  - `item_submission` maps to `/admin/items/{itemId}`
  - `comment_reported` maps to `/admin/comments/{commentId}`
  - `user_registered` maps to `/admin/users/{userId}`
- **Click handling:** `handleNotificationClick` opens the deep link in a new tab (`window.open`) and marks the notification as read if it was unread.
- **User ID injection:** The `createNotification` action automatically injects `session.user.id` as the `userId` field before calling the API.

### Query Keys

```typescript
const NOTIFICATION_KEYS = {
  all: ['notifications'],
  lists: () => ['notifications', 'list'],
  list: (filters) => ['notifications', 'list', { filters }],
  details: () => ['notifications', 'detail'],
  detail: (id) => ['notifications', 'detail', id],
  stats: () => ['notifications', 'stats'],
};
```

## Usage Examples

### Notification bell in the header

```tsx
import { useAdminNotifications } from '@/hooks/use-admin-notifications';

function NotificationBell() {
  const {
    notifications,
    stats,
    isLoading,
    markAllAsRead,
    isMarkingAllAsRead,
    handleNotificationClick,
  } = useAdminNotifications();

  return (
    <Popover>
      <PopoverTrigger>
        <Bell />
        {stats.unread > 0 && <Badge count={stats.unread} />}
      </PopoverTrigger>

      <PopoverContent>
        <div className="flex justify-between">
          <h3>Notifications</h3>
          {stats.unread > 0 && (
            <Button
              onClick={markAllAsRead}
              disabled={isMarkingAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            onClick={() => handleNotificationClick(notif)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

### Creating a notification

```tsx
const { createNotification, isCreating } = useAdminNotifications();

const notifyNewSubmission = async (itemId: string, itemName: string) => {
  const result = await createNotification({
    type: 'item_submission',
    title: 'New Item Submitted',
    message: `${itemName} has been submitted for review.`,
    data: { itemId },
  });

  if (result.success) {
    console.log('Notification created');
  }
};
```

### Marking a single notification as read

```tsx
const { markAsRead, isMarkingAsRead } = useAdminNotifications();

const handleRead = async (notificationId: string) => {
  const result = await markAsRead(notificationId);
  // Cache is optimistically updated -- UI reflects immediately
};
```

### Getting notification links

```tsx
const { getNotificationLink } = useAdminNotifications();

function NotificationItem({ notification }: { notification: Notification }) {
  const link = getNotificationLink(notification);

  return (
    <div className={notification.isRead ? 'opacity-60' : ''}>
      <p>{notification.title}</p>
      <p>{notification.message}</p>
      {link && <a href={link} target="_blank">View details</a>}
    </div>
  );
}
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Item management; item submissions trigger notifications.
- [`useAdminReports`](./use-admin-reports-reference.md) -- Report management; reported content can trigger notifications.
- [`useAdminUsers`](./use-admin-users-reference.md) -- User management; user registration triggers notifications.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics including recent activity.
