---
id: notification-service
title: Notification Service
sidebar_label: Notification Service
sidebar_position: 10
---

# Notification Service

The template provides a dual-channel notification system with in-app notifications stored in the database and email notifications sent via configurable providers. Both channels share a common set of notification types but operate independently.

## Architecture

```
lib/services/
  notification.service.ts          # In-app notifications (database-backed)
  email-notification.service.ts    # Email notifications (Resend/Novu)
```

## In-App Notifications

The `NotificationService` manages database-backed notifications using Drizzle ORM. All methods are static.

### Notification Types

| Type | Description | Typical Recipient |
|------|-------------|-------------------|
| `item_submission` | New item submitted for review | Admin |
| `comment_reported` | Comment flagged by user | Admin |
| `item_reported` | Item flagged by user | Admin |
| `user_registered` | New user account created | Admin |
| `payment_failed` | Payment processing failure | Admin |
| `system_alert` | System-level alerts | Admin |

### Creating Notifications

```typescript
import { NotificationService } from '@/lib/services/notification.service';

// Generic creation
await NotificationService.create({
  userId: 'admin-user-id',
  type: 'system_alert',
  title: 'Database Backup Complete',
  message: 'The nightly backup completed successfully.',
  data: { backupSize: '2.4 GB', duration: '45s' },
});
```

### Convenience Methods

Each notification type has a dedicated factory method that constructs the title, message, and data payload:

```typescript
// Item submission
await NotificationService.createItemSubmissionNotification(
  adminUserId, itemId, itemName, submittedBy
);

// Comment reported
await NotificationService.createCommentReportedNotification(
  adminUserId, commentId, commentContent, reportedBy
);

// Item reported
await NotificationService.createItemReportedNotification(
  adminUserId, reportId, itemId, itemName, reportedBy, reason
);

// User registered
await NotificationService.createUserRegisteredNotification(
  adminUserId, userId, userEmail
);

// Payment failed
await NotificationService.createPaymentFailedNotification(
  adminUserId, userId, userEmail, amount, reason
);

// System alert
await NotificationService.createSystemAlertNotification(
  adminUserId, title, message, optionalData
);
```

Each convenience method includes an `actionUrl` in the data payload pointing to the relevant admin page (e.g., `/admin/items/{id}`, `/admin/reports`).

### Reading Notifications

```typescript
// Get notification statistics
const stats = await NotificationService.getNotificationStats('user-id');
// { total: 25, unread: 3, byType: { item_submission: 10, system_alert: 15 } }

// Mark single notification as read
await NotificationService.markAsRead('notification-id', 'user-id');

// Mark all notifications as read
await NotificationService.markAllAsRead('user-id');
```

### Cleanup

Old read notifications can be purged:

```typescript
const result = await NotificationService.cleanupOldNotifications(90); // days
// { success: true, deletedCount: 42 }
```

This deletes notifications that are marked as read and older than the specified age.

## Email Notifications

The `EmailNotificationService` sends transactional emails via the configured email provider (Resend or Novu). All methods are static and create an `EmailService` instance internally using the application configuration.

### Configuration

Email configuration is pulled from the `ConfigService`:

| Source | Fields |
|--------|--------|
| `emailConfig.EMAIL_PROVIDER` | Provider name (`resend` or `novu`) |
| `emailConfig.EMAIL_FROM` | Default sender address |
| `emailConfig.resend.apiKey` | Resend API key |
| `emailConfig.novu.apiKey` | Novu API key |
| `coreConfig.APP_URL` | Application URL for links |

If the email service is not configured, all methods return `{ success: false, skipped: true }` instead of throwing errors.

### Admin Notification Emails

All admin notification emails use the `AdminNotificationEmailHtml` template:

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';

// Item submission notification
await EmailNotificationService.sendItemSubmissionEmail(
  adminEmail, itemName, submittedBy, actionUrl
);

// Comment reported
await EmailNotificationService.sendCommentReportedEmail(
  adminEmail, commentContent, reportedBy, actionUrl
);

// User registered
await EmailNotificationService.sendUserRegisteredEmail(
  adminEmail, userEmail, actionUrl
);

// Payment failed
await EmailNotificationService.sendPaymentFailedEmail(
  adminEmail, userEmail, amount, reason, actionUrl
);

// System alert
await EmailNotificationService.sendSystemAlertEmail(
  adminEmail, title, message, actionUrl
);
```

### Bulk Admin Notifications

Send the same notification to multiple administrators:

```typescript
const result = await EmailNotificationService.sendBulkAdminNotifications(
  ['admin1@example.com', 'admin2@example.com'],
  {
    title: 'Critical Alert',
    message: 'Server load exceeded threshold',
    notificationType: 'system_alert',
    timestamp: new Date().toLocaleString(),
  }
);
// { total: 2, successful: 2, failed: 0, results: [...] }
```

Uses `Promise.allSettled()` so individual failures do not prevent other emails from being sent.

### Submission Decision Email

Notifies users when their submitted item is approved or rejected:

```typescript
await EmailNotificationService.sendSubmissionDecisionEmail(
  userEmail,
  itemName,
  'approved',    // or 'rejected'
  'Great submission!'  // review notes (optional)
);
```

Uses the `getSubmissionDecisionTemplate` for formatting. Includes domain verification error handling for Resend.

### Moderation Emails

Moderation-specific emails notify users about enforcement actions:

| Method | Purpose | Template |
|--------|---------|----------|
| `sendUserWarningEmail(email, reason, count)` | Warning notice | Inline HTML |
| `sendUserSuspensionEmail(email, reason)` | Account suspension | Inline HTML |
| `sendUserBanEmail(email, reason)` | Account ban (permanent) | Inline HTML |
| `sendContentRemovedEmail(email, type, reason)` | Content removal | Inline HTML |

Each moderation email includes the site name (from `coreConfig.SITE_NAME`), the reason for the action, and guidance on next steps or appeals.

### Error Handling

The email notification service handles several error scenarios:

| Scenario | Behavior |
|----------|----------|
| Email service not configured | Returns `{ success: false, skipped: true }` |
| Service availability error | Returns `{ success: false, skipped: true }` with error message |
| Domain not verified (Resend) | Returns specific error with fix instructions |
| Provider error | Returns `{ success: false, error: message }` |
| Unknown error | Logs error and returns generic failure |

## Source Files

| File | Path |
|------|------|
| Notification Service | `template/lib/services/notification.service.ts` |
| Email Notification Service | `template/lib/services/email-notification.service.ts` |
| Admin Notification Template | `template/lib/mail/templates/admin-notification.ts` |
| Submission Decision Template | `template/lib/mail/templates/submission-decision.ts` |
