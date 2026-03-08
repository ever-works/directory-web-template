---
id: how-to-add-notifications
title: "How to Add Notifications"
sidebar_label: "Add Notifications"
sidebar_position: 74
---

# How to Add Notifications

This guide covers adding new notification types to the template. The notification system supports both in-app notifications (stored in the database and displayed in the admin dashboard) and email notifications (sent via Resend or Novu).

## Prerequisites

- Database set up with the `notifications` table (included in the default schema)
- Email provider configured (optional, for email notifications)
- Understanding of the `NotificationService` and `EmailNotificationService`

---

## Architecture Overview

The notification system has two layers:

```
Trigger (webhook, cron, user action)
    |
    +-- NotificationService           (in-app, stored in DB)
    |   lib/services/notification.service.ts
    |
    +-- EmailNotificationService      (email delivery)
        lib/services/email-notification.service.ts
        lib/mail/templates/           (React email templates)
```

### In-App Notifications

Stored in the `notifications` table and displayed in the admin dashboard. The existing notification types are:

| Type | Trigger |
|------|---------|
| `item_submission` | A user submits a new item for review |
| `comment_reported` | A comment is reported by a user |
| `item_reported` | An item is reported for policy violation |
| `user_registered` | A new user registers |
| `payment_failed` | A subscription payment fails |
| `system_alert` | System-level alerts (errors, maintenance) |

### Email Notifications

Sent via the configured email provider (Resend by default) using HTML templates defined in `lib/mail/templates/`.

---

## Step 1: Add a New Notification Type

### Update the Type Union

In `lib/services/notification.service.ts`, add your new type to the `CreateNotificationData` interface:

```typescript
export interface CreateNotificationData {
  userId: string;
  type:
    | "item_submission"
    | "comment_reported"
    | "item_reported"
    | "user_registered"
    | "payment_failed"
    | "system_alert"
    | "subscription_expiring";   // <-- Add your new type
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
```

### Create a Convenience Method

Add a static method to `NotificationService` for the new type. This keeps the creation logic consistent and provides a clean API:

```typescript
// lib/services/notification.service.ts

/**
 * Create notification for expiring subscription
 */
static async createSubscriptionExpiringNotification(
  adminUserId: string,
  userId: string,
  userEmail: string,
  daysRemaining: number,
  planName: string
) {
  return this.create({
    userId: adminUserId,
    type: "subscription_expiring",
    title: "Subscription Expiring Soon",
    message: `Subscription for ${userEmail} (${planName}) expires in ${daysRemaining} days.`,
    data: {
      userId,
      userEmail,
      daysRemaining,
      planName,
      actionUrl: `/admin/users/${userId}`,
    },
  });
}
```

---

## Step 2: Trigger the Notification

Call the notification service from wherever the event occurs -- a webhook handler, cron job, or API route:

```typescript
// Example: in a cron job or webhook handler
import { NotificationService } from "@/lib/services/notification.service";

// Get admin user IDs (users with admin role)
const adminUsers = await getAdminUsers();

for (const admin of adminUsers) {
  await NotificationService.createSubscriptionExpiringNotification(
    admin.id,
    expiringUser.id,
    expiringUser.email,
    7,
    "Premium Plan"
  );
}
```

---

## Step 3: Add Email Notification (Optional)

If you want to also send an email when this notification fires:

### Create an Email Template

Add a new template in `lib/mail/templates/`:

```typescript
// lib/mail/templates/subscription-expiring.tsx

interface SubscriptionExpiringEmailProps {
  customerName: string;
  planName: string;
  daysRemaining: number;
  renewUrl: string;
  companyName: string;
  supportEmail: string;
}

export function SubscriptionExpiringEmailHtml(
  props: SubscriptionExpiringEmailProps
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your subscription is expiring soon</h2>
      <p>Hi ${props.customerName},</p>
      <p>
        Your <strong>${props.planName}</strong> subscription will expire
        in <strong>${props.daysRemaining} days</strong>.
      </p>
      <p>
        <a href="${props.renewUrl}"
           style="background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Renew Now
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Questions? Contact us at ${props.supportEmail}
      </p>
      <p style="color: #9ca3af; font-size: 12px;">${props.companyName}</p>
    </div>
  `;
}
```

### Send the Email

Use the `EmailNotificationService` to deliver the email alongside the in-app notification:

```typescript
import { EmailNotificationService } from "@/lib/services/email-notification.service";

// After creating the in-app notification:
await EmailNotificationService.sendAdminNotification({
  to: adminEmail,
  title: "Subscription Expiring Soon",
  message: `Subscription for ${userEmail} expires in ${daysRemaining} days.`,
  actionUrl: `${process.env.APP_URL}/admin/users/${userId}`,
  actionText: "View User",
  notificationType: "subscription_expiring",
  timestamp: new Date().toISOString(),
});
```

---

## Step 4: Display in the Admin Dashboard

The admin dashboard automatically displays notifications from the `notifications` table via the `AdminNotifications` component (`components/admin/admin-notifications.tsx`). No changes are needed if your new type follows the standard schema.

If you want to customize how the new type renders (for example, a different icon or color), update the notification rendering logic in the admin notifications component.

---

## Notification Schema Reference

The `notifications` table schema:

```typescript
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"),              // JSON string for extra metadata
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

The `data` field stores arbitrary JSON (serialized as a string) for linking to related entities, action URLs, and additional context.

---

## Managing Notifications

The `NotificationService` provides methods for the full notification lifecycle:

| Method | Description |
|--------|-------------|
| `create(data)` | Create a new notification |
| `markAsRead(id, userId)` | Mark a single notification as read |
| `markAllAsRead(userId)` | Mark all of a user's notifications as read |
| `getNotificationStats(userId)` | Get total, unread, and per-type counts |
| `cleanupOldNotifications(daysOld)` | Delete old read notifications |

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Notification type not appearing in the UI | Verify the type string matches exactly between the service and the rendering component |
| Email not sending | Check that the email provider (Resend/Novu) is configured with valid API keys |
| Too many notifications overwhelming admins | Use batching or summary notifications for high-frequency events |
| Forgetting to stringify `data` | The `NotificationService.create()` method handles `JSON.stringify` internally |
| Not cleaning up old notifications | Set up the cleanup cron job (see [How to Add a Cron Job](/docs/guides/how-to-add-a-cron-job)) |

---

## Related Pages

- [Email Templates](/docs/guides/email-templates) -- creating and customizing email templates
- [How to Add a Service](/docs/guides/how-to-add-a-service) -- service architecture patterns
- [How to Add a Webhook](/docs/guides/how-to-add-a-webhook) -- triggering notifications from webhook events
- [How to Add a Cron Job](/docs/guides/how-to-add-a-cron-job) -- scheduling periodic notification cleanups
- [Admin Dashboard](/docs/guides/admin-dashboard) -- where in-app notifications are displayed
