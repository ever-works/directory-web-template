---
id: notification-hooks
title: "Notification Hooks"
sidebar_label: "Notification Hooks"
sidebar_position: 16
---

# Notification Hooks

The template provides a comprehensive notification system through the `useAdminNotifications` hook. This hook manages in-app notification state, real-time polling, read/unread status, and notification creation -- all powered by React Query for efficient cache management.

## Source Location

```
hooks/use-admin-notifications.ts
```

## Interfaces

### Notification

The core data structure returned for each notification.

```ts
interface Notification {
  id: string;
  type: string;       // e.g. "item_submission", "comment_reported", "user_registered"
  title: string;
  message: string;
  data?: string;       // JSON-encoded extra data (itemId, commentId, userId, etc.)
  isRead: boolean;
  createdAt: string;
}
```

### NotificationStats

Computed statistics derived from the current notification set.

```ts
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;  // count per notification type
}
```

### CreateNotificationData

Shape of the payload when creating a new notification.

```ts
interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}
```

## Query Keys

The hook uses a structured query key factory for React Query cache management:

```ts
const NOTIFICATION_KEYS = {
  all: ['notifications'],
  lists: () => [...NOTIFICATION_KEYS.all, 'list'],
  list: (filters: string) => [...NOTIFICATION_KEYS.lists(), { filters }],
  details: () => [...NOTIFICATION_KEYS.all, 'detail'],
  detail: (id: string) => [...NOTIFICATION_KEYS.details(), id],
  stats: () => [...NOTIFICATION_KEYS.all, 'stats'],
};
```

This structure enables granular cache invalidation. For example, marking a notification as read invalidates the stats query while performing an optimistic update on the list query.

## useAdminNotifications

### Import

```tsx
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
```

### Return Value

```ts
const {
  // Data
  notifications,          // Notification[] - the current list
  stats,                  // NotificationStats - computed totals

  // Loading states
  isLoading,              // boolean - initial fetch in progress
  isFetching,             // boolean - any fetch (including background refetch)
  isMarkingAsRead,        // boolean - single mark-as-read in progress
  isMarkingAllAsRead,     // boolean - mark-all in progress
  isCreating,             // boolean - notification creation in progress

  // Error handling
  error,                  // string | null

  // Actions
  fetchNotifications,     // () => void - manual refetch
  markAsRead,             // (notificationId: string) => Promise<result>
  markAllAsRead,          // () => Promise<result>
  createNotification,     // (data: CreateNotificationData) => Promise<result>
  getNotificationLink,    // (notification: Notification) => string | null
  handleNotificationClick,// (notification: Notification) => Promise<void>

  // Raw mutation objects (for advanced use)
  markAsReadMutation,
  markAllAsReadMutation,
  createNotificationMutation,
} = useAdminNotifications();
```

### Polling Configuration

The hook polls for new notifications with the following React Query settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `refetchInterval` | 5 minutes | Background polling interval |
| `refetchIntervalInBackground` | `false` | No polling when tab is not focused |
| `staleTime` | 2 minutes | Data considered fresh for this duration |
| `gcTime` | 10 minutes | Cache retained after unmount |

The query is enabled only when the user session exists (`!!session?.user?.id`).

### Authentication Requirement

The hook reads the session from `useSession()` (NextAuth). All API calls are gated behind session availability -- if the user is not authenticated, the query is disabled and `createNotification` returns an early error.

## Usage Examples

### Basic Notification List

```tsx
import { useAdminNotifications } from '@/hooks/use-admin-notifications';

function NotificationPanel() {
  const {
    notifications,
    stats,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useAdminNotifications();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <header>
        <h2>Notifications ({stats.unread} unread)</h2>
        <button onClick={() => markAllAsRead()}>
          Mark All Read
        </button>
      </header>

      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={notif.isRead ? 'opacity-60' : 'font-semibold'}
          onClick={() => markAsRead(notif.id)}
        >
          <p>{notif.title}</p>
          <span>{notif.message}</span>
        </div>
      ))}
    </div>
  );
}
```

### Notification Click with Deep-Link Navigation

The `handleNotificationClick` method opens a relevant admin page and marks the notification as read in one call:

```tsx
function NotificationItem({ notification }: { notification: Notification }) {
  const { handleNotificationClick, getNotificationLink } = useAdminNotifications();

  const link = getNotificationLink(notification);

  return (
    <div onClick={() => handleNotificationClick(notification)}>
      <p>{notification.title}</p>
      {link && <span className="text-xs text-blue-500">View details</span>}
    </div>
  );
}
```

The deep-link routing maps notification types to admin URLs:

| Notification Type | Generated Link |
|-------------------|----------------|
| `item_submission` | `/admin/items/{itemId}` |
| `comment_reported` | `/admin/comments/{commentId}` |
| `user_registered` | `/admin/users/{userId}` |

### Creating a Notification Programmatically

```tsx
const { createNotification } = useAdminNotifications();

async function notifyOnSubmission(itemId: string, itemName: string) {
  const result = await createNotification({
    type: 'item_submission',
    title: 'New Item Submitted',
    message: `"${itemName}" has been submitted for review.`,
    data: { itemId },
  });

  if (result.success) {
    console.log('Notification created:', result.notification);
  }
}
```

### Notification Badge Count

```tsx
function NotificationBadge() {
  const { stats, isFetching } = useAdminNotifications();

  if (stats.unread === 0) return null;

  return (
    <span className="badge">
      {stats.unread}
      {isFetching && <span className="animate-pulse ml-1">...</span>}
    </span>
  );
}
```

## Optimistic Updates

The hook implements optimistic cache updates for both `markAsRead` and `markAllAsRead` mutations:

**Single mark as read** -- updates the specific notification in the cache and decrements `unreadCount`:

```ts
queryClient.setQueryData(NOTIFICATION_KEYS.lists(), (oldData) => ({
  ...oldData,
  notifications: oldData.notifications.map((notif) =>
    notif.id === notificationId ? { ...notif, isRead: true } : notif
  ),
  unreadCount: Math.max(0, oldData.unreadCount - 1),
}));
```

**Mark all as read** -- sets every notification to `isRead: true` and resets `unreadCount` to 0:

```ts
queryClient.setQueryData(NOTIFICATION_KEYS.lists(), (oldData) => ({
  ...oldData,
  notifications: oldData.notifications.map((notif) => ({
    ...notif,
    isRead: true,
  })),
  unreadCount: 0,
}));
```

Both mutations also invalidate the `stats` query key to ensure consistency.

## API Endpoints

The hook communicates with the following API routes:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/notifications` | Fetch all notifications with unread count |
| PATCH | `/api/admin/notifications/{id}/read` | Mark a single notification as read |
| PATCH | `/api/admin/notifications/mark-all-read` | Mark all notifications as read |
| POST | `/api/admin/notifications` | Create a new notification |

All API calls use the `serverClient` utility from `@/lib/api/server-api-client`, which provides consistent error handling through `apiUtils.isSuccess()` and `apiUtils.getErrorMessage()`.

## Error Handling

Every action method (`markAsRead`, `markAllAsRead`, `createNotification`) is wrapped in try/catch and returns a result object:

```ts
// Success
{ success: true, notification: Notification }

// Failure
{ success: false, error: "descriptive error message" }
```

Mutation errors are also logged to `console.error` for debugging.

## Stats Computation

The `stats` object is computed from the notification list on each render:

```ts
const stats: NotificationStats = {
  total: notifications.length,
  unread: unreadCount,   // from API response
  byType: notifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
};
```

This provides a breakdown like `{ item_submission: 5, user_registered: 3 }` without requiring an extra API call.
