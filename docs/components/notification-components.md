---
id: notification-components
title: "Notification Components"
sidebar_label: "Notification Components"
sidebar_position: 14
---

# Notification Components

The template provides a comprehensive notification system covering server-side notification creation and management, client-side toast messages, and admin notification API endpoints. The system is built across `lib/services/notification.service.ts`, `components/ui/toast.tsx`, `hooks/use-toast.ts`, and `app/api/admin/notifications/`.

## Architecture Overview

```
lib/services/notification.service.ts   # Server-side notification CRUD
lib/db/schema.ts                       # Notification database schema
app/api/admin/notifications/
  route.ts                             # GET (list) and POST (create) endpoints
  mark-all-read/route.ts               # Mark all as read endpoint
  [id]/read/route.ts                   # Mark single as read endpoint
components/ui/toast.tsx                # Toast UI components (variants, layout)
components/ui/toaster.tsx              # Toaster container that renders active toasts
hooks/use-toast.ts                     # Toast state management hook
```

## NotificationService

The `NotificationService` class at `lib/services/notification.service.ts` handles all server-side notification operations. It uses Drizzle ORM for database access.

### Creating Notifications

The base `create` method accepts typed notification data:

```ts
interface CreateNotificationData {
  userId: string;
  type: "item_submission" | "comment_reported" | "item_reported"
      | "user_registered" | "payment_failed" | "system_alert";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
```

### Convenience Methods

The service provides typed factory methods for common notification scenarios:

```ts
// New item submitted for review
await NotificationService.createItemSubmissionNotification(
  adminUserId, itemId, itemName, submittedBy
);

// Comment reported by a user
await NotificationService.createCommentReportedNotification(
  adminUserId, commentId, commentContent, reportedBy
);

// Item reported with reason
await NotificationService.createItemReportedNotification(
  adminUserId, reportId, itemId, itemName, reportedBy, reason
);

// New user registered
await NotificationService.createUserRegisteredNotification(
  adminUserId, userId, userEmail
);

// Payment failure alert
await NotificationService.createPaymentFailedNotification(
  adminUserId, userId, userEmail, amount, reason
);

// Custom system alert
await NotificationService.createSystemAlertNotification(
  adminUserId, title, message, { customKey: 'value' }
);
```

Each method includes an `actionUrl` in the notification data, pointing to the relevant admin page (e.g., `/admin/items/[id]`, `/admin/reports`).

### Reading and Managing

```ts
// Get statistics for a user
const stats: NotificationStats = await NotificationService.getNotificationStats(userId);
// Returns: { total: number, unread: number, byType: Record<string, number> }

// Mark a single notification as read
await NotificationService.markAsRead(notificationId, userId);

// Mark all notifications as read
await NotificationService.markAllAsRead(userId);

// Clean up old read notifications (default: 90 days)
await NotificationService.cleanupOldNotifications(90);
```

### Notification Types

| Type | Trigger | Action URL |
|------|---------|------------|
| `item_submission` | New item submitted for review | `/admin/items/[id]` |
| `comment_reported` | User reports a comment | `/admin/comments/[id]` |
| `item_reported` | User reports an item | `/admin/reports` |
| `user_registered` | New user signs up | `/admin/users/[id]` |
| `payment_failed` | Payment processing failure | `/admin/users/[id]` |
| `system_alert` | Custom system alert | Custom or none |

## Admin Notification API

### GET `/api/admin/notifications`

Retrieves the latest 50 notifications for the authenticated admin user, ordered by creation date (newest first). Also returns the count of unread notifications.

**Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "userId": "user_456",
        "type": "item_submission",
        "title": "New Item Submission",
        "message": "A new item has been submitted...",
        "data": "{\"itemId\": \"item_789\", \"actionUrl\": \"/admin/items/item_789\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

### POST `/api/admin/notifications`

Creates a new notification for a specific user. Requires authentication.

**Request body:**

```json
{
  "type": "item_submission",
  "title": "New Item Submission",
  "message": "A new item has been submitted for review.",
  "userId": "user_456",
  "data": { "itemId": "item_789" }
}
```

Required fields: `type`, `title`, `message`, `userId`.

## Toast System

The toast system provides client-side ephemeral notifications using a custom implementation.

### Toast Components

Located in `components/ui/toast.tsx`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

#### Available Components

| Component | Purpose |
|-----------|---------|
| `ToastProvider` | Wrapper container for toasts |
| `ToastViewport` | Fixed-position container (bottom-right on desktop, top on mobile) |
| `Toast` | Individual toast with `role="status"` and `aria-live="polite"` |
| `ToastTitle` | Bold title text |
| `ToastDescription` | Body text |
| `ToastAction` | Action button within the toast |
| `ToastClose` | Close button (X icon, visible on hover) |

#### Variants

- **`default`** -- standard styling with background and foreground colors
- **`destructive`** -- red/error styling for error notifications

### Toaster Container

The `Toaster` component at `components/ui/toaster.tsx` renders all active toasts:

```tsx
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} title={title} description={description} action={action} {...props}>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
```

Add `<Toaster />` to your root layout to enable toast notifications globally.

### useToast Hook

The `useToast` hook at `hooks/use-toast.ts` manages toast state using a reducer pattern with external listeners (no React context required):

```ts
import { useToast, toast } from '@/hooks/use-toast';

// Inside a component
const { toasts, toast, dismiss } = useToast();

// Show a toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
});

// Show a destructive toast
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong.",
});

// Programmatic dismiss
const { id, dismiss } = toast({ title: "Processing..." });
// Later:
dismiss();
```

#### Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `TOAST_LIMIT` | `1` | Maximum concurrent toasts displayed |
| `TOAST_REMOVE_DELAY` | `1000000` | Delay before removing dismissed toasts (ms) |

### Toast Actions

The reducer supports four action types:

| Action | Effect |
|--------|--------|
| `ADD_TOAST` | Adds a toast (respects `TOAST_LIMIT`) |
| `UPDATE_TOAST` | Updates an existing toast by ID |
| `DISMISS_TOAST` | Marks toast as closed, queues removal |
| `REMOVE_TOAST` | Removes toast from state entirely |

## Integrating Notifications with Toasts

A common pattern is combining server notifications with client toasts:

```ts
// In a Server Action or API route handler
const result = await NotificationService.createItemSubmissionNotification(
  adminId, itemId, itemName, session.user.name
);

// In the client component after the action completes
if (result.success) {
  toast({ title: "Submitted", description: "Your item is under review." });
} else {
  toast({ variant: "destructive", title: "Error", description: result.error });
}
```

## Accessibility

The toast system follows WAI-ARIA patterns:

- Each toast has `role="status"` and `aria-live="polite"` for screen reader announcements
- The close button is focusable and accessible
- The destructive variant uses semantic styling for error communication
- Viewport positioning ensures toasts do not obscure page content

## Related Files

| Path | Description |
|------|-------------|
| `lib/services/notification.service.ts` | Server-side notification service |
| `lib/db/schema.ts` | Database schema including notifications table |
| `app/api/admin/notifications/route.ts` | GET/POST API endpoints |
| `app/api/admin/notifications/mark-all-read/route.ts` | Mark all read endpoint |
| `app/api/admin/notifications/[id]/read/route.ts` | Mark single read endpoint |
| `components/ui/toast.tsx` | Toast UI components and variants |
| `components/ui/toaster.tsx` | Toaster container component |
| `hooks/use-toast.ts` | Toast state management hook |
