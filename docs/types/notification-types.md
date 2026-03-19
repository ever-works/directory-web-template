---
id: notification-types
title: Notification Type Definitions
sidebar_label: Notification Types
sidebar_position: 14
---

# Notification Type Definitions

**Source:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Notifications in the template are primarily email-based, triggered by system events such as payment completions, subscription changes, and submission reviews.

## Interfaces

### `EmailNotificationData`

The core payload for sending admin notification emails.

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `to` | Yes | Recipient email address |
| `title` | Yes | Subject line and internal heading |
| `message` | Yes | Main notification body |
| `actionUrl` | No | Link for the call-to-action button |
| `actionText` | No | Label text for the CTA button |
| `notificationType` | Yes | Used to select the email template variant |
| `timestamp` | Yes | When the triggering event occurred |

### `WebhookEventType`

Events received from payment provider webhooks that trigger notifications.

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

Standardised result from processing a webhook event.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Notification Categories

The template triggers notifications for these event categories:

| Category | Trigger Events |
|----------|---------------|
| **Payment** | `payment_succeeded`, `payment_failed`, `refund_succeeded` |
| **Subscription** | `subscription_created`, `subscription_cancelled`, `subscription_trial_ending` |
| **Invoice** | `invoice_paid`, `invoice_payment_failed` |
| **Submission** | Item approved, item rejected, new submission received |
| **Account** | Password changed, email verified |

## Email Service Integration

Notifications are sent via the `EmailNotificationService` class:

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

The service checks email provider availability before sending and returns a `skipped` result if no provider is configured, preventing runtime errors in environments without email setup.

## Email Provider Configuration

Notification delivery depends on the email configuration in `lib/config/schemas/email.schema.ts`:

| Provider | Required Env Var | Auto-enabled |
|----------|-----------------|--------------|
| Resend | `RESEND_API_KEY` | When key is present |
| Novu | `NOVU_API_KEY` | When key is present |
| SMTP | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | When all three are present |

## Usage Example

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Related Types

- [Payment Types](./payment-types.md) -- `WebhookEventType` and payment enums
- [Subscription Types](./subscription-types.md) -- subscription lifecycle events
- [Config Types](./config-types.md) -- `EmailConfig` for provider settings
