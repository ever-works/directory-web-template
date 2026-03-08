---
id: notifications
title: Notification System
sidebar_label: Notifications
sidebar_position: 3
---

# Notification System

The Ever Works template provides both in-app notifications (stored in the database) and email notifications (via Resend or Novu). Notifications are triggered by system events such as item submissions, content reports, and payment failures.

## In-App Notifications

### NotificationService

Located at `lib/services/notification.service.ts`, the service manages database-backed notifications:

```typescript
class NotificationService {
  // Create a generic notification
  static async create(data: CreateNotificationData);

  // Convenience methods for specific events
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

### Notification Types

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Notification Data Structure

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Notification Stats

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Admin Hook

```typescript
import { useAdminNotifications } from '@/hooks/use-admin-notifications';

const {
  notifications,     // Notification[]
  stats,             // NotificationStats
  isLoading,
  markAsRead,        // (id: string) => Promise<boolean>
  markAllAsRead,     // () => Promise<boolean>
  deleteNotification,// (id: string) => Promise<boolean>
  refetch,
} = useAdminNotifications();
```

## Email Notifications

### EmailNotificationService

Located at `lib/services/email-notification.service.ts`, this service handles transactional email delivery:

```typescript
class EmailNotificationService {
  // Send notification emails for various events
  static async sendItemSubmissionEmail(adminEmail, itemData);
  static async sendPaymentSuccessEmail(userEmail, paymentData);
  static async sendPaymentFailedEmail(userEmail, paymentData);
  static async sendSubscriptionCancelledEmail(userEmail, subscriptionData);
  static async sendTrialEndingEmail(userEmail, trialData);
  static async sendWelcomeEmail(userEmail, userData);
}
```

### Email Provider Configuration

The template supports two email providers:

**Resend** (default):
```bash
RESEND_API_KEY=re_xxx
```

**Novu**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

Provider selection is configured in the site config:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Payment Email Service

The payment subsystem has its own email service (`lib/payment/services/payment-email.service.ts`) with helpers for formatting payment data:

```typescript
import {
  paymentEmailService,
  extractCustomerInfo,    // Extract customer data from webhook event
  formatAmount,           // Format currency amounts
  formatPaymentMethod,    // Format card details
  formatBillingDate,      // Format billing period dates
  getPlanName,            // Map plan ID to display name
  getBillingPeriod,       // Format billing interval
} from '@/lib/payment/services/payment-email.service';
```

## Notification Preferences

Users can manage their notification preferences through the settings interface. The preferences control which notification types trigger email delivery while in-app notifications are always created.

## Event Flow

```
User Action (e.g., submit item)
       │
       ▼
API Route Handler
       │
       ├──▶ NotificationService.create()        → Database (in-app)
       │
       └──▶ EmailNotificationService.send()     → Resend/Novu (email)
```

## Related Documentation

- [Reports & Content Moderation](./reports-moderation.md) -- Notifications triggered by reports
- [Payment Webhooks](../payment/webhooks.md) -- Payment-related email notifications
